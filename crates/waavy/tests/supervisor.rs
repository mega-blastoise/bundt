//! `Supervisor` against the real compiled `waavy` binary (P3 T8): start →
//! render → external kill → restarted and healthy → shutdown removes the
//! socket; startup failures surface waavy's own error; dropping kills.
//!
//! Requires `WAAVY_BIN` and `WAAVY_RELEASE` like `integration.rs`
//! (`scripts/waavy-rs-prepare.sh`); skips without them.

#![cfg(unix)]

use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};

use serde_json::json;
use waavy::{Error, ErrorCode, Event, RenderRequest, Status, Supervisor};

fn environment() -> Option<(PathBuf, PathBuf)> {
    match (std::env::var_os("WAAVY_BIN"), std::env::var_os("WAAVY_RELEASE")) {
        (Some(bin), Some(release)) => Some((bin.into(), release.into())),
        _ => {
            eprintln!("skipping: set WAAVY_BIN and WAAVY_RELEASE (see scripts/waavy-rs-prepare.sh)");
            None
        }
    }
}

/// A unique socket path in the temp dir. Kept short: unix socket paths are
/// limited to ~104 bytes on macOS.
fn socket_path(name: &str) -> PathBuf {
    std::env::temp_dir().join(format!("wv-{}-{name}.sock", std::process::id()))
}

/// Polls `condition` for up to 15 s.
async fn eventually(what: &str, condition: impl Fn() -> bool) {
    let deadline = Instant::now() + Duration::from_secs(15);
    while !condition() {
        assert!(Instant::now() < deadline, "timed out waiting for {what}");
        tokio::time::sleep(Duration::from_millis(20)).await;
    }
}

fn process_alive(pid: u32) -> bool {
    // SAFETY: signal 0 only checks for existence.
    unsafe { libc::kill(pid as libc::pid_t, 0) == 0 }
}

fn counter() -> RenderRequest {
    RenderRequest::new("counter").props(json!({ "label": "supervised", "initial": 4 }))
}

/// Collects every event the supervisor reports, as short labels.
fn recording_hook() -> (Arc<Mutex<Vec<String>>>, impl Fn(&Event<'_>) + Send + Sync + 'static) {
    let events = Arc::new(Mutex::new(Vec::new()));
    let sink = events.clone();
    let hook = move |event: &Event<'_>| {
        let label = match event {
            Event::Log(line) if line.contains("\"listening\"") => "log:listening".to_string(),
            Event::Log(_) => return,
            Event::Ready { .. } => "ready".to_string(),
            Event::Exited { .. } => "exited".to_string(),
            Event::Restarting { restarts, .. } => format!("restarting:{restarts}"),
            other => format!("{other:?}"),
        };
        sink.lock().unwrap().push(label);
    };
    (events, hook)
}

#[tokio::test]
async fn supervises_restarts_and_shuts_down() {
    let Some((bin, release)) = environment() else { return };
    let socket = socket_path("restart");
    let (events, hook) = recording_hook();

    let supervisor = Supervisor::builder()
        .binary(&bin)
        .release(&release)
        .socket(&socket)
        .restart_backoff(Duration::from_millis(10), Duration::from_millis(100))
        .on_event(hook)
        .spawn()
        .await
        .expect("supervisor starts");
    assert_eq!(supervisor.status(), Status::Running);

    let page = supervisor.client().render(&counter()).await.expect("render");
    assert!(page.html.contains(r#"<span id="count">4</span>"#));

    // Kill the renderer behind the supervisor's back.
    let first_pid = supervisor.pid().expect("renderer pid");
    // SAFETY: plain signal delivery to our grandchild-by-supervision.
    unsafe { libc::kill(first_pid as libc::pid_t, libc::SIGKILL) };

    eventually("a restarted renderer", || {
        supervisor.restarts() == 1 && supervisor.status() == Status::Running && supervisor.pid() != Some(first_pid)
    })
    .await;
    let page = supervisor.client().render(&counter()).await.expect("render after restart");
    assert!(page.html.contains("supervised"));

    let second_pid = supervisor.pid().unwrap();
    supervisor.shutdown().await.expect("shutdown");
    assert!(!socket.exists(), "socket removed on shutdown");
    assert!(!process_alive(second_pid), "renderer stopped");

    // Log lines arrive through the stderr pump, concurrently with the health
    // probe that emits `ready`, so only their count is deterministic.
    let events = events.lock().unwrap().clone();
    let (logs, lifecycle): (Vec<_>, Vec<_>) = events.iter().partition(|event| event.starts_with("log:"));
    assert_eq!(lifecycle, ["ready", "exited", "restarting:1", "ready"]);
    assert_eq!(logs.len(), 2, "one `listening` line per renderer: {events:?}");
}

#[tokio::test]
async fn graceful_shutdown_lets_waavy_exit_cleanly() {
    let Some((bin, release)) = environment() else { return };
    let socket = socket_path("graceful");
    let lines = Arc::new(Mutex::new(Vec::<String>::new()));
    let sink = lines.clone();

    let supervisor = Supervisor::builder()
        .binary(&bin)
        .release(&release)
        .socket(&socket)
        .on_event(move |event| {
            if let Event::Log(line) = event {
                sink.lock().unwrap().push(line.to_string());
            }
        })
        .spawn()
        .await
        .expect("supervisor starts");
    supervisor.shutdown().await.expect("shutdown");

    // SIGTERM (not SIGKILL) reached waavy: it logged its own orderly stop.
    eventually("the stopped event", || lines.lock().unwrap().iter().any(|line| line.contains("\"stopped\""))).await;
}

#[tokio::test]
async fn dropping_the_supervisor_kills_the_renderer() {
    let Some((bin, release)) = environment() else { return };
    let socket = socket_path("drop");
    let supervisor = Supervisor::builder()
        .binary(&bin)
        .release(&release)
        .socket(&socket)
        .on_event(|_| {})
        .spawn()
        .await
        .expect("supervisor starts");
    let pid = supervisor.pid().unwrap();
    drop(supervisor);
    eventually("the renderer to exit", || !process_alive(pid)).await;
    eventually("the socket to be removed", || !socket.exists()).await;
}

#[tokio::test]
async fn startup_failure_reports_waavys_error() {
    let Some((bin, _)) = environment() else { return };
    let error = Supervisor::builder()
        .binary(&bin)
        .release(Path::new("/nonexistent/release"))
        .socket(socket_path("bad-release"))
        .on_event(|_| {})
        .spawn()
        .await
        .expect_err("startup must fail");
    assert_eq!(error.code(), Some(&ErrorCode::ReleaseInvalid), "{error:?}");
}

#[tokio::test]
async fn missing_binary_and_settings_are_spawn_errors() {
    let error = Supervisor::builder()
        .binary("/nonexistent/waavy")
        .release("r")
        .socket(socket_path("missing-bin"))
        .spawn()
        .await
        .expect_err("cannot spawn");
    assert!(matches!(error, Error::Spawn(_)), "{error:?}");

    let error = Supervisor::builder().release("r").socket("s").spawn().await.expect_err("binary is required");
    assert!(error.to_string().contains(".binary("), "{error}");
}
