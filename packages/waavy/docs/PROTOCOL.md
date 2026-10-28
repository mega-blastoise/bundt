# waavy host protocol (v1)

How a host application — in any language — asks waavy to render a page.
Everything here is covered by contract tests (`packages/waavy/test/cli.test.ts`,
`test/serve.test.ts`, `test/http-transport.test.ts`,
`crates/waavy/tests/*.rs`). The machine-readable schema is
`@bundt/waavy/protocol.schema.json` (`$defs.RenderRequest`, `$defs.ErrorBody`).

There are two transports with the same request and error shapes:

| Transport | Start | Per-render cost (fixture, M-series Mac) | Use when |
|---|---|---|---|
| **HTTP** | `waavy serve --release <dir> --socket <path>` (or `--port <n>`) | ~0.1 ms p50 | production |
| **One-shot** | `waavy render --release <dir> --stdin` | ~40 ms p50 (process start) | scripts, CI, low traffic |

A client either **connects** to a running server or **runs** one-shot. Never
fall back from one to the other automatically after a failed render: a render
that failed will fail the same way again. Only connection failures are worth
retrying.

---

## Request

```json
{
  "v": 1,
  "page": "product",
  "props": { "name": "Lamp", "price": 40 },
  "document": { "title": "Lamp", "lang": "en", "head": "<meta name=\"robots\" content=\"noindex\">" },
  "stream": false,
  "timeoutMs": 10000
}
```

| Field | Required | Meaning |
|---|---|---|
| `v` | yes | Protocol version, `1`. |
| `page` | yes | Registered page ID: lowercase `[a-z0-9_-]` segments separated by `/`. |
| `props` | no (`{}`) | JSON **object** passed to the page component. |
| `document.title` | no | `<title>` text; HTML-escaped by waavy. |
| `document.lang` | no (`en`) | `<html lang>`; BCP 47 tag. |
| `document.head` | no | HTML appended to `<head>` **verbatim**. Trusted input only — never end-user data. |
| `stream` | no (`false`) | HTTP only: stream the response (see below). |
| `timeoutMs` | no (release default, 10000) | Render deadline, 1–120000. |

Unknown fields are rejected (`INVALID_REQUEST`).

## Success

The response is a complete HTML document:

```html
<!doctype html><html lang="en"><head>…</head><body>
<div id="waavy-root">…the page…</div>
<script type="application/json" id="waavy-data">{"v":1,"page":"…","buildId":"…","props":{…}}</script>
<script type="module" src="/assets/…"></script>
</body></html>
```

Asset URLs start with the release's `publicPath`. **The host serves
`<release>/client/` at that path** (static files). waavy does not, except in
`waavy serve --dev`.

### Recoverable errors and deadlines

A render can succeed while reporting *recoverable errors*: an error thrown
inside a React `<Suspense>` boundary (React sends the fallback and retries in
the browser), or a boundary still pending when the deadline passed (waavy
aborts it; the browser finishes rendering it). The document is complete and
valid. Hosts may log the count; they must not treat it as failure.

If the page **shell** (everything outside Suspense boundaries) cannot render,
that is `RENDER_FAILED`; if the shell is not ready by the deadline, that is
`RENDER_TIMEOUT`. No HTML is produced in either case.

## Failure

Every failure is one `ErrorBody`:

```json
{ "error": { "code": "PAGE_NOT_FOUND", "message": "Page \"x\" is not registered in release …", "page": "x" } }
```

| Code | Exit (one-shot) | HTTP | Meaning |
|---|---|---|---|
| `INVALID_REQUEST` | 10 | 400 (413 if the body is too large; 404 for unknown routes) | Request or flags failed validation |
| `PAGE_NOT_FOUND` | 11 | 404 | Page ID not in the release |
| `RENDER_FAILED` | 20 | 500 | The page shell could not render |
| `RENDER_TIMEOUT` | 21 | 504 | The shell was not ready by the deadline |
| `RELEASE_INVALID` | 30 | 503 | Release missing files or inconsistent |
| `VERSION_MISMATCH` | 31 | 503 | Release built for an incompatible waavy |
| `BUILD_FAILED` | 40 | 500 | `waavy build` failed |
| `CONFIG_INVALID` | 41 | 500 | `waavy.config.*` missing or invalid |
| `INTERNAL` | 70 | 500 | Unexpected failure (a waavy bug) |

Clients should treat unknown codes as failures (new codes may be added in
minor versions) and use the HTTP status / exit code as the fallback
classification.

---

## HTTP transport (`waavy serve`)

```sh
waavy serve --release dist/waavy --socket /run/waavy.sock    # unix socket (mode 0600)
waavy serve --release dist/waavy --port 4100                 # TCP on 127.0.0.1
```

| Flag | Default | Meaning |
|---|---|---|
| `--socket <path>` / `--port <n>` | — | Exactly one. `--port 0` picks a free port (see the `listening` event). Unix sockets are not available on Windows. |
| `--hostname <host>` | `127.0.0.1` | TCP bind address. waavy has no authentication: keep it on loopback or a private network. |
| `--socket-mode <octal>` | `600` | Socket file permissions. |
| `--max-body <bytes>` | 10 MiB | Larger bodies get `413`. |
| `--shutdown-timeout <ms>` | 10000 | Grace period for in-flight requests on SIGTERM/SIGINT. |
| `--log-level` | `info` | `silent`, `error` (failed requests only), `info`. |
| `--dev` | off | Build from source (`--root`, `--config`), serve assets, rebuild on change. Not for production. |

### Endpoints

**`POST /render`** — body: a request (`Content-Type: application/json`
required).

- **Buffered** (`"stream": false`, the default): waavy waits for every
  Suspense boundary (or the deadline), then responds once.
  - `200 text/html; charset=utf-8` with the full document and headers
    `Waavy-Build-Id`, `Waavy-Recoverable-Errors: <n>`, `Waavy-Request-Id`.
  - Otherwise a JSON `ErrorBody` with the status from the table.
  - **A host that received a buffered `200` has the complete, final
    document.**
- **Streaming** (`"stream": true`): headers are sent once the shell is
  ready, then the rest of the document as it renders (chunked).
  - Shell failures and shell timeouts still produce a JSON `ErrorBody` with a
    proper status — nothing has been sent yet.
  - After `200`, the only failure mode is an **incomplete body**: waavy
    closes the connection without the chunked terminator, and HTTP clients
    report an error while reading the body (hyper: body error; curl: exit
    18; fetch: rejected body read). **A forwarded `200` with an incomplete
    body is a failure**: hosts that relay the stream to a browser must abort
    their own response; hosts that buffer must discard what they received.
  - No `Waavy-Recoverable-Errors` header (the count is unknown when headers
    are sent). HTTP trailers are not used.

**`GET /health`** — `200 {"ok":true,"buildId":"…","protocolVersion":1,"waavyVersion":"…"}`.

Any other route: `404` `INVALID_REQUEST`.

Request IDs: an incoming `X-Request-Id` is echoed as `Waavy-Request-Id`;
otherwise waavy generates one.

### Logs

One JSON object per line on stderr:

```json
{"type":"event","ts":"…","event":"listening","address":"unix:/run/waavy.sock","buildId":"…"}
{"type":"access","id":"…","method":"POST","path":"/render","page":"product","status":200,"stream":false,"recoverable":0,"ts":"…","ms":1}
{"type":"event","ts":"…","event":"shutting_down","inFlight":0}
```

Events: `listening`, `shutting_down`, `stopped`, `dev_build`,
`dev_build_failed`, `handler_crashed` (a waavy bug, contained to one
connection). Startup failures are a single `{"error":…}` line followed by
the exit code from the table (e.g. 30 for an invalid release).

### Lifecycle

- The release is validated before listening; a bad release never accepts
  connections.
- Starting on a socket path where a live server answers is refused; a stale
  socket file (no listener) is replaced.
- SIGTERM/SIGINT: stop accepting, let in-flight requests finish (up to
  `--shutdown-timeout`), remove the socket file, exit `0`.
- One release per process. To deploy a new release, start a new process (on
  a new socket, then switch) or restart.

### Known limitations

- **Client disconnects** are noticed when waavy next writes to the
  connection, so an abandoned buffered render still runs to completion or its
  deadline. Renders are always bounded by `timeoutMs`.
- A streaming client that stops reading for 30 s is disconnected.
- React may place small inline `<script>` elements inside `#waavy-root` for
  boundaries completed by streaming or aborted at the deadline; strict CSPs
  need to allow them (nonce support is planned).
- One process renders on one thread; CPU-heavy pages limit throughput.

---

## One-shot transport (`waavy render`)

```sh
waavy render --release dist/waavy --stdin < request.json
waavy render --release dist/waavy --page product --props '{"name":"Lamp"}' --title Lamp
```

- **stdout**: the HTML document, nothing else.
- **stderr**: JSON lines only — one
  `{"warning":{"code":"RECOVERABLE_ERROR","page":"…","reason":"error"|"timeout","message":"…"}}`
  per recoverable error and, on failure, exactly one `ErrorBody` line.
- **exit status**: `0` on success, else the code's exit status.
- With `--stream`, HTML is written as it renders; discard stdout whenever
  the exit status is non-zero.
- Prefer `--stdin` for programmatic use: argv has size limits and quoting
  pitfalls.

---

## Versioning

- `v` in the request and `protocolVersion` in `/health` identify this
  document. Breaking changes bump it; waavy rejects other versions with
  `INVALID_REQUEST`.
- Adding optional request fields, response headers, log fields, or error
  codes is not breaking. Clients must ignore unknown fields and tolerate
  unknown codes.
- Releases record the protocol, release-ABI, and manifest versions they were
  built with; a runtime refuses incompatible releases with `VERSION_MISMATCH`.
