# Waavy P2 — Warm renderer over HTTP + Rust client

Status: **Blocked on P1** · Depends on: `ARCHITECTURE.md` r2, `WAAVY_P1_SLICE.md` · Branch: `waavy/r2`

## Goal

Prove waavy's central promise end-to-end: a Rust (axum) host talks to a warm
`waavy serve` process built from the compiled binary, gets HTML, serves the
release's assets, and the page hydrates and works in a real browser.

## Locked decisions

- Transport is **HTTP** over a unix socket or TCP port (ARCH D1).
- Windows: TCP only, experimental; no unix socket on Windows.
- Rust crate lives at `crates/waavy`, name **`waavy`** (free on crates.io as
  of 2026-10-28), published in P3, not here.
- `Client` (connect) is separate from `Supervisor` (spawn/restart); the
  supervisor is **P3**. One-shot fallback is explicit, never an automatic retry.
- Buffered by default; streaming opt-in with ARCHITECTURE §5.2 semantics.

## Out of scope

Supervisor, crates.io/npm publishing, cross-platform binaries, hot release
swap, multi-process workers, caching, SSG.

---

## Tasks

### T1 — `transport/http.ts`
- [ ] `startHttpServer(renderer, { socket?, port?, hostname = "127.0.0.1", maxBodyBytes = 10 MiB, shutdownTimeoutMs = 10_000 })`
      using `Bun.serve` (`unix:` option for sockets). Exactly one of
      `socket`/`port`.
- [ ] `POST /render`: require `content-type: application/json`; enforce body
      limit (`413` with `INVALID_REQUEST`); parse with `parseRenderRequest`.
  - Buffered → `200 text/html; charset=utf-8` with headers
    `Waavy-Build-Id`, `Waavy-Recoverable-Errors: <n>`.
  - Error → JSON `ErrorBody`, status from `ERROR_CODES[code].http`.
  - `stream: true` → wait for the shell, then `200` with the composed stream
    and `Waavy-Build-Id`. If the stream fails after headers, error the
    `ReadableStream` so the connection closes **without** the chunked
    terminator (verify in T4).
  - Pass `request.signal` into the render so client disconnects abort it.
- [ ] `GET /health` → `{ ok: true, buildId, protocolVersion, waavyVersion }`.
- [ ] Any other route → `404` JSON `INVALID_REQUEST`.
- [ ] Unix socket hygiene: refuse to start if the path exists and a live server
      answers `/health`; otherwise unlink a stale file. Create with mode
      `0600` (override `--socket-mode`). Unlink on shutdown.
- [ ] Graceful shutdown on SIGTERM/SIGINT: stop accepting, wait for in-flight
      requests up to `shutdownTimeoutMs`, then exit `0`.
- [ ] Access log: one JSON line per request to stderr
      `{ ts, id, page, status, ms, recoverable, stream }`; `--log-level`
      (`silent|error|info`, default `info`).
- **Accept:** contract tests (T3).

### T2 — `waavy serve` command and `--dev`
- [ ] `waavy serve --release <dir> (--socket <path> | --port <n>) [--hostname] [--max-body <bytes>] [--log-level] [--socket-mode]`.
      The release is validated at startup; failure → exit with
      `RELEASE_INVALID`/`VERSION_MISMATCH` before listening.
- [ ] `waavy serve --dev [--root <dir>]`: build a release into
      `node_modules/.cache/waavy/dev/<buildId>/` with `minify: false`, serve
      `client/` at `publicPath` from the same server, watch the project
      (excluding `node_modules`, `outDir`, `.git`), debounce 100 ms, rebuild,
      swap renderers atomically (new buildId means a fresh import path), log
      build errors without stopping. Remove old dev builds, keeping the last 2.
- **Accept:** a dev-mode test edits a fixture page and observes new HTML
  within 2 s; a broken edit keeps serving the last good build.

### T3 — HTTP contract tests (TypeScript)
Spawn the **compiled binary** (`dist/bin/waavy`) on a temp unix socket and on a
port; use `fetch` (`unix` option for the socket).
- [ ] buffered success: headers, full document, island, assets;
- [ ] recoverable boundary → `200`, `Waavy-Recoverable-Errors: 1`;
- [ ] `broken` → `500 RENDER_FAILED`; `slow` with shell timeout → `504`;
      unknown page → `404`; malformed JSON / bad schema → `400`; body over
      limit → `413`; wrong method/route → `404`;
- [ ] stream success; stream interrupted after shell (fixture `stream-fail`:
      a boundary that rejects with a non-recoverable stream error — or a test
      hook in the fake renderFn) → fetch body read rejects;
- [ ] client abort mid-render → server logs an aborted request and stays healthy;
- [ ] SIGTERM with an in-flight slow request → request completes, process exits 0,
      socket file removed;
- [ ] stale socket file is replaced; live socket refuses second server.

### T4 — Streaming spikes (record in `spikes/P2_SPIKES.md`)
- [ ] **S1 interruption:** confirm that erroring the response stream in
      Bun.serve closes the connection without the terminating chunk, and that
      hyper surfaces this as a body error (`IncompleteMessage`/similar), not EOF.
      If Bun instead ends cleanly, implement explicit `server.stop`-free socket
      termination (e.g. `request.signal`-independent abort via
      `ReadableStream` controller `error()` + `Connection: close`) and re-test.
- [ ] **S2 trailers (informational):** can Bun.serve send HTTP/1.1 trailers and
      can hyper read them? Record result only; trailers stay out of contract.
- [ ] **S3 latency:** p50/p95 for buffered render of `counter` through `serve`
      over the socket vs P1's one-shot baseline (100 sequential + 100 at
      concurrency 8). Recorded to decide whether caching is ever needed.

### T5 — `crates/waavy` scaffold
- [ ] `Cargo.toml`: `edition = "2021"`, `license = "MIT"`, description, repo
      URL; deps `tokio` (rt, net, process, io-util, time), `hyper` 1
      (client, http1), `hyper-util` (client-legacy, tokio), `http-body-util`,
      `bytes`, `futures-core`, `serde`, `serde_json`, `thiserror`; dev-deps
      `tokio` (full, macros), `jsonschema`, `axum`, `tower-http` (fs).
      Features: `default = ["oneshot"]`, `oneshot`, `supervisor` (empty stub in P2).
- [ ] Use workspace deps from the root `Cargo.toml` where present
      (`serde`, `serde_json`, `thiserror`, `tokio`).
- **Accept:** `cargo build -p waavy` and `cargo clippy -p waavy -- -D warnings` pass.

### T6 — Protocol types (`src/protocol.rs`)
- [ ] `RenderRequest { v: u8 /* always 1 */, page, props: serde_json::Value, document: Option<Document>, stream: bool, timeout_ms: Option<u32> }`
      with a builder `RenderRequest::new(page).props(..).title(..)...`;
      serde `rename_all = "camelCase"`.
- [ ] `ErrorCode` enum mirroring `ERROR_CODES` (`SCREAMING_SNAKE_CASE`) plus
      `Unknown(String)` for forward compatibility; `ErrorBody`.
- [ ] Schema conformance test: serialize sample requests and validate them
      against `packages/waavy/dist/protocol.schema.json` (path via env
      `WAAVY_PROTOCOL_SCHEMA`, test skips with a message if unset).

### T7 — `Client` (`src/client.rs`, `src/error.rs`)
- [ ] `Client::unix(path)` (cfg unix), `Client::tcp(addr)`;
      `.with_timeout(Duration)` (whole request, client side).
- [ ] `render(&RenderRequest) -> Result<Rendered, Error>`, where
      `Rendered { html: String, build_id: String, recoverable_errors: u32 }`;
      forces `stream: false`.
- [ ] `render_stream(&RenderRequest) -> Result<RenderStream, Error>`;
      `RenderStream: Stream<Item = Result<Bytes, Error>>`, yielding
      `Error::Interrupted` if the body ends without the terminator; exposes
      `build_id()`.
- [ ] `health() -> Result<Health, Error>`.
- [ ] `Error` (thiserror): `Render { code: ErrorCode, message, page: Option<String> }`,
      `Interrupted`, `Timeout`, `Connect(io::Error)`, `Http(..)`,
      `Protocol(String)` (unexpected status/body). `is_retryable()` is true only for
      `Connect` — documented: render failures are never retried.
- **Accept:** unit tests with a mock hyper server for each status/error mapping.

### T8 — One-shot (`src/oneshot.rs`, feature `oneshot`)
- [ ] `oneshot::render(binary: &Path, release: &Path, &RenderRequest) -> Result<Rendered, Error>`:
      spawn `waavy render --release <dir> --stdin`, write the request to stdin,
      read stdout fully and drain stderr **concurrently** (no deadlock), parse
      stderr JSON lines (warnings → `recoverable_errors`, error → `Error::Render`),
      map exit code; `kill_on_drop(true)`.
- **Accept:** parity test — same request via `Client` and `oneshot` yields
  identical HTML.

### T9 — Rust integration tests (`crates/waavy/tests/`)
- [ ] Env: `WAAVY_BIN` (compiled binary), `WAAVY_RELEASE` (built
      `fixtures/basic` release). Missing → tests skip with a clear message.
- [ ] Test harness starts `waavy serve --socket <tmp>` per test module, waits
      for `/health`, kills on drop.
- [ ] Cases mirror T3: buffered, recoverable, each error code, stream,
      interrupted stream, timeout, one-shot parity.
- [ ] `scripts/waavy-rs-prepare.sh`: builds the package, the binary, and the
      fixture release; prints the env exports.

### T10 — `examples/axum` (`crates/waavy/examples/axum.rs`)
- [ ] `GET /` and `GET /counter/:n` → `client.render(RenderRequest::new("counter").props(json!({"label":"Clicks","initial":n})).title("Counter"))`
      → `Html`; map `waavy::Error::Render` to status via its code.
- [ ] `ServeDir` for `<release>/client` at `/assets`.
- [ ] Reads `WAAVY_SOCKET`, `WAAVY_RELEASE`, `PORT`; README section with run steps.
- [ ] Playwright e2e (in `packages/waavy/e2e/axum.test.ts`, gated on
      `WAAVY_E2E_AXUM=1`): start `waavy serve`, `cargo run --example axum`,
      load `/counter/3`, click → `4`; assets served by axum.

### T11 — CI
- [ ] New job `waavy-rs` (ubuntu) in `ci.yml`: setup Bun + Rust stable,
      `scripts/waavy-rs-prepare.sh`, `cargo test -p waavy`, `cargo clippy`,
      Playwright axum e2e.
- [ ] Contract tests (T3) run in the existing waavy test step.

### T12 — Docs
- [ ] `packages/waavy/docs/PROTOCOL.md`: the host contract for implementers in
      any language — request/response, status codes, headers, buffered vs
      streaming semantics (incl. "a forwarded 200 with an incomplete body is a
      failure"), one-shot CLI contract (stdout/stderr/exit), health, socket
      conventions, versioning rules.
- [ ] `crates/waavy/README.md`: install (git dep for now), `Client`, one-shot,
      error handling, axum example.
- [ ] Root `README.md` waavy section and `CLAUDE.md` notes updated.

---

## Exit criteria

1. HTTP contract tests (T3) pass against the compiled binary on socket and port.
2. `cargo test -p waavy` passes with `WAAVY_BIN`/`WAAVY_RELEASE` set, in CI.
3. Playwright click test passes against the axum example.
4. `spikes/P2_SPIKES.md` records interruption behavior, trailer support, and
   latency numbers; PROTOCOL.md matches observed behavior.

## Risks / open items

- If Bun.serve cannot produce a detectable interrupted stream (S1), streaming
  ships marked experimental, and buffered remains the only documented-safe mode.
- Bun is single-threaded per process; CPU-heavy pages limit throughput. Record
  in S3; multi-process (`reusePort`) is a later item, not P2.

## Implementation notes

_(fill in during implementation)_
