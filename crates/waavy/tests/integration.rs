//! End-to-end: this crate against the real compiled `waavy` binary serving the
//! `packages/waavy/fixtures/basic` release.
//!
//! Requires `WAAVY_BIN` (compiled binary) and `WAAVY_RELEASE` (built fixture
//! release); `scripts/waavy-rs-prepare.sh` produces both and prints the
//! exports. Without them every test skips with a message.
//!
//! Truncated streams cannot be produced by the fixture (React reports
//! post-shell errors as recoverable); they are covered by `client_mock.rs`
//! and by the TypeScript transport tests.

use std::path::{Path, PathBuf};
use std::process::Stdio;
use std::time::{Duration, Instant};

use serde_json::json;
use tokio::process::{Child, Command};
use waavy::{Client, Error, ErrorCode, RenderRequest};

/// Paths from the environment, or `None` (test skipped).
fn environment() -> Option<(PathBuf, PathBuf)> {
    match (std::env::var_os("WAAVY_BIN"), std::env::var_os("WAAVY_RELEASE")) {
        (Some(bin), Some(release)) => Some((bin.into(), release.into())),
        _ => {
            eprintln!("skipping: set WAAVY_BIN and WAAVY_RELEASE (see scripts/waavy-rs-prepare.sh)");
            None
        }
    }
}

/// A `waavy serve --socket` child process, killed on drop.
struct Server {
    _child: Child,
    _dir: TempDir,
    client: Client,
}

impl Server {
    async fn start(bin: &Path, release: &Path) -> Self {
        let dir = TempDir::new();
        let socket = dir.path().join("waavy.sock");
        let child = Command::new(bin)
            .args(["serve", "--log-level", "error", "--release"])
            .arg(release)
            .arg("--socket")
            .arg(&socket)
            .stdout(Stdio::null())
            .stderr(Stdio::inherit())
            .kill_on_drop(true)
            .spawn()
            .expect("spawn waavy serve");

        let client = Client::unix(&socket).with_timeout(Duration::from_secs(10));
        let deadline = Instant::now() + Duration::from_secs(15);
        loop {
            match client.health().await {
                Ok(health) if health.ok => break,
                _ if Instant::now() < deadline => tokio::time::sleep(Duration::from_millis(50)).await,
                other => panic!("waavy serve did not become healthy: {other:?}"),
            }
        }
        Self { _child: child, _dir: dir, client }
    }
}

/// Minimal temporary directory (avoids a dev-dependency for one use).
struct TempDir(PathBuf);

impl TempDir {
    fn new() -> Self {
        let path = std::env::temp_dir().join(format!("waavy-rs-{}-{}", std::process::id(), unique()));
        std::fs::create_dir_all(&path).unwrap();
        Self(path)
    }
    fn path(&self) -> &Path {
        &self.0
    }
}

impl Drop for TempDir {
    fn drop(&mut self) {
        let _ = std::fs::remove_dir_all(&self.0);
    }
}

fn unique() -> u128 {
    std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap().as_nanos()
}

fn counter(initial: u32) -> RenderRequest {
    RenderRequest::new("counter").props(json!({ "label": "Clicks", "initial": initial })).title("Counter")
}

#[tokio::test]
async fn renders_buffered_and_streamed_documents() {
    let Some((bin, release)) = environment() else { return };
    let server = Server::start(&bin, &release).await;

    let page = server.client.render(&counter(3)).await.unwrap();
    assert!(page.html.starts_with("<!doctype html>"));
    assert!(page.html.contains(r#"<span id="count">3</span>"#));
    assert!(page.html.ends_with("</body></html>"));
    assert_eq!(page.recoverable_errors, 0);
    let build_id = page.build_id.clone().expect("build id header");

    let stream = server.client.render_stream(&counter(3)).await.unwrap();
    assert_eq!(stream.build_id(), Some(build_id.as_str()));
    assert_eq!(stream.into_string().await.unwrap(), page.html);

    assert_eq!(server.client.health().await.unwrap().build_id, build_id);
}

#[tokio::test]
async fn reports_recoverable_errors_and_deadlines_without_failing() {
    let Some((bin, release)) = environment() else { return };
    let server = Server::start(&bin, &release).await;

    assert_eq!(server.client.render(&RenderRequest::new("boundary")).await.unwrap().recoverable_errors, 1);
    let slow = RenderRequest::new("slow").timeout(Duration::from_millis(50));
    assert_eq!(server.client.render(&slow).await.unwrap().recoverable_errors, 1);
}

#[tokio::test]
async fn maps_failures_to_error_codes() {
    let Some((bin, release)) = environment() else { return };
    let server = Server::start(&bin, &release).await;

    let cases = [
        (RenderRequest::new("broken"), ErrorCode::RenderFailed),
        (RenderRequest::new("missing"), ErrorCode::PageNotFound),
        (RenderRequest::new("counter").props(json!([1, 2])), ErrorCode::InvalidRequest),
    ];
    for (request, expected) in cases {
        let buffered = server.client.render(&request).await.unwrap_err();
        assert_eq!(buffered.code(), Some(&expected), "{buffered:?}");
        let streamed = server.client.render_stream(&request).await.unwrap_err();
        assert_eq!(streamed.code(), Some(&expected), "{streamed:?}");
        assert!(!buffered.is_retryable());
    }
}

#[tokio::test]
async fn a_stopped_server_is_a_retryable_connect_error() {
    let Some((bin, release)) = environment() else { return };
    let server = Server::start(&bin, &release).await;
    let client = server.client.clone();
    drop(server); // kills the process and removes the socket directory
    tokio::time::sleep(Duration::from_millis(100)).await;
    let error = client.render(&counter(1)).await.unwrap_err();
    assert!(matches!(error, Error::Connect(_)), "{error:?}");
    assert!(error.is_retryable());
}

#[cfg(feature = "oneshot")]
#[tokio::test]
async fn oneshot_matches_the_server() {
    let Some((bin, release)) = environment() else { return };
    let server = Server::start(&bin, &release).await;

    let served = server.client.render(&counter(5)).await.unwrap();
    let oneshot = waavy::oneshot::render(&bin, &release, &counter(5)).await.unwrap();
    assert_eq!(oneshot.html, served.html);
    assert_eq!(oneshot.build_id, None);

    let error = waavy::oneshot::render(&bin, &release, &RenderRequest::new("broken")).await.unwrap_err();
    assert_eq!(error.code(), Some(&ErrorCode::RenderFailed));
    assert_eq!(
        waavy::oneshot::render(&bin, &release, &RenderRequest::new("boundary")).await.unwrap().recoverable_errors,
        1
    );
}

/// The real waavy HTTP transport destroying a stream mid-response must reach
/// hyper as an interrupted document (spike P2-S1, end to end). Needs `bun`.
#[tokio::test]
async fn a_real_late_stream_failure_is_interrupted() {
    let script =
        PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../../packages/waavy/test/support/late-fail-server.ts");
    let dir = TempDir::new();
    let socket = dir.path().join("late.sock");
    let Ok(_child) = Command::new("bun")
        .arg(&script)
        .arg(&socket)
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .kill_on_drop(true)
        .spawn()
    else {
        eprintln!("skipping: `bun` is not on PATH");
        return;
    };

    let client = Client::unix(&socket).with_timeout(Duration::from_secs(10));
    let deadline = Instant::now() + Duration::from_secs(15);
    while client.health().await.is_err() {
        assert!(Instant::now() < deadline, "late-fail server did not start");
        tokio::time::sleep(Duration::from_millis(50)).await;
    }

    let stream = client.render_stream(&RenderRequest::new("late-fail")).await.unwrap();
    assert_eq!(stream.build_id(), Some("late-fail"));
    let result = stream.into_string().await;
    assert!(matches!(result, Err(Error::Interrupted(_))), "{result:?}");
}
