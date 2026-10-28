# P2 spike results

Machine: macOS (Darwin arm64), Bun 1.3.14, Rust 1.90, hyper 1.x. Date: 2026-10-28.

## S1 — detectable interruption of a streamed response · **`Bun.serve`: FAIL → `node:http`: PASS**

Goal: when a render fails after headers were sent, the client must see an
*incomplete* response, never a clean end of body.

**`Bun.serve`** — every variant ended the chunked body cleanly (curl exit 0,
indistinguishable from success): `controller.error()`, throwing in `pull`, a
`direct` stream that throws, `Connection: close`. Only `server.stop(true)`
(kills *every* connection) or never ending the stream produced a detectable
failure. Bun also logs the stream error to its own stderr. There is no
per-connection abort API.

**`node:http` under Bun** — destroying one response produces curl exit 18
("transfer closed with outstanding read data remaining") on TCP and unix
sockets; concurrent requests are unaffected; nothing is logged.

Decision: the HTTP transport is built on `node:http` (`transport/http-server.ts`).

### S1b — how to destroy · **socket, not response**

`ServerResponse.destroy()` in Bun writes a stray `Connection: close\r\n\r\n`
into the open chunked body. Clients still fail (hyper: "Invalid chunk size
line"), but the stream is malformed rather than truncated. Destroying
`response.socket` first leaves a plain truncation after the last complete
chunk (verified with a raw socket capture). Implemented as
`abortConnection()` in `transport/http-handler.ts`.

Client side: hyper reports truncation as a body error whose source varies
(`UnexpectedEof` "during chunk size line", reset, or parse error depending on
where the bytes stop). The Rust client therefore maps **any** body error after
a `200` to `Error::Interrupted`. Verified end to end against the real
transport (`crates/waavy/tests/integration.rs`,
`a_real_late_stream_failure_is_interrupted`).

### S1c — further Bun `node:http` behavior found while testing

- **Client disconnects are not reported** until the server next writes: no
  `close`/`aborted` events while a buffered render is in progress. Renders
  therefore run to completion or their deadline. Acceptable because every
  render is bounded by `timeoutMs`; documented in PROTOCOL.md.
- **`end()` after a client disconnect never emits `finish` or `close`.** The
  handler must not await those events, or the request leaks and graceful
  shutdown waits out its full timeout (this was a real bug, caught by the
  serve contract tests).
- **Responding before reading the request body breaks the connection**: the
  client sees a reset instead of the response, and subsequent keep-alive
  requests stall. Oversized bodies are therefore read and discarded (up to
  4× the limit) before replying `413`.
- **Exceptions escaping the handler crash the process.** The server catches
  them, logs `handler_crashed`, and destroys only that connection.

## S2 — HTTP trailers · **not pursued (informational)**

Trailers stay out of the contract: truncation (S1) is detectable without
them, and Bun's `node:http` already mis-handles writes into an aborted
chunked body (S1b), which makes trailer behavior a poor foundation. Revisit
only if a host needs a post-shell status in-band.

## S3 — latency through `waavy serve`

Fixture `counter` page, buffered, unix socket, compiled binary, Bun `fetch`
client, after 20 warm-up requests:

| Scenario | p50 | p95 | Throughput |
|---|---|---|---|
| 100 sequential | 0.13 ms | 0.67 ms | — |
| 104 at concurrency 8 | 0.48 ms | 2.38 ms | ~11,000 req/s |
| one-shot baseline (P1 S5) | 40.9 ms | 48.2 ms | — |

`serve` removes ~99.7% of per-render overhead for small pages. This is the
evidence ARCHITECTURE §7 asked for: no HTML render cache is needed for the
first release; hosts can cache responses if their pages are expensive.

## Other findings

- **Bun ignores query strings when caching ES modules** (`import(url + '?t=…')`
  returns the cached module), in plain Bun and in compiled binaries. Dev mode
  re-reads `waavy.config.*` by importing a uniquely named sibling copy
  (`build/config-loader.ts`, `fresh` option); the watcher ignores those copies.
- `cargo add` in this repo initially hit a stale crates.io index (tokio
  requiring a mio version the cached index lacked); `cargo generate-lockfile`
  refreshed it. `Cargo.lock` is gitignored at the repo root.
