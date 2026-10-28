//! One-shot rendering: run `waavy render --stdin` once per request.
//!
//! Simpler to deploy than a running server (no process to supervise) at the
//! cost of process startup per render (~40 ms). Use it as an explicit choice
//! — never as an automatic fallback for a failed [`Client`](crate::Client)
//! render.
//!
//! Contract (see `packages/waavy/docs/PROTOCOL.md`): stdout is the HTML
//! document, stderr is JSON lines (`{"warning":…}` / `{"error":…}`), and the
//! exit status is 0 on success.

use std::path::Path;
use std::process::Stdio;

use serde_json::Value;
use tokio::io::AsyncWriteExt;
use tokio::process::Command;

use crate::client::Rendered;
use crate::error::{Error, Result};
use crate::protocol::{ErrorBody, RenderRequest};

/// Renders `request` by running the waavy executable against `release`.
///
/// ```no_run
/// # async fn example() -> waavy::Result<()> {
/// use waavy::RenderRequest;
///
/// let page = waavy::oneshot::render("/usr/local/bin/waavy", "dist/waavy", &RenderRequest::new("home")).await?;
/// # Ok(()) }
/// ```
pub async fn render(binary: impl AsRef<Path>, release: impl AsRef<Path>, request: &RenderRequest) -> Result<Rendered> {
    let input = serde_json::to_vec(&request.with_stream(false)).map_err(|error| Error::Protocol(error.to_string()))?;

    let mut child = Command::new(binary.as_ref())
        .arg("render")
        .arg("--release")
        .arg(release.as_ref())
        .arg("--stdin")
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .kill_on_drop(true)
        .spawn()
        .map_err(Error::Spawn)?;

    // Write the request, then close stdin so waavy sees EOF. stdout/stderr are
    // drained concurrently by `wait_with_output`, so large documents cannot
    // deadlock on a full pipe.
    let mut stdin = child.stdin.take().ok_or_else(|| Error::Protocol("stdin was not captured".into()))?;
    stdin.write_all(&input).await.map_err(Error::Spawn)?;
    drop(stdin);

    let output = child.wait_with_output().await.map_err(Error::Spawn)?;
    let stderr = String::from_utf8_lossy(&output.stderr);
    let events = parse_stderr(&stderr)?;

    if output.status.success() {
        let html = String::from_utf8(output.stdout).map_err(|_| Error::Protocol("stdout is not UTF-8".into()))?;
        return Ok(Rendered { html, build_id: None, recoverable_errors: events.warnings });
    }
    match events.error {
        Some(error) => Err(error.error.into()),
        None => Err(Error::Protocol(format!("waavy exited with {} and no error line: {stderr}", output.status))),
    }
}

/// What waavy reported on stderr.
struct StderrEvents {
    warnings: u32,
    error: Option<ErrorBody>,
}

/// Parses waavy's JSON-lines stderr. Non-JSON lines violate the contract.
fn parse_stderr(stderr: &str) -> Result<StderrEvents> {
    let mut events = StderrEvents { warnings: 0, error: None };
    for line in stderr.lines().filter(|line| !line.trim().is_empty()) {
        let value: Value = serde_json::from_str(line)
            .map_err(|_| Error::Protocol(format!("non-JSON stderr line from waavy: {line}")))?;
        if value.get("warning").is_some() {
            events.warnings += 1;
        } else if value.get("error").is_some() {
            events.error = Some(
                serde_json::from_value(value).map_err(|error| Error::Protocol(format!("invalid error line: {error}")))?,
            );
        }
    }
    Ok(events)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::protocol::ErrorCode;

    #[test]
    fn parses_warnings_and_errors() {
        let events = parse_stderr(concat!(
            r#"{"warning":{"code":"RECOVERABLE_ERROR","page":"p","reason":"error","message":"m"}}"#,
            "\n",
            r#"{"error":{"code":"RENDER_FAILED","message":"boom","page":"p"}}"#,
            "\n"
        ))
        .unwrap();
        assert_eq!(events.warnings, 1);
        assert_eq!(events.error.unwrap().error.code, ErrorCode::RenderFailed);
    }

    #[test]
    fn rejects_non_json_lines() {
        assert!(matches!(parse_stderr("panic!\n"), Err(Error::Protocol(_))));
    }
}
