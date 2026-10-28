# Waavy specs

| File | What |
|---|---|
| `ARCHITECTURE.md` | Audit + target design (source of truth) |
| `WAAVY_P1_SLICE.md` / `WAAVY_P1_PROMPT.md` | Phase 1 — build → render → hydrate vertical slice |
| `WAAVY_P2_SERVE_RS.md` / `WAAVY_P2_PROMPT.md` | Phase 2 — `waavy serve` (HTTP) + Rust `Client` + axum example |
| `WAAVY_P3_DIST.md` / `WAAVY_P3_PROMPT.md` | Phase 3 — per-platform packages, release workflow, Supervisor, 0.3.0 |
| `WAAVY_P4_SSG.md` / `WAAVY_P4_PROMPT.md` | Phase 4 — `waavy ssg` from job lists |
| `spikes/` | Spike results recorded during phases (created by P1/P2) |

Order: P1 → P2 → P3. P4 needs only P1 and can run alongside P2/P3.

Start a phase by pasting its `_PROMPT.md` into a fresh session at the repo root.

## Decisions log

| # | Decision | Status |
|---|---|---|
| D1 | Warm transport is HTTP (unix socket or TCP) | accepted |
| D2 | Engine/CLI are Bun-only (compiled binary); `core` runtime-agnostic | accepted |
| D3 | Cache encryption | moot — caching deferred |
| D4 | waavy-rs moves to `crates/waavy` | accepted |
| D5 | Archive standalone repos after P3 publishes | accepted |
| D6 | Drop TanStack Query extension | accepted |
| D7 | First published version `@bundt/waavy` 0.3.0 | accepted |
| D8 | React bundled into the release server entry | accepted |
| D9 | Fragment mode deferred (likely first addition) | accepted |
| D10 | Rewrite in place on branch `waavy/r2` | accepted 2026-10-28 |
| D11 | Windows x64 experimental, TCP only, in 0.3.0 | accepted 2026-10-28 |
| D12 | React 19 only | accepted 2026-10-28 |
| D13 | Page CSS imports in P1 | accepted 2026-10-28 |
| D14 | Publish crate `waavy` to crates.io in P3 | accepted 2026-10-28 |
| D15 | musl binaries as GitHub release assets only | proposed (P3 spec) |
