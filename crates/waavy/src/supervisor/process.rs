//! One `waavy serve` child process: starting it, forwarding its stderr,
//! waiting until it answers `/health`, and stopping it.

use std::ffi::OsString;
use std::os::unix::ffi::OsStrExt;
use std::path::{Path, PathBuf};
use std::process::{ExitStatus, Stdio};
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};

use tokio::io::{AsyncBufReadExt, BufReader};
use tokio::process::{Child, Command};
use tokio::task::JoinHandle;

use super::{Event, EventHook};
use crate::client::Client;
use crate::error::{Error, Result};
use crate::protocol::{ErrorBody, ErrorDetail};

/// Interval between `/health` probes while a renderer starts.
const HEALTH_POLL: Duration = Duration::from_millis(25);
/// Per-probe client timeout, so a wedged renderer cannot stall startup.
const HEALTH_PROBE_TIMEOUT: Duration = Duration::from_secs(1);
/// How long to wait for the stderr pump after the child exits.
const STDERR_DRAIN_TIMEOUT: Duration = Duration::from_secs(1);
/// Timeout for the "is someone already serving this socket?" probe.
const OCCUPIED_PROBE_TIMEOUT: Duration = Duration::from_millis(500);

/// Longest connectable socket path in bytes: `sizeof(sun_path)` minus the
/// terminating NUL (104 on macOS and the BSDs, 108 on Linux).
#[cfg(any(
    target_os = "macos",
    target_os = "ios",
    target_os = "freebsd",
    target_os = "openbsd",
    target_os = "netbsd",
    target_os = "dragonfly"
))]
pub(crate) const MAX_SOCKET_PATH_BYTES: usize = 103;
#[cfg(not(any(
    target_os = "macos",
    target_os = "ios",
    target_os = "freebsd",
    target_os = "openbsd",
    target_os = "netbsd",
    target_os = "dragonfly"
)))]
pub(crate) const MAX_SOCKET_PATH_BYTES: usize = 107;

/// How to start the renderer; fixed for the supervisor's lifetime.
#[derive(Debug, Clone)]
pub(crate) struct Launch {
    pub binary: PathBuf,
    pub release: PathBuf,
    pub socket: PathBuf,
    pub extra_args: Vec<OsString>,
    pub startup_timeout: Duration,
}

/// A running (or just exited) renderer process.
pub(crate) struct Renderer {
    pub child: Child,
    /// When this process was started (for the restart policy).
    pub started: Instant,
    /// Forwards stderr lines to the event hook; ends at EOF.
    stderr_pump: JoinHandle<()>,
    /// The `{"error":…}` line waavy printed, if any (startup failures).
    reported_error: Arc<Mutex<Option<ErrorDetail>>>,
}

impl Renderer {
    /// The process ID, while the process is running.
    pub fn pid(&self) -> Option<u32> {
        self.child.id()
    }

    /// The failure waavy reported on stderr before exiting, after waiting
    /// briefly for the stderr pump to read the remaining lines.
    async fn reported_error(&mut self) -> Option<ErrorDetail> {
        let _ = tokio::time::timeout(STDERR_DRAIN_TIMEOUT, &mut self.stderr_pump).await;
        self.reported_error.lock().expect("reported_error lock").take()
    }
}

/// Starts a renderer and waits until it is healthy.
///
/// On failure the process is gone: either it exited by itself (the error is
/// waavy's own report, e.g. `RELEASE_INVALID`, when it printed one) or it was
/// killed after [`Launch::startup_timeout`] ([`Error::Timeout`]).
///
/// Before spawning, fails with [`Error::Spawn`] if the socket path is too
/// long to connect to, or if another process already answers on it: its
/// `/health` would otherwise be mistaken for the new renderer's, while the
/// new renderer refuses the socket and exits.
pub(crate) async fn start(launch: &Launch, hook: &EventHook) -> Result<Renderer> {
    check_socket_path(&launch.socket)?;
    ensure_socket_free(&launch.socket).await?;
    let mut renderer = spawn(launch, hook)?;
    match wait_ready(&mut renderer, launch).await {
        Ok(()) => {
            if let Some(pid) = renderer.pid() {
                hook(&Event::Ready { pid });
            }
            Ok(renderer)
        }
        Err(error) => {
            let _ = renderer.child.kill().await;
            Err(error)
        }
    }
}

/// Rejects socket paths the OS cannot connect to.
pub(crate) fn check_socket_path(socket: &Path) -> Result<()> {
    let bytes = socket.as_os_str().as_bytes().len();
    if bytes > MAX_SOCKET_PATH_BYTES {
        return Err(Error::Spawn(std::io::Error::new(
            std::io::ErrorKind::InvalidInput,
            format!(
                "socket path is {bytes} bytes; this OS allows at most {MAX_SOCKET_PATH_BYTES}. \
                 Use a shorter path, such as one under /tmp: {}",
                socket.display()
            ),
        )));
    }
    Ok(())
}

/// Fails if a server already answers `/health` on the socket.
async fn ensure_socket_free(socket: &Path) -> Result<()> {
    let probe = Client::unix(socket).with_timeout(OCCUPIED_PROBE_TIMEOUT);
    let Ok(health) = probe.health().await else { return Ok(()) };
    let holder = match health.pid {
        Some(pid) => format!("waavy {} (pid {pid})", health.waavy_version),
        None => format!("waavy {}", health.waavy_version),
    };
    Err(Error::Spawn(std::io::Error::new(
        std::io::ErrorKind::AddrInUse,
        format!(
            "{} is already served by {holder}, build {}; stop that process or use another socket",
            socket.display(),
            health.build_id
        ),
    )))
}

fn spawn(launch: &Launch, hook: &EventHook) -> Result<Renderer> {
    let mut child = Command::new(&launch.binary)
        .arg("serve")
        .arg("--release")
        .arg(&launch.release)
        .arg("--socket")
        .arg(&launch.socket)
        .args(&launch.extra_args)
        .stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::piped())
        .kill_on_drop(true)
        .spawn()
        .map_err(Error::Spawn)?;

    let stderr = child.stderr.take().ok_or_else(|| Error::Protocol("stderr was not captured".into()))?;
    let reported_error = Arc::new(Mutex::new(None));
    let stderr_pump = tokio::spawn(pump_stderr(stderr, hook.clone(), reported_error.clone()));
    Ok(Renderer { child, started: Instant::now(), stderr_pump, reported_error })
}

/// Forwards every stderr line to the hook and remembers an error line.
async fn pump_stderr(
    stderr: tokio::process::ChildStderr,
    hook: EventHook,
    reported_error: Arc<Mutex<Option<ErrorDetail>>>,
) {
    let mut lines = BufReader::new(stderr).lines();
    while let Ok(Some(line)) = lines.next_line().await {
        if let Ok(body) = serde_json::from_str::<ErrorBody>(&line) {
            *reported_error.lock().expect("reported_error lock") = Some(body.error);
        }
        hook(&Event::Log(&line));
    }
}

/// Polls `/health` until it answers, the process exits, or time runs out.
async fn wait_ready(renderer: &mut Renderer, launch: &Launch) -> Result<()> {
    let client = Client::unix(&launch.socket).with_timeout(HEALTH_PROBE_TIMEOUT);
    let deadline = tokio::time::Instant::now() + launch.startup_timeout;
    loop {
        tokio::select! {
            status = renderer.child.wait() => {
                let status = status.map_err(Error::Spawn)?;
                return Err(match renderer.reported_error().await {
                    Some(detail) => detail.into(),
                    None => Error::Protocol(format!("waavy serve exited with {status} before becoming ready")),
                });
            }
            _ = tokio::time::sleep(HEALTH_POLL) => {}
        }
        if client.health().await.is_ok() {
            return Ok(());
        }
        if tokio::time::Instant::now() >= deadline {
            return Err(Error::Timeout(launch.startup_timeout));
        }
    }
}

/// Stops a renderer: SIGTERM (waavy drains in-flight requests and removes
/// its socket), then SIGKILL if it is still running after `grace`.
pub(crate) async fn terminate(renderer: &mut Renderer, grace: Duration) -> std::io::Result<ExitStatus> {
    if let Some(pid) = renderer.pid() {
        let pid = libc::pid_t::try_from(pid).map_err(|_| std::io::Error::other("pid out of range"))?;
        // SAFETY: `kill` has no memory-safety preconditions. The PID belongs to
        // our un-reaped child, so it cannot have been recycled for another process.
        unsafe { libc::kill(pid, libc::SIGTERM) };
    }
    match tokio::time::timeout(grace, renderer.child.wait()).await {
        Ok(status) => status,
        Err(_) => {
            renderer.child.kill().await?;
            renderer.child.wait().await
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn socket_path_limit_is_inclusive() {
        let at_limit = PathBuf::from(format!("/{}", "a".repeat(MAX_SOCKET_PATH_BYTES - 1)));
        assert!(check_socket_path(&at_limit).is_ok());

        let too_long = PathBuf::from(format!("/{}", "a".repeat(MAX_SOCKET_PATH_BYTES)));
        let error = check_socket_path(&too_long).unwrap_err();
        assert!(matches!(&error, Error::Spawn(io) if io.kind() == std::io::ErrorKind::InvalidInput));
        assert!(error.to_string().contains("allows at most"), "{error}");
    }
}
