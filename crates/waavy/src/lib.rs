//! Rust client for [waavy](https://github.com/mega-blastoise/bundt/tree/main/packages/waavy):
//! render React pages from a Rust server without running JavaScript in it.
//!
//! waavy turns a **registered page + JSON props** into a complete HTML
//! document whose client assets hydrate it in the browser. This crate talks to
//! the waavy renderer:
//!
//! - [`Client`] — connects to a running `waavy serve` over a unix socket or
//!   TCP. Recommended for production (sub-millisecond overhead per render).
//! - [`oneshot::render`] — runs the `waavy` executable once per render
//!   (feature `oneshot`, on by default). Simpler, ~40 ms per render.
//!
//! ```no_run
//! # async fn example() -> waavy::Result<()> {
//! use serde_json::json;
//! use waavy::{Client, RenderRequest};
//!
//! let client = Client::unix("/run/waavy.sock");
//! let page = client
//!     .render(&RenderRequest::new("product").props(json!({ "name": "Lamp" })).title("Lamp"))
//!     .await?;
//! // Serve `page.html`; serve `<release>/client/` at the release's public path.
//! # Ok(()) }
//! ```
//!
//! # Errors
//!
//! Failures reported by waavy are [`Error::Render`] with a stable
//! [`ErrorCode`]. A streamed response that ends early yields
//! [`Error::Interrupted`]: never forward a partial document as success.
//! Only connection failures are retryable ([`Error::is_retryable`]).

#![warn(missing_docs)]

mod client;
mod error;
#[cfg(feature = "oneshot")]
pub mod oneshot;
mod protocol;

pub use client::{Client, RenderStream, Rendered};
pub use error::{Error, Result};
pub use protocol::{Document, ErrorBody, ErrorCode, ErrorDetail, Health, RenderRequest, PROTOCOL_VERSION};
