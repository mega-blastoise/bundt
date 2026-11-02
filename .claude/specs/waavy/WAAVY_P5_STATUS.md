# Waavy P5 — `/status` and `waavy dashboard`

Status: **proposed** · Depends on: P2 (`serve`), P3 (Supervisor, distribution) · Target: 0.4.0 · Branch: `waavy/p5-status` off `main`

## Goal

You can see what a running `waavy serve` is doing without reading its
logs:

1. **`GET /status`** on the existing listener returns a JSON snapshot:
   the process, the release it has loaded, dev-mode build state, traffic
   counters, a 60 s latency/error window, event-loop lag, and recent
   requests. The Rust crate exposes it as `Client::status()`.
2. **`waavy dashboard --connect <renderer>`** is a separate local process.
   It polls `/status`, keeps a short history, notices restarts, and serves
   a small live web page on `127.0.0.1`.

`/status` is useful without the dashboard: from curl, from a host's own
health checks, or from the Rust `Supervisor`'s host. The dashboard is a
thin viewer over it.

## Locked decisions

- **The dashboard is a separate process, not a second listener in
  `serve`.** The renderer gets no extra port, no UI code on its hot path,
  and no new failure modes. One dashboard can be pointed at any renderer:
  under the `Supervisor`, under systemd, or in dev mode. (D16)
- **Stats are collected behind the `Logger` interface.** `transport` already
  reports every request through `Logger.access` and every lifecycle change
  through `Logger.event`. A recorder that tees that interface gets complete
  data, independent of `--log-level`, without touching the request handler.
- **`/status` requests are not access-logged, and aren't counted in render
  stats.** A dashboard polling at 1 Hz would otherwise add 86,400 log lines
  a day and skew the request counts. `/status` failures are still logged at
  `error`. `/health` is unchanged. (D18)
- **No request props, bodies or HTML in `/status`.** Recent requests carry
  only the ID, method, path, page, status, ms, stream flag, error code,
  recoverable count and aborted flag. They're the same fields as the access
  log, and props may contain personal data.
- **Additive protocol change.** It ships as a new route plus new schema
  `urn:waavy:protocol:1:Status`. `PROTOCOL_VERSION` stays 1. Clients must
  ignore unknown fields, so the snapshot may grow.
- **The dashboard binds loopback by default** and has no authentication.
  `--host` with a non-loopback address is allowed, but prints a warning and
  logs an event.
- **0.4.0** (minor): a new route, a new command, and a new crate API.

## Out of scope

- Prometheus `/metrics`. It's a candidate follow-up: the recorder's counters
  map onto it directly. Keep the recorder's data model compatible (monotonic
  counters, histogram buckets; T2).
- Watching several renderers from one dashboard; v1 has one `--connect`.
- Auth/TLS on the dashboard.
- Persisting history across dashboard restarts.
- Showing `Supervisor` restart counts (they live in the host). The
  dashboard *infers* restarts from `pid`/`startedAt` changes (T6).
- Remote control (reload, drain, kill) from the dashboard: read-only in v1.

---

## Tasks

### T1 — `Status` schema (`core/status.ts`)
- [ ] Zod schema `StatusSchema` and type `Status`, exported through the
      generated JSON Schema like the other protocol types, with `$id`
      `urn:waavy:protocol:1:Status`.
- [ ] Shape (all times ms unless named otherwise):
      ```jsonc
      {
        "ok": true,
        "process": {
          "pid": 4242, "startedAt": "ISO", "uptimeMs": 123456,
          "waavyVersion": "0.4.0", "protocolVersion": 1,
          "platform": "darwin-arm64",
          "memory": { "rssBytes": 0, "heapUsedBytes": 0 },
          "eventLoopLagMs": { "current": 1.2, "max60s": 48.0 }
        },
        "listen": { "address": "unix:/run/waavy.sock" },
        "release": { "buildId": "…", "pages": ["home", "product"], "dev": false },
        "dev": {                       // present only with --dev
          "state": "ready",            // "building" | "ready" | "failed"
          "lastBuildAt": "ISO", "builds": 7,
          "lastError": { "code": "BUILD_FAILED", "message": "…" }  // only when failed
        },
        "inFlight": 2,
        "totals": {                    // since process start; monotonic
          "requests": 1234, "renders": 1200,
          "byOutcome": { "ok": 1180, "error": 15, "aborted": 5 },
          "byErrorCode": { "RENDER_FAILED": 10, "PAGE_NOT_FOUND": 5 },
          "byPage": { "home": { "renders": 900, "errors": 2, "streamed": 300 } },
          "recoverableErrors": 3
        },
        "window": {                    // trailing 60 s
          "seconds": 60, "requests": 300, "perSecond": 5.0,
          "errors": 2, "latencyMs": { "p50": 4, "p95": 18, "p99": 40, "max": 95 }
        },
        "recent": [ /* last 50 render requests, newest first; AccessLogEntry fields */ ],
        "recentErrors": [ /* last 20 failed/aborted requests; same fields */ ]
      }
      ```
- **Accept:** schema round-trips the example above; JSON Schema generated;
  `src/core` stays runtime-agnostic (`layers.test.ts`).

### T2 — Stats recorder (`transport/stats.ts`)
- [ ] `createStatsRecorder({ now?, maxRecent?, windowSeconds? })` returns
      `{ logger(inner: Logger): Logger; snapshot(): …; startLagSampler(): () => void }`.
      `logger(inner)` returns a Logger that records, then forwards to `inner`.
- [ ] Counts `access` entries for `POST /render` as renders; other routes
      count toward `totals.requests` only.
- [ ] Tracks dev-mode state from `dev_build` / `dev_build_failed` events.
      This needs a `dev_build_started` event from `cli/dev-releases.ts` so
      that the state can be `building`. That event is additive and is also
      logged.
- [ ] 60 s window: a ring buffer of samples `(t, ms, failed)`, capped at
      10,000. Quantiles are computed exactly over the window, at snapshot
      time only. Also keep fixed-bucket histogram counters (bounds 1, 2, 5,
      10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000 ms, then +Inf) for a
      future `/metrics`. They are internal and not in the snapshot.
- [ ] Event-loop lag: a timer every 100 ms, `unref()`'d. Lag is the delay
      past the expected tick. Keep the current value and a 60 s max. Use
      interval drift rather than `perf_hooks.monitorEventLoopDelay`: Bun's
      support for it is unverified, so check it during implementation and
      record the finding under Implementation notes.
- [ ] `inFlight` comes from the server; pass a getter in.
- **Accept:** unit tests with an injected clock for counters, window
  expiry, quantiles, ring-buffer caps, dev state transitions, and the
  "recorder sees entries even at `--log-level silent`" case.

### T3 — `GET /status` route
- [ ] `http-handler.ts`: `GET /status` → `200` + snapshot. Wire the recorder
      in `startHttpServer`: wrap the logger, start the lag sampler, stop it
      on `close`.
- [ ] Skip the access log for `/status` unless it fails (D18).
- [ ] `docs/PROTOCOL.md`: the route, the shape, the stability rules
      (additive only), and the privacy rule (no props).
- **Accept:** contract test in `test/serve.test.ts` over both a unix socket
  and TCP. After N renders (including one error and one streamed), the
  counts, `byPage`, `byErrorCode` and `recent` match, with no props.
  `/status` itself appears in neither the counts nor the access log. The
  test also runs a dev-mode case, covering `building`, `ready`, then
  `failed` with `lastError`.

### T4 — Rust `Client::status()`
- [ ] `protocol.rs`: `ServerStatus` and nested types. (`Status` is taken by
      `supervisor::Status`.) Mark every struct `#[non_exhaustive]`, give
      optional or new fields `#[serde(default)]`, and ignore unknown fields.
- [ ] `client.rs`: `pub async fn status(&self) -> Result<ServerStatus>`.
- [ ] `tests/schema.rs` validates the Rust types against
      `urn:waavy:protocol:1:Status`; integration test against the real
      binary.
- **Accept:** `cargo test -p waavy --all-features`; docs on `Client::status`
  include an example.

### T5 — Dashboard layer and command
- [ ] New layer `src/dashboard/`, which may import `core` and `dashboard`
      only. `cli` → `dashboard` is allowed. Update the rules in
      `layers.test.ts`. The dashboard talks to the renderer with its own
      small `node:http` client and doesn't import `transport`.
- [ ] `waavy dashboard --connect <target> [--port 9901] [--host 127.0.0.1] [--interval 1000]`.
      The target is `unix:/path`, a bare socket path, or `http://host:port`.
- [ ] Routes:
      - `GET /` serves the page (T7).
      - `GET /api/status` returns the latest snapshot, wrapped as
        `{ reachable, fetchedAt, probeMs, status?, error?, history, restarts }`.
      - `GET /api/events` is SSE: one `status` event per poll. The page
        uses it, and falls back to polling `/api/status`.
- [ ] Logs JSON lines like `serve`: `listening`, `renderer_unreachable`,
      `renderer_restarted`, and `exposed_non_loopback` as a warning.
- [ ] Exit codes follow `core/errors.ts`: a bad flag returns
      `INVALID_REQUEST`. A renderer that can't be reached at startup isn't
      an error; the dashboard shows it as unreachable and keeps polling.
- **Accept:** CLI contract tests: flag validation; serving `/` and
  `/api/status` against a real `serve`; an unreachable target reports
  `reachable: false`; SIGTERM exits 0.

### T6 — Poller, history and restart detection (`dashboard/poller.ts`)
- [ ] Poll at `--interval` with a per-probe timeout of `max(interval, 2 s)`.
      Report three states:
      - `healthy`;
      - `unresponsive`, when the socket accepts but `/status` exceeds the
        timeout (a long synchronous render blocks the event loop; show for
        how long);
      - `unreachable`, when the connection is refused or the socket is
        missing.
- [ ] History: a ring buffer of the last 600 points (10 min at 1 s). Each
      point holds `t`, `perSecond`, `p95`, `errors`, `inFlight`, `rssBytes`,
      `eventLoopLagMs` and `state`.
- [ ] Restart detection: a `pid` or `startedAt` change records a restart
      marker `{ t, fromPid, toPid, buildIdChanged }`. Totals reset there, so
      rates are computed per process segment and never go negative.
- **Accept:** unit tests with a fake renderer for state transitions,
  history cap, restart detection, and rates across a restart.

### T7 — Dashboard page
- [ ] **UI technology: D17, owner decision (see below).** The default if no
      decision is made is option A.
- [ ] Panels:
      1. Header: state pill (healthy / unresponsive Ns / unreachable), pid,
         uptime, waavy version, address.
      2. Release: build ID, page list; in dev mode the build state and the
         last build error, shown in full.
      3. Traffic: requests/s and p95 sparklines (10 min, with restart
         markers), in-flight, p50/p95/p99, and error rate over 60 s.
      4. Pages table: renders, errors and streamed share per page; sortable.
      5. Errors by code, and the recent-errors list.
      6. Recent requests table, with request IDs that can be copied.
      7. Process: RSS, heap, event-loop lag (current and 60 s max).
- [ ] Light and dark via `prefers-color-scheme`; usable at 360 px; no
      external network requests (works offline, no CDNs).
- **Accept:** Playwright e2e in `e2e/dashboard.test.ts`:
  - with `serve` and `dashboard` running, rendering pages updates the
    counts within 2 s;
  - killing `serve` shows *unreachable*;
  - restarting it shows a restart marker;
  - a dev build failure shows the error.

### T8 — Distribution
- [ ] The dashboard page is embedded in the compiled binary (Bun
      `with { type: 'file' }` / `'text'` imports) and appears in the
      `bun build --compile` output for every target. The npm launcher needs
      no changes.
- [ ] Measure the binary size impact and record it.
- **Accept:** `scripts/waavy-install-test.sh` also runs `waavy dashboard`
  against `waavy serve` from a packed install and fetches `/api/status`.

### T9 — Docs and release prep
- [ ] `PROTOCOL.md` (T3), `README.md`, and `CHANGELOG.md` under Unreleased.
- [ ] Consumer site:
      - new guide `guides/monitoring.mdx` covering `/status`, the
        dashboard, and running it next to a `Supervisor` or a systemd unit;
      - `reference/protocol.mdx`, `reference/cli.mdx`, `reference/rust-crate.mdx`;
      - a troubleshooting entry for "unresponsive".
- [ ] Maintainer site:
      - `architecture/transports.mdx` (recorder seam, D18);
      - new `architecture/dashboard.mdx`;
      - update the layer rules in `architecture/overview.mdx`;
      - the testing map.
- [ ] Add D16–D18 to `README.md`'s decision log.
- **Accept:** both sites build, and the link check is clean.

---

## Exit criteria

1. `/status` contract tests pass over both a socket and TCP, including dev
   mode (T3).
2. `Client::status()` is validated against the JSON Schema and the real
   binary (T4).
3. Dashboard e2e passes on macOS and Linux (T7). The install test runs the
   dashboard from a packed install (T8).
4. The recorder adds no measurable render overhead: within noise on the
   existing serve tests. Spot-check with
   `oha`/`autocannon` against `/render` with and without the recorder (target <2%
   p50 change); record numbers.
5. Docs updated; 0.4.0 ready to cut via the normal release runbook.

## Decisions (owner)

| # | Decision | Status |
|---|---|---|
| D16 | Dashboard is a separate `waavy dashboard` process, not a `serve` admin port | proposed |
| D17 | Dashboard UI technology (below) | **open** |
| D18 | `/status` excluded from the access log and render stats | proposed |

**D17 options**

- **A — plain HTML + one ES module, no framework (recommended).** Embedded
  as text in the binary, a few kB, no build step, nothing that depends on
  the user's React version. The page is mostly tables and two sparklines
  (inline SVG), so a framework adds little.
- **B — dogfood a waavy release (React SSR + hydrate).** Build the dashboard
  with `waavy build` during waavy's own build, embed the release in the
  binary, and render it with the in-process renderer. This exercises
  waavy's own path, but it needs embedded-release loading (`server/entry.js`
  is imported from disk today), adds React to every binary, and couples
  dashboard changes to the release ABI.

Option B is attractive as a demo. A good compromise: ship A, and later
add a `fixtures/`-style example dashboard built as a waavy release, as
documentation.

## Risks and notes

- **Single render thread.** `/status` is served on the same event loop, so a
  long synchronous render delays it. That's reported as `unresponsive`,
  not hidden. Snapshot computation must stay O(window), so the window is
  capped at 10,000 samples.
- **Memory.** Bounded: one window ring, 50 recent entries, 20 recent errors
  and a per-page map. The page map is bounded by the release's page count,
  since unknown page IDs are counted under `PAGE_NOT_FOUND` and not by page.
- **Privacy.** Error *messages* aren't recorded per request (the access log
  has only codes). Only `dev.lastError` carries a message, and it's a build
  error from the developer's own source.

## Implementation notes

_(filled in during implementation)_
