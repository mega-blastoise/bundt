//! The crate's error type.

use std::time::Duration;

use crate::protocol::{ErrorCode, ErrorDetail};

/// Result alias for this crate.
pub type Result<T, E = Error> = std::result::Result<T, E>;

/// Everything that can go wrong talking to waavy.
///
/// Only [`Error::Connect`] is worth retrying (see [`Error::is_retryable`]):
/// a render that failed will fail the same way again.
#[derive(Debug, thiserror::Error)]
#[non_exhaustive]
pub enum Error {
    /// waavy answered with a failure.
    #[error("waavy {code}: {message}")]
    Render {
        /// Stable classification of the failure.
        code: ErrorCode,
        /// Human-readable description from waavy.
        message: String,
        /// Page ID the failure relates to, when known.
        page: Option<String>,
    },

    /// The response body broke off before the document was complete (waavy
    /// failed after sending the shell, or the connection dropped). Discard
    /// everything received for this response.
    #[error("waavy response ended before the document was complete")]
    Interrupted(#[source] hyper::Error),

    /// The client-side timeout elapsed.
    #[error("waavy request timed out after {0:?}")]
    Timeout(Duration),

    /// The renderer could not be reached (not running, wrong socket/port).
    #[error("cannot connect to waavy: {0}")]
    Connect(#[source] std::io::Error),

    /// HTTP-level failure after connecting.
    #[error("HTTP error talking to waavy: {0}")]
    Http(#[source] hyper::Error),

    /// The `waavy` executable could not be started (one-shot mode).
    #[error("cannot run the waavy executable: {0}")]
    Spawn(#[source] std::io::Error),

    /// waavy answered with something this crate does not understand.
    #[error("unexpected response from waavy: {0}")]
    Protocol(String),
}

impl Error {
    /// `true` only for connection failures. Render failures are never retried.
    pub fn is_retryable(&self) -> bool {
        matches!(self, Error::Connect(_))
    }

    /// The waavy error code, for [`Error::Render`].
    pub fn code(&self) -> Option<&ErrorCode> {
        match self {
            Error::Render { code, .. } => Some(code),
            _ => None,
        }
    }

    /// Maps an error that happened while reading a response body.
    ///
    /// Once the 200 status line has arrived, *any* body error means the
    /// document is incomplete — whether hyper sees an early EOF, a reset, or
    /// a malformed chunk — so all of them are [`Error::Interrupted`].
    pub(crate) fn from_body(error: hyper::Error) -> Self {
        Error::Interrupted(error)
    }
}

impl From<ErrorDetail> for Error {
    fn from(detail: ErrorDetail) -> Self {
        Error::Render { code: detail.code, message: detail.message, page: detail.page }
    }
}
