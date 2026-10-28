# Prompt: Waavy P2 — Warm renderer over HTTP + Rust client

Paste this into a new Claude Code session started at the bundt repo root.

---

You're implementing Phase 2 of the waavy rewrite: `waavy serve` (HTTP over
unix socket / TCP) and the Rust client crate `crates/waavy`, proven with an
axum example.

Read, in order:
1. `CLAUDE.md`.
2. `.claude/specs/waavy/ARCHITECTURE.md` (esp. §5 host protocol and §9 satellites).
3. `.claude/specs/waavy/WAAVY_P1_SLICE.md` — confirm its exit criteria are met and read its Implementation notes and `spikes/P1_SPIKES.md`. If P1 isn't done, stop and say so.
4. `.claude/specs/waavy/WAAVY_P2_SERVE_RS.md` (this phase's contract).

Working rules:
- Branch `waavy/r2`; commit per task (`waavy(p2): T<n> <summary>`). No push/PR/publish without asking.
- Run the T4 streaming spikes early (right after T1). If an interrupted stream can't be made detectable by hyper, follow the spec's fallback (streaming marked experimental) and record it.
- `Client` must not spawn processes; the supervisor is P3. Never auto-retry a failed render; `Error::is_retryable()` is true only for connection errors.
- Rust: `cargo clippy -p waavy -- -D warnings` clean; use root workspace deps where they exist.
- PROTOCOL.md must describe observed behavior, not intended behavior — write it after the contract tests pass.
- Tick checkboxes and fill "Implementation notes" in the spec; update ARCHITECTURE.md (revision log) if the protocol changes.

Done means every exit criterion in `WAAVY_P2_SERVE_RS.md` holds. Finish with a report including the S3 latency numbers.
