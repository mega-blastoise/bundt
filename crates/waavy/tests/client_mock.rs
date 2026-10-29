//! `Client` against scripted raw-HTTP servers: status/error mapping, timeouts,
//! and — the key contract — that a chunked body cut off mid-stream surfaces as
//! `Error::Interrupted` (spike P2-S1, client side).

use std::time::Duration;

use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::net::TcpListener;
use waavy::{Client, Error, ErrorCode, RenderRequest};

/// Serves one connection: reads the request head, writes `response`, and then
/// either closes the socket or (with `hang`) keeps it open forever.
async fn scripted_server(response: &'static [u8], hang: bool) -> String {
    let listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
    let address = listener.local_addr().unwrap().to_string();
    tokio::spawn(async move {
        let (mut socket, _) = listener.accept().await.unwrap();
        let mut buffer = vec![0u8; 64 * 1024];
        let _ = socket.read(&mut buffer).await;
        if hang {
            std::future::pending::<()>().await;
        }
        socket.write_all(response).await.unwrap();
        socket.flush().await.unwrap();
        // Dropping the socket closes the connection, possibly mid-body.
    });
    address
}

fn request() -> RenderRequest {
    RenderRequest::new("home")
}

#[tokio::test]
async fn buffered_success_reads_body_and_headers() {
    let address = scripted_server(
        b"HTTP/1.1 200 OK\r\ncontent-type: text/html\r\nwaavy-build-id: b1\r\nwaavy-recoverable-errors: 2\r\ncontent-length: 9\r\n\r\n<p>ok</p>",
        false,
    )
    .await;
    let page = Client::tcp(address).render(&request()).await.unwrap();
    assert_eq!(page.html, "<p>ok</p>");
    assert_eq!(page.build_id.as_deref(), Some("b1"));
    assert_eq!(page.recoverable_errors, 2);
}

#[tokio::test]
async fn error_bodies_become_render_errors() {
    let address = scripted_server(
        b"HTTP/1.1 404 Not Found\r\ncontent-type: application/json\r\ncontent-length: 66\r\n\r\n{\"error\":{\"code\":\"PAGE_NOT_FOUND\",\"message\":\"nope\",\"page\":\"home\"}}",
        false,
    )
    .await;
    let error = Client::tcp(address).render(&request()).await.unwrap_err();
    assert_eq!(error.code(), Some(&ErrorCode::PageNotFound));
    assert!(matches!(error, Error::Render { page: Some(ref page), .. } if page == "home"));
    assert!(!error.is_retryable());
}

#[tokio::test]
async fn non_waavy_error_bodies_are_protocol_errors() {
    let address = scripted_server(b"HTTP/1.1 502 Bad Gateway\r\ncontent-length: 3\r\n\r\nbad", false).await;
    let error = Client::tcp(address).render(&request()).await.unwrap_err();
    assert!(matches!(error, Error::Protocol(_)), "{error:?}");
}

#[tokio::test]
async fn a_truncated_chunked_stream_is_interrupted() {
    // Headers, two chunks, then the socket closes without the `0\r\n\r\n` terminator.
    let response = b"HTTP/1.1 200 OK\r\ncontent-type: text/html\r\nwaavy-build-id: b1\r\ntransfer-encoding: chunked\r\n\r\n5\r\n<p>hi\r\n4\r\n</p>\r\n";

    let address = scripted_server(response, false).await;
    let stream = Client::tcp(address).render_stream(&request()).await.unwrap();
    assert_eq!(stream.build_id(), Some("b1"));
    assert!(matches!(stream.into_string().await, Err(Error::Interrupted(_))));

    let address = scripted_server(response, false).await;
    assert!(matches!(Client::tcp(address).render(&request()).await, Err(Error::Interrupted(_))));
}

#[tokio::test]
async fn a_complete_chunked_stream_succeeds() {
    let address = scripted_server(
        b"HTTP/1.1 200 OK\r\ntransfer-encoding: chunked\r\n\r\n5\r\n<p>hi\r\n4\r\n</p>\r\n0\r\n\r\n",
        false,
    )
    .await;
    let html = Client::tcp(address).render_stream(&request()).await.unwrap().into_string().await.unwrap();
    assert_eq!(html, "<p>hi</p>");
}

#[tokio::test]
async fn connection_failures_are_retryable() {
    // Bind then drop to get a port nobody listens on.
    let address = TcpListener::bind("127.0.0.1:0").await.unwrap().local_addr().unwrap().to_string();
    let error = Client::tcp(address).render(&request()).await.unwrap_err();
    assert!(matches!(error, Error::Connect(_)));
    assert!(error.is_retryable());
}

#[tokio::test]
async fn the_client_timeout_applies() {
    let address = scripted_server(b"", true).await;
    let error = Client::tcp(address).with_timeout(Duration::from_millis(100)).render(&request()).await.unwrap_err();
    assert!(matches!(error, Error::Timeout(limit) if limit == Duration::from_millis(100)));
}
