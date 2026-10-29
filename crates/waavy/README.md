# waavy (Rust)

Render React pages from a Rust server with
[waavy](../../packages/waavy/README.md) — no JavaScript runtime in your
server process.

waavy turns a **registered page + JSON props** into a complete HTML document
whose client assets hydrate it in the browser. This crate is the client for
the waavy renderer:

- **`Client`** connects to a running `waavy serve` over a unix socket or TCP
  (~0.1 ms overhead per render). Recommended for production.
- **`Supervisor`** starts `waavy serve` from your process, restarts it if it
  crashes, and stops it gracefully (feature `supervisor`, unix only).
- **`oneshot::render`** runs the `waavy` executable once per render
  (~40 ms, feature `oneshot`, on by default). No process to manage.

```toml
[dependencies]
waavy = "0.3"
# or, to supervise the renderer from your process:
waavy = { version = "0.3", features = ["supervisor"] }
```

| Feature | Default | Adds |
|---|---|---|
| `oneshot` | yes | `oneshot::render` (spawns `waavy render --stdin`) |
| `supervisor` | no | `Supervisor` (unix only) |

Minimum supported Rust version: 1.85. The crate version tracks the
`@bundt/waavy` npm package; use the same minor version of both.

You also need the `waavy` executable: `npm i @bundt/waavy` in your frontend
project (it installs `node_modules/@bundt/waavy-<os>-<cpu>/bin/waavy`), or
download it from the
[GitHub releases](https://github.com/mega-blastoise/bundt/releases) (including
Linux musl builds).

## Setup

1. In your frontend project, register pages in `waavy.config.ts` and run
   `waavy build` — this produces a release directory (e.g. `dist/waavy`).
2. Run the renderer next to your server:
   `waavy serve --release dist/waavy --socket /run/waavy.sock`.
3. Serve `dist/waavy/client/` as static files at the release's `publicPath`
   (default `/assets/`).

## Usage

```rust
use serde_json::json;
use waavy::{Client, Error, RenderRequest};

async fn product_page(client: &Client) -> Result<String, Error> {
    let request = RenderRequest::new("product")
        .props(json!({ "name": "Lamp", "price": 40 }))
        .title("Lamp");
    let page = client.render(&request).await?;
    if page.recoverable_errors > 0 {
        // The page is complete; some parts will finish rendering in the browser.
    }
    Ok(page.html)
}
```

Streaming (headers as soon as the page shell is ready; uses
`futures::StreamExt` for `.next()`):

```rust
use futures::StreamExt;

let mut stream = client.render_stream(&RenderRequest::new("feed")).await?;
while let Some(chunk) = stream.next().await {
    // Forward `chunk?` to your response. An `Error::Interrupted` here means
    // the document is incomplete: abort your response.
    let bytes = chunk?;
}
```

Supervised (the renderer is a child of your server):

```rust
use waavy::{RenderRequest, Supervisor};

let supervisor = Supervisor::builder()
    .binary("/usr/local/bin/waavy")
    .release("dist/waavy")
    .socket("/run/waavy.sock")
    .spawn()                       // resolves once /health answers
    .await?;
let page = supervisor.client().render(&RenderRequest::new("home")).await?;
// on shutdown: SIGTERM, wait for in-flight renders, SIGKILL after 15 s
supervisor.shutdown().await?;
```

Restarts use exponential backoff (100 ms → 5 s) and stop after 10 restarts
in a minute (`Status::Failed`); renders during a restart fail with the
retryable `Error::Connect`. Renderer stderr lines and supervisor events go to
`on_event` (default: JSON lines on your stderr).

One-shot:

```rust
let page = waavy::oneshot::render("/usr/local/bin/waavy", "dist/waavy", &RenderRequest::new("home")).await?;
```

## Errors

| Variant | Meaning | Retry? |
|---|---|---|
| `Error::Render { code, message, page }` | waavy reported a failure (`ErrorCode::PageNotFound`, `RenderFailed`, …) | no |
| `Error::Interrupted(_)` | the body broke off after a `200`; discard what you received | no |
| `Error::Timeout(_)` | the client-side timeout (`Client::with_timeout`) elapsed | your call |
| `Error::Connect(_)` | renderer not reachable | yes (`is_retryable()`) |
| `Error::Http(_)`, `Error::Protocol(_)`, `Error::Spawn(_)` | transport problems | no |

`ErrorCode::http_status()` gives the status waavy itself uses, which is a
sensible status for your own response.

## Example

[`examples/axum.rs`](examples/axum.rs) is a complete axum host (render route +
asset serving):

```sh
eval "$(scripts/waavy-rs-prepare.sh)"   # from the repo root: binary + fixture release
$WAAVY_BIN serve --release "$WAAVY_RELEASE" --socket /tmp/waavy.sock &
WAAVY_SOCKET=/tmp/waavy.sock cargo run -p waavy --example axum
```

## Tests

```sh
eval "$(scripts/waavy-rs-prepare.sh)" && cargo test -p waavy --all-features
```

Integration tests run against the real compiled binary and skip (with a
message) when `WAAVY_BIN` / `WAAVY_RELEASE` are not set. The protocol types
are checked against the JSON Schema published by `@bundt/waavy`.

Protocol reference: [`packages/waavy/docs/PROTOCOL.md`](../../packages/waavy/docs/PROTOCOL.md).
