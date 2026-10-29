//! Run and supervise `waavy serve` from the host process (feature
//! `supervisor`, unix only).
//!
//! A [`Supervisor`] starts the renderer on a unix socket, waits until it
//! answers `/health`, restarts it with exponential backoff if it exits
//! unexpectedly (giving up after too many restarts per minute), forwards its
//! JSON-lines stderr to a hook, and stops it gracefully on
//! [`Supervisor::shutdown`]. Dropping the supervisor kills the renderer.
//!
//! ```no_run
//! # async fn example() -> waavy::Result<()> {
//! use waavy::{RenderRequest, Supervisor};
//!
//! let supervisor = Supervisor::builder()
//!     .binary("/usr/local/bin/waavy")
//!     .release("dist/waavy")
//!     .socket("/run/waavy.sock")
//!     .spawn()
//!     .await?;
//! let page = supervisor.client().render(&RenderRequest::new("home")).await?;
//! // … serve requests …
//! supervisor.shutdown().await?;
//! # Ok(()) }
//! ```
//!
//! While a restart is in progress, renders fail with [`Error::Connect`],
//! which is retryable ([`Error::is_retryable`]).

mod policy;
mod process;

use std::ffi::OsString;
use std::path::{Path, PathBuf};
use std::process::ExitStatus;
use std::sync::atomic::{AtomicU32, Ordering};
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};

use tokio::sync::oneshot;
use tokio::task::JoinHandle;

use self::policy::{Decision, RestartPolicy, RestartSettings};
use self::process::{Launch, Renderer};
use crate::client::Client;
use crate::error::{Error, Result};

/// Default bound on startup (spawn → healthy).
const DEFAULT_STARTUP_TIMEOUT: Duration = Duration::from_secs(10);
/// Default grace period between SIGTERM and SIGKILL. Longer than waavy's own
/// default drain timeout (10 s), so a graceful shutdown is never cut short.
const DEFAULT_SHUTDOWN_GRACE: Duration = Duration::from_secs(15);
const DEFAULT_RESTART: RestartSettings = RestartSettings {
    initial_backoff: Duration::from_millis(100),
    max_backoff: Duration::from_secs(5),
    max_restarts: 10,
};

/// Something the supervisor or the renderer reported. Passed to the hook set
/// with [`SupervisorBuilder::on_event`].
#[derive(Debug)]
#[non_exhaustive]
pub enum Event<'a> {
    /// A line the renderer wrote to stderr (a JSON object: access log,
    /// lifecycle event, warning or error).
    Log(&'a str),
    /// A renderer process is up and healthy.
    Ready {
        /// Its process ID.
        pid: u32,
    },
    /// The renderer exited without being asked to.
    Exited {
        /// How it ended.
        status: ExitStatus,
    },
    /// A restart is scheduled.
    Restarting {
        /// Backoff before the new process starts.
        delay: Duration,
        /// Restarts so far, including this one.
        restarts: u32,
    },
    /// A restart attempt failed to produce a healthy renderer.
    RestartFailed {
        /// Why.
        error: &'a Error,
    },
    /// Too many restarts within a minute; the supervisor stopped trying.
    GaveUp {
        /// Restarts performed in total.
        restarts: u32,
    },
}

/// Receives [`Event`]s. Called from tokio tasks: keep it quick.
pub(crate) type EventHook = Arc<dyn Fn(&Event<'_>) + Send + Sync>;

/// Where the supervisor is in its lifecycle.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
#[non_exhaustive]
pub enum Status {
    /// A healthy renderer is running.
    Running,
    /// The renderer exited; a new one is being started.
    Restarting,
    /// Restarting was abandoned (see [`Event::GaveUp`]).
    Failed,
    /// Stopped by [`Supervisor::shutdown`] or drop.
    Stopped,
}

/// Configures and starts a [`Supervisor`]. Create with [`Supervisor::builder`].
#[must_use]
pub struct SupervisorBuilder {
    binary: Option<PathBuf>,
    release: Option<PathBuf>,
    socket: Option<PathBuf>,
    extra_args: Vec<OsString>,
    startup_timeout: Duration,
    shutdown_grace: Duration,
    restart: RestartSettings,
    hook: EventHook,
}

impl std::fmt::Debug for SupervisorBuilder {
    fn fmt(&self, formatter: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        formatter
            .debug_struct("SupervisorBuilder")
            .field("binary", &self.binary)
            .field("release", &self.release)
            .field("socket", &self.socket)
            .field("extra_args", &self.extra_args)
            .field("startup_timeout", &self.startup_timeout)
            .field("shutdown_grace", &self.shutdown_grace)
            .field("restart", &self.restart)
            .finish_non_exhaustive()
    }
}

impl SupervisorBuilder {
    /// Path of the `waavy` executable (required).
    pub fn binary(mut self, path: impl Into<PathBuf>) -> Self {
        self.binary = Some(path.into());
        self
    }

    /// Release directory produced by `waavy build` (required).
    pub fn release(mut self, dir: impl Into<PathBuf>) -> Self {
        self.release = Some(dir.into());
        self
    }

    /// Unix socket path the renderer listens on (required).
    pub fn socket(mut self, path: impl Into<PathBuf>) -> Self {
        self.socket = Some(path.into());
        self
    }

    /// An extra `waavy serve` argument, e.g. `"--log-level"`, `"warn"`.
    pub fn arg(mut self, arg: impl Into<OsString>) -> Self {
        self.extra_args.push(arg.into());
        self
    }

    /// Bound on each start (spawn → healthy). Default 10 s.
    pub fn startup_timeout(mut self, timeout: Duration) -> Self {
        self.startup_timeout = timeout;
        self
    }

    /// Time between SIGTERM and SIGKILL on shutdown. Default 15 s.
    pub fn shutdown_grace(mut self, grace: Duration) -> Self {
        self.shutdown_grace = grace;
        self
    }

    /// Backoff before restart *n* is `initial · 2ⁿ`, capped at `max`.
    /// Defaults 100 ms and 5 s. A renderer that stayed up 30 s resets it.
    pub fn restart_backoff(mut self, initial: Duration, max: Duration) -> Self {
        self.restart.initial_backoff = initial;
        self.restart.max_backoff = max;
        self
    }

    /// Restarts allowed within any 60 s window before giving up. Default 10.
    pub fn max_restarts_per_minute(mut self, restarts: u32) -> Self {
        self.restart.max_restarts = restarts;
        self
    }

    /// Receives renderer stderr lines and supervisor events. The default
    /// writes renderer lines to this process's stderr verbatim and
    /// supervisor events as JSON lines (`{"type":"supervisor",…}`).
    pub fn on_event(mut self, hook: impl Fn(&Event<'_>) + Send + Sync + 'static) -> Self {
        self.hook = Arc::new(hook);
        self
    }

    /// Starts the renderer and resolves once it is healthy.
    ///
    /// Fails with the renderer's own error when it refuses to start (e.g.
    /// [`ErrorCode::ReleaseInvalid`](crate::ErrorCode::ReleaseInvalid)),
    /// [`Error::Timeout`] when it is not healthy within the startup timeout,
    /// or [`Error::Spawn`] when the binary cannot run. No restarts are
    /// attempted for the initial start.
    pub async fn spawn(self) -> Result<Supervisor> {
        let launch = Launch {
            binary: required(self.binary, "binary")?,
            release: required(self.release, "release")?,
            socket: required(self.socket, "socket")?,
            extra_args: self.extra_args,
            startup_timeout: self.startup_timeout,
        };
        let renderer = process::start(&launch, &self.hook).await?;

        let shared = Arc::new(Shared {
            status: Mutex::new(Status::Running),
            pid: AtomicU32::new(renderer.pid().unwrap_or(0)),
            restarts: AtomicU32::new(0),
        });
        let (stop, stopped) = oneshot::channel();
        let task = tokio::spawn(
            Supervision {
                launch: launch.clone(),
                hook: self.hook,
                policy: RestartPolicy::new(self.restart),
                shutdown_grace: self.shutdown_grace,
                shared: shared.clone(),
            }
            .run(renderer, stopped),
        );
        Ok(Supervisor { socket: launch.socket, shared, stop: Some(stop), task: Some(task) })
    }
}

fn required(value: Option<PathBuf>, name: &str) -> Result<PathBuf> {
    value.ok_or_else(|| {
        Error::Spawn(std::io::Error::new(
            std::io::ErrorKind::InvalidInput,
            format!("Supervisor::builder() needs .{name}(…)"),
        ))
    })
}

/// A supervised `waavy serve` process. See the [module docs](self).
#[derive(Debug)]
pub struct Supervisor {
    socket: PathBuf,
    shared: Arc<Shared>,
    /// Sending (or dropping) stops the supervision task.
    stop: Option<oneshot::Sender<()>>,
    task: Option<JoinHandle<()>>,
}

/// State the supervision task publishes to the [`Supervisor`] handle.
#[derive(Debug)]
struct Shared {
    status: Mutex<Status>,
    /// Current renderer PID, `0` when none is running.
    pid: AtomicU32,
    restarts: AtomicU32,
}

impl Shared {
    fn set_status(&self, status: Status) {
        *self.status.lock().expect("status lock") = status;
    }
}

impl Supervisor {
    /// Starts configuring a supervisor.
    pub fn builder() -> SupervisorBuilder {
        SupervisorBuilder {
            binary: None,
            release: None,
            socket: None,
            extra_args: Vec::new(),
            startup_timeout: DEFAULT_STARTUP_TIMEOUT,
            shutdown_grace: DEFAULT_SHUTDOWN_GRACE,
            restart: DEFAULT_RESTART,
            hook: Arc::new(default_hook),
        }
    }

    /// A client for the supervised renderer. Cheap; clone freely.
    pub fn client(&self) -> Client {
        Client::unix(&self.socket)
    }

    /// The socket path the renderer listens on.
    pub fn socket(&self) -> &Path {
        &self.socket
    }

    /// Current lifecycle status.
    pub fn status(&self) -> Status {
        *self.shared.status.lock().expect("status lock")
    }

    /// PID of the running renderer, if one is running.
    pub fn pid(&self) -> Option<u32> {
        match self.shared.pid.load(Ordering::SeqCst) {
            0 => None,
            pid => Some(pid),
        }
    }

    /// Restarts performed so far.
    pub fn restarts(&self) -> u32 {
        self.shared.restarts.load(Ordering::SeqCst)
    }

    /// Stops the renderer gracefully (SIGTERM, then SIGKILL after the grace
    /// period) and waits for it to exit. The socket file is removed.
    pub async fn shutdown(mut self) -> Result<()> {
        if let Some(stop) = self.stop.take() {
            let _ = stop.send(());
        }
        if let Some(task) = self.task.take() {
            task.await.map_err(|error| Error::Protocol(format!("supervisor task failed: {error}")))?;
        }
        Ok(())
    }
}

impl Drop for Supervisor {
    /// Dropping the stop sender makes the task kill the renderer at once.
    fn drop(&mut self) {
        self.stop.take();
    }
}

/// The background task that owns the renderer process.
struct Supervision {
    launch: Launch,
    hook: EventHook,
    policy: RestartPolicy,
    shutdown_grace: Duration,
    shared: Arc<Shared>,
}

impl Supervision {
    async fn run(mut self, mut renderer: Renderer, mut stopped: oneshot::Receiver<()>) {
        loop {
            tokio::select! {
                request = &mut stopped => {
                    self.stop(&mut renderer, request.is_ok()).await;
                    return;
                }
                status = renderer.child.wait() => {
                    self.shared.pid.store(0, Ordering::SeqCst);
                    self.shared.set_status(Status::Restarting);
                    if let Ok(status) = status {
                        (self.hook)(&Event::Exited { status });
                    }
                    match self.restart(renderer.started, &mut stopped).await {
                        Some(next) => renderer = next,
                        None => return,
                    }
                }
            }
        }
    }

    /// Restarts until a renderer is healthy. `None` when the supervisor gave
    /// up or was stopped meanwhile (status already set).
    async fn restart(&mut self, mut started: Instant, stopped: &mut oneshot::Receiver<()>) -> Option<Renderer> {
        loop {
            let delay = match self.policy.on_exit(started, Instant::now()) {
                Decision::RestartAfter(delay) => delay,
                Decision::GiveUp => {
                    self.shared.set_status(Status::Failed);
                    (self.hook)(&Event::GaveUp { restarts: self.shared.restarts.load(Ordering::SeqCst) });
                    return None;
                }
            };
            let restarts = self.shared.restarts.fetch_add(1, Ordering::SeqCst) + 1;
            (self.hook)(&Event::Restarting { delay, restarts });

            tokio::select! {
                _ = &mut *stopped => {
                    self.mark_stopped();
                    return None;
                }
                _ = tokio::time::sleep(delay) => {}
            }

            started = Instant::now();
            // A stop request during startup drops the half-started renderer,
            // whose `kill_on_drop` ends the process.
            let attempt = tokio::select! {
                _ = &mut *stopped => {
                    self.mark_stopped();
                    return None;
                }
                attempt = process::start(&self.launch, &self.hook) => attempt,
            };
            match attempt {
                Ok(renderer) => {
                    self.shared.pid.store(renderer.pid().unwrap_or(0), Ordering::SeqCst);
                    self.shared.set_status(Status::Running);
                    return Some(renderer);
                }
                Err(error) => (self.hook)(&Event::RestartFailed { error: &error }),
            }
        }
    }

    /// Graceful (`shutdown`) or immediate (dropped handle) stop.
    async fn stop(&self, renderer: &mut Renderer, graceful: bool) {
        if graceful {
            let _ = process::terminate(renderer, self.shutdown_grace).await;
        } else {
            let _ = renderer.child.kill().await;
        }
        self.mark_stopped();
    }

    /// Final state after any stop. waavy removes its socket on a graceful
    /// exit; a killed renderer cannot, so the file is removed here too.
    fn mark_stopped(&self) {
        self.shared.pid.store(0, Ordering::SeqCst);
        let _ = std::fs::remove_file(&self.launch.socket);
        self.shared.set_status(Status::Stopped);
    }
}

/// Renderer lines verbatim; supervisor events as JSON lines on stderr.
fn default_hook(event: &Event<'_>) {
    let line = match event {
        Event::Log(line) => return eprintln!("{line}"),
        Event::Ready { pid } => serde_json::json!({ "type": "supervisor", "event": "ready", "pid": pid }),
        Event::Exited { status } => {
            serde_json::json!({ "type": "supervisor", "event": "exited", "status": status.to_string() })
        }
        Event::Restarting { delay, restarts } => serde_json::json!({
            "type": "supervisor", "event": "restarting",
            "delayMs": delay.as_millis(), "restarts": restarts
        }),
        Event::RestartFailed { error } => {
            serde_json::json!({ "type": "supervisor", "event": "restart_failed", "message": error.to_string() })
        }
        Event::GaveUp { restarts } => serde_json::json!({ "type": "supervisor", "event": "gave_up", "restarts": restarts }),
    };
    eprintln!("{line}");
}
