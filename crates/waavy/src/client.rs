//! HTTP client for a running `waavy serve`.
//!
//! The client only *connects*; it never starts or supervises a renderer. Each
//! call opens a fresh HTTP/1.1 connection, which is cheap over a local unix
//! socket and keeps the client free of pooling state.

use std::path::PathBuf;
use std::pin::Pin;
use std::task::{ready, Context, Poll};
use std::time::Duration;

use bytes::Bytes;
use futures_core::Stream;
use http_body_util::{BodyExt, Full};
use hyper::body::{Body, Incoming};
use hyper::header::{CONTENT_TYPE, HOST};
use hyper::{Method, Request, Response, StatusCode};
use hyper_util::rt::TokioIo;
use tokio::io::{AsyncRead, AsyncWrite};

use crate::error::{Error, Result};
use crate::protocol::{ErrorBody, Health, RenderRequest};

/// Header carrying the release build ID.
const BUILD_ID_HEADER: &str = "waavy-build-id";
/// Header carrying the number of recoverable errors (buffered renders).
const RECOVERABLE_ERRORS_HEADER: &str = "waavy-recoverable-errors";

/// Where the renderer listens.
#[derive(Debug, Clone)]
enum Endpoint {
    #[cfg(unix)]
    Unix(PathBuf),
    Tcp(String),
}

/// A client for `waavy serve`.
///
/// ```no_run
/// # async fn example() -> waavy::Result<()> {
/// use waavy::{Client, RenderRequest};
///
/// let client = Client::unix("/run/waavy.sock");
/// let page = client.render(&RenderRequest::new("home").title("Home")).await?;
/// println!("{} bytes from build {:?}", page.html.len(), page.build_id);
/// # Ok(()) }
/// ```
#[derive(Debug, Clone)]
pub struct Client {
    endpoint: Endpoint,
    timeout: Option<Duration>,
}

/// A fully rendered document.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Rendered {
    /// The complete HTML document.
    pub html: String,
    /// Build ID of the release that rendered it (not reported in one-shot mode).
    pub build_id: Option<String>,
    /// Problems React recovered from (the document is still complete).
    pub recoverable_errors: u32,
}

impl Client {
    /// A client for a renderer listening on a unix socket.
    #[cfg(unix)]
    pub fn unix(path: impl Into<PathBuf>) -> Self {
        Self { endpoint: Endpoint::Unix(path.into()), timeout: None }
    }

    /// A client for a renderer listening on TCP, e.g. `"127.0.0.1:4100"`.
    pub fn tcp(address: impl Into<String>) -> Self {
        Self { endpoint: Endpoint::Tcp(address.into()), timeout: None }
    }

    /// Bounds each call on the client side. For [`Client::render`] it covers
    /// the whole response; for [`Client::render_stream`] it covers receiving
    /// the response head (the shell). Independent of the request's render
    /// deadline, which waavy enforces.
    pub fn with_timeout(mut self, timeout: Duration) -> Self {
        self.timeout = Some(timeout);
        self
    }

    /// Renders a complete document (buffered).
    pub async fn render(&self, request: &RenderRequest) -> Result<Rendered> {
        self.within_timeout(async {
            let response = self.post_render(&request.with_stream(false)).await?;
            let response = ensure_success(response).await?;
            let build_id = header(&response, BUILD_ID_HEADER);
            let recoverable_errors = header(&response, RECOVERABLE_ERRORS_HEADER)
                .and_then(|value| value.parse().ok())
                .unwrap_or(0);
            let body = response.into_body().collect().await.map_err(Error::from_body)?.to_bytes();
            let html = String::from_utf8(body.to_vec()).map_err(|_| Error::Protocol("response is not UTF-8".into()))?;
            Ok(Rendered { html, build_id, recoverable_errors })
        })
        .await
    }

    /// Starts a streaming render. Resolves once the page shell is ready (or
    /// with the failure if it is not); the rest of the document arrives
    /// through the returned stream.
    pub async fn render_stream(&self, request: &RenderRequest) -> Result<RenderStream> {
        self.within_timeout(async {
            let response = ensure_success(self.post_render(&request.with_stream(true)).await?).await?;
            Ok(RenderStream { build_id: header(&response, BUILD_ID_HEADER), body: response.into_body() })
        })
        .await
    }

    /// Checks that the renderer is up and returns the loaded build.
    pub async fn health(&self) -> Result<Health> {
        self.within_timeout(async {
            let request = self.request_builder(Method::GET, "/health").body(Full::new(Bytes::new()));
            let response = ensure_success(self.send(request.expect("static request is valid")).await?).await?;
            let body = response.into_body().collect().await.map_err(Error::from_body)?.to_bytes();
            serde_json::from_slice(&body).map_err(|error| Error::Protocol(format!("invalid /health body: {error}")))
        })
        .await
    }

    async fn post_render(&self, request: &RenderRequest) -> Result<Response<Incoming>> {
        let body = serde_json::to_vec(request).map_err(|error| Error::Protocol(error.to_string()))?;
        let request = self
            .request_builder(Method::POST, "/render")
            .header(CONTENT_TYPE, "application/json")
            .body(Full::new(Bytes::from(body)))
            .map_err(|error| Error::Protocol(error.to_string()))?;
        self.send(request).await
    }

    fn request_builder(&self, method: Method, path: &str) -> hyper::http::request::Builder {
        let host = match &self.endpoint {
            #[cfg(unix)]
            Endpoint::Unix(_) => "localhost",
            Endpoint::Tcp(address) => address.as_str(),
        };
        Request::builder().method(method).uri(path).header(HOST, host)
    }

    async fn send(&self, request: Request<Full<Bytes>>) -> Result<Response<Incoming>> {
        match &self.endpoint {
            #[cfg(unix)]
            Endpoint::Unix(path) => {
                let stream = tokio::net::UnixStream::connect(path).await.map_err(Error::Connect)?;
                send_over(stream, request).await
            }
            Endpoint::Tcp(address) => {
                let stream = tokio::net::TcpStream::connect(address).await.map_err(Error::Connect)?;
                send_over(stream, request).await
            }
        }
    }

    async fn within_timeout<T>(&self, future: impl std::future::Future<Output = Result<T>>) -> Result<T> {
        match self.timeout {
            Some(limit) => tokio::time::timeout(limit, future).await.map_err(|_| Error::Timeout(limit))?,
            None => future.await,
        }
    }
}

/// Sends one request over a fresh HTTP/1.1 connection.
async fn send_over<S>(stream: S, request: Request<Full<Bytes>>) -> Result<Response<Incoming>>
where
    S: AsyncRead + AsyncWrite + Unpin + Send + 'static,
{
    let (mut sender, connection) = hyper::client::conn::http1::handshake(TokioIo::new(stream))
        .await
        .map_err(Error::Http)?;
    // The connection task drives I/O until the response body is consumed.
    tokio::spawn(async move {
        let _ = connection.await;
    });
    sender.send_request(request).await.map_err(Error::Http)
}

/// Turns non-2xx responses into [`Error::Render`] using the JSON error body.
async fn ensure_success(response: Response<Incoming>) -> Result<Response<Incoming>> {
    let status = response.status();
    if status == StatusCode::OK {
        return Ok(response);
    }
    let body = response.into_body().collect().await.map_err(Error::from_body)?.to_bytes();
    match serde_json::from_slice::<ErrorBody>(&body) {
        Ok(error) => Err(error.error.into()),
        Err(_) => Err(Error::Protocol(format!(
            "status {status} with a non-waavy body: {}",
            String::from_utf8_lossy(&body)
        ))),
    }
}

fn header(response: &Response<Incoming>, name: &str) -> Option<String> {
    response.headers().get(name).and_then(|value| value.to_str().ok()).map(str::to_owned)
}

/// The remainder of a streamed document.
///
/// Yields chunks of HTML. If the renderer fails after the shell, the stream
/// yields [`Error::Interrupted`]: the document is incomplete and everything
/// received so far must be discarded (do not forward a partial page as
/// success).
#[derive(Debug)]
pub struct RenderStream {
    body: Incoming,
    build_id: Option<String>,
}

impl RenderStream {
    /// Build ID of the release rendering this document.
    pub fn build_id(&self) -> Option<&str> {
        self.build_id.as_deref()
    }

    /// Reads the rest of the stream into a string.
    pub async fn into_string(self) -> Result<String> {
        let body = self.body.collect().await.map_err(Error::from_body)?.to_bytes();
        String::from_utf8(body.to_vec()).map_err(|_| Error::Protocol("response is not UTF-8".into()))
    }
}

impl Stream for RenderStream {
    type Item = Result<Bytes>;

    fn poll_next(mut self: Pin<&mut Self>, cx: &mut Context<'_>) -> Poll<Option<Self::Item>> {
        loop {
            return match ready!(Pin::new(&mut self.body).poll_frame(cx)) {
                None => Poll::Ready(None),
                Some(Err(error)) => Poll::Ready(Some(Err(Error::from_body(error)))),
                Some(Ok(frame)) => match frame.into_data() {
                    Ok(data) => Poll::Ready(Some(Ok(data))),
                    // Trailers are not part of the protocol; skip them.
                    Err(_) => continue,
                },
            };
        }
    }
}
