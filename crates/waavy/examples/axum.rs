//! Reference host: an axum server rendering React pages through `waavy serve`.
//!
//! ```sh
//! eval "$(scripts/waavy-rs-prepare.sh)"                # binary + fixture release
//! $WAAVY_BIN serve --release "$WAAVY_RELEASE" --socket /tmp/waavy.sock &
//! WAAVY_SOCKET=/tmp/waavy.sock cargo run -p waavy --example axum
//! open http://127.0.0.1:3000/counter/3
//! ```
//!
//! Environment: `WAAVY_SOCKET` (renderer socket), `WAAVY_RELEASE` (release
//! directory; its `client/` is served at `/assets`, the fixture's
//! `publicPath`), `PORT` (default 3000).

use std::path::PathBuf;

use axum::extract::{Path, State};
use axum::http::StatusCode;
use axum::response::{Html, IntoResponse, Response};
use axum::routing::get;
use axum::Router;
use serde_json::json;
use tower_http::services::ServeDir;
use waavy::{Client, RenderRequest};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let socket = required_env("WAAVY_SOCKET")?;
    let release = PathBuf::from(required_env("WAAVY_RELEASE")?);
    let port: u16 = std::env::var("PORT").ok().and_then(|value| value.parse().ok()).unwrap_or(3000);

    let app = Router::new()
        .route("/", get(home))
        .route("/counter/{initial}", get(counter))
        // The host serves client assets; waavy only renders.
        .nest_service("/assets", ServeDir::new(release.join("client")))
        .with_state(Client::unix(socket));

    let listener = tokio::net::TcpListener::bind(("127.0.0.1", port)).await?;
    println!("listening on http://{}", listener.local_addr()?);
    axum::serve(listener, app).await?;
    Ok(())
}

async fn home(State(client): State<Client>) -> Response {
    render(&client, RenderRequest::new("styled").title("waavy + axum")).await
}

async fn counter(State(client): State<Client>, Path(initial): Path<u32>) -> Response {
    let request = RenderRequest::new("counter")
        .props(json!({ "label": "Clicks", "initial": initial }))
        .title("Counter");
    render(&client, request).await
}

/// Renders a page, mapping waavy failures to the status waavy itself uses
/// (502 when the renderer is unreachable or misbehaves).
async fn render(client: &Client, request: RenderRequest) -> Response {
    match client.render(&request).await {
        Ok(page) => Html(page.html).into_response(),
        Err(error) => {
            let status = error
                .code()
                .and_then(|code| code.http_status())
                .and_then(|status| StatusCode::from_u16(status).ok())
                .unwrap_or(StatusCode::BAD_GATEWAY);
            eprintln!("render of {:?} failed: {error}", request.page());
            (status, "render failed").into_response()
        }
    }
}

fn required_env(name: &str) -> Result<String, String> {
    std::env::var(name).map_err(|_| format!("{name} must be set (see the example's docs)"))
}
