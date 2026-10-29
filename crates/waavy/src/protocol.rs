//! Wire types of the waavy host protocol (version 1).
//!
//! These mirror `packages/waavy/src/core/protocol.ts` and are checked against
//! the published JSON Schema (`@bundt/waavy/protocol.schema.json`) in this
//! crate's tests.

use std::fmt;
use std::time::Duration;

use serde::{Deserialize, Serialize};
use serde_json::{Map, Value};

/// Version of the host protocol these types implement.
pub const PROTOCOL_VERSION: u8 = 1;

/// A request to render one registered page with JSON props.
///
/// Build one with [`RenderRequest::new`] and the chained setters:
///
/// ```
/// use serde_json::json;
/// use waavy::RenderRequest;
///
/// let request = RenderRequest::new("product")
///     .props(json!({ "name": "Lamp", "price": 40 }))
///     .title("Lamp");
/// ```
///
/// Whether the response is streamed is decided by the method used to send it
/// ([`Client::render`](crate::Client::render) or
/// [`Client::render_stream`](crate::Client::render_stream)), not by the request.
#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RenderRequest {
    v: u8,
    page: String,
    props: Value,
    #[serde(skip_serializing_if = "Option::is_none")]
    document: Option<Document>,
    stream: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    timeout_ms: Option<u64>,
}

impl RenderRequest {
    /// A request for `page` with empty props.
    pub fn new(page: impl Into<String>) -> Self {
        Self {
            v: PROTOCOL_VERSION,
            page: page.into(),
            props: Value::Object(Map::new()),
            document: None,
            stream: false,
            timeout_ms: None,
        }
    }

    /// Sets the page props. They must be a JSON object; anything else is
    /// rejected by waavy with [`ErrorCode::InvalidRequest`].
    pub fn props(mut self, props: Value) -> Self {
        self.props = props;
        self
    }

    /// Sets the document `<title>` (HTML-escaped by waavy).
    pub fn title(mut self, title: impl Into<String>) -> Self {
        self.document_mut().title = Some(title.into());
        self
    }

    /// Sets `<html lang>` (a BCP 47 tag; defaults to `en`).
    pub fn lang(mut self, lang: impl Into<String>) -> Self {
        self.document_mut().lang = Some(lang.into());
        self
    }

    /// Appends **trusted** HTML to `<head>`. It is inserted verbatim: never
    /// pass end-user input here.
    pub fn head(mut self, html: impl Into<String>) -> Self {
        self.document_mut().head = Some(html.into());
        self
    }

    /// Sets the render deadline (whole milliseconds, 1–120000).
    pub fn timeout(mut self, timeout: Duration) -> Self {
        self.timeout_ms = Some(u64::try_from(timeout.as_millis()).unwrap_or(u64::MAX));
        self
    }

    /// The page ID.
    pub fn page(&self) -> &str {
        &self.page
    }

    /// A copy with the wire-level `stream` flag set; used by the transports.
    pub(crate) fn with_stream(&self, stream: bool) -> Self {
        Self { stream, ..self.clone() }
    }

    fn document_mut(&mut self) -> &mut Document {
        self.document.get_or_insert_with(Document::default)
    }
}

/// Host-controlled parts of the document shell.
#[derive(Debug, Clone, Default, PartialEq, Eq, Serialize)]
pub struct Document {
    #[serde(skip_serializing_if = "Option::is_none")]
    title: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    lang: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    head: Option<String>,
}

/// A stable waavy error code.
///
/// Codes waavy may add in later versions deserialize as
/// [`ErrorCode::Unknown`] rather than failing.
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
#[non_exhaustive]
pub enum ErrorCode {
    /// The request failed validation.
    InvalidRequest,
    /// The page ID is not registered in the release.
    PageNotFound,
    /// The page shell could not render; no usable HTML exists.
    RenderFailed,
    /// The shell was not ready by the deadline.
    RenderTimeout,
    /// The release is missing files or is inconsistent.
    ReleaseInvalid,
    /// The release was built for an incompatible waavy version.
    VersionMismatch,
    /// `waavy build` failed.
    BuildFailed,
    /// `waavy.config.*` is missing or invalid.
    ConfigInvalid,
    /// An unexpected failure inside waavy.
    Internal,
    /// A code this crate does not know yet.
    Unknown(String),
}

impl ErrorCode {
    /// Every code this crate knows, in protocol order.
    pub const KNOWN: [ErrorCode; 9] = [
        ErrorCode::InvalidRequest,
        ErrorCode::PageNotFound,
        ErrorCode::RenderFailed,
        ErrorCode::RenderTimeout,
        ErrorCode::ReleaseInvalid,
        ErrorCode::VersionMismatch,
        ErrorCode::BuildFailed,
        ErrorCode::ConfigInvalid,
        ErrorCode::Internal,
    ];

    /// The wire name, e.g. `"PAGE_NOT_FOUND"`.
    pub fn as_str(&self) -> &str {
        match self {
            ErrorCode::InvalidRequest => "INVALID_REQUEST",
            ErrorCode::PageNotFound => "PAGE_NOT_FOUND",
            ErrorCode::RenderFailed => "RENDER_FAILED",
            ErrorCode::RenderTimeout => "RENDER_TIMEOUT",
            ErrorCode::ReleaseInvalid => "RELEASE_INVALID",
            ErrorCode::VersionMismatch => "VERSION_MISMATCH",
            ErrorCode::BuildFailed => "BUILD_FAILED",
            ErrorCode::ConfigInvalid => "CONFIG_INVALID",
            ErrorCode::Internal => "INTERNAL",
            ErrorCode::Unknown(code) => code,
        }
    }

    /// The one-shot CLI exit status for this code (`None` for unknown codes).
    pub fn exit_status(&self) -> Option<i32> {
        Some(match self {
            ErrorCode::InvalidRequest => 10,
            ErrorCode::PageNotFound => 11,
            ErrorCode::RenderFailed => 20,
            ErrorCode::RenderTimeout => 21,
            ErrorCode::ReleaseInvalid => 30,
            ErrorCode::VersionMismatch => 31,
            ErrorCode::BuildFailed => 40,
            ErrorCode::ConfigInvalid => 41,
            ErrorCode::Internal => 70,
            ErrorCode::Unknown(_) => return None,
        })
    }

    /// The HTTP status `waavy serve` uses for this code (`None` for unknown codes).
    pub fn http_status(&self) -> Option<u16> {
        Some(match self {
            ErrorCode::InvalidRequest => 400,
            ErrorCode::PageNotFound => 404,
            ErrorCode::RenderFailed | ErrorCode::BuildFailed | ErrorCode::ConfigInvalid | ErrorCode::Internal => 500,
            ErrorCode::RenderTimeout => 504,
            ErrorCode::ReleaseInvalid | ErrorCode::VersionMismatch => 503,
            ErrorCode::Unknown(_) => return None,
        })
    }
}

impl From<&str> for ErrorCode {
    fn from(code: &str) -> Self {
        ErrorCode::KNOWN
            .into_iter()
            .find(|known| known.as_str() == code)
            .unwrap_or_else(|| ErrorCode::Unknown(code.to_owned()))
    }
}

impl fmt::Display for ErrorCode {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str(self.as_str())
    }
}

impl Serialize for ErrorCode {
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        serializer.serialize_str(self.as_str())
    }
}

impl<'de> Deserialize<'de> for ErrorCode {
    fn deserialize<D: serde::Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
        let code = String::deserialize(deserializer)?;
        Ok(ErrorCode::from(code.as_str()))
    }
}

/// The failure body waavy returns (HTTP body, or one stderr line in one-shot mode).
#[derive(Debug, Clone, PartialEq, Eq, Deserialize, Serialize)]
pub struct ErrorBody {
    /// The failure.
    pub error: ErrorDetail,
}

/// Details of a failure.
#[derive(Debug, Clone, PartialEq, Eq, Deserialize, Serialize)]
pub struct ErrorDetail {
    /// Stable classification.
    pub code: ErrorCode,
    /// Human-readable description.
    pub message: String,
    /// Page ID the failure relates to, when known.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub page: Option<String>,
}

/// The `GET /health` response.
#[derive(Debug, Clone, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Health {
    /// Always `true` when the server answers.
    pub ok: bool,
    /// Build ID of the loaded release.
    pub build_id: String,
    /// Host protocol version the server speaks.
    pub protocol_version: u32,
    /// waavy version of the server.
    pub waavy_version: String,
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn minimal_request_serializes_with_defaults() {
        let value = serde_json::to_value(RenderRequest::new("home")).unwrap();
        assert_eq!(value, json!({ "v": 1, "page": "home", "props": {}, "stream": false }));
    }

    #[test]
    fn full_request_uses_camel_case_and_nests_document() {
        let request = RenderRequest::new("p")
            .props(json!({ "a": 1 }))
            .title("T")
            .lang("fr")
            .head("<meta>")
            .timeout(Duration::from_millis(250))
            .with_stream(true);
        assert_eq!(
            serde_json::to_value(request).unwrap(),
            json!({
                "v": 1, "page": "p", "props": { "a": 1 },
                "document": { "title": "T", "lang": "fr", "head": "<meta>" },
                "stream": true, "timeoutMs": 250
            })
        );
    }

    #[test]
    fn error_codes_round_trip_and_tolerate_unknown_codes() {
        for code in ErrorCode::KNOWN {
            assert_eq!(ErrorCode::from(code.as_str()), code);
        }
        let body: ErrorBody =
            serde_json::from_value(json!({ "error": { "code": "NEW_CODE", "message": "m" } })).unwrap();
        assert_eq!(body.error.code, ErrorCode::Unknown("NEW_CODE".into()));
        assert_eq!(body.error.code.exit_status(), None);
    }
}
