# Prompt: Waavy P4 — Static site generation

Paste this into a new Claude Code session started at the bundt repo root.

---

You're implementing Phase 4 of the waavy rewrite: `waavy ssg`, which renders
an explicit job list (`{ page, path, props, document }`) through the existing
renderer and writes a static site that hydrates.

Read, in order:
1. `CLAUDE.md`.
2. `.claude/specs/waavy/ARCHITECTURE.md` (§4 pages/releases/documents, §6 SSG).
3. `.claude/specs/waavy/WAAVY_P1_SLICE.md` — confirm its exit criteria are met (P4 only needs P1). Read the Implementation notes of every completed phase.
4. `.claude/specs/waavy/WAAVY_P4_SSG.md` (this phase's contract).

Working rules:
- Work on the current waavy branch (`waavy/r2` if P3 hasn't merged yet, otherwise a new `waavy/p4-ssg` from `develop`); commit per task (`waavy(p4): T<n> <summary>`). No push/PR/publish without asking.
- Don't add route discovery, loaders, or page-module exports beyond the default component — jobs are the only data source.
- Reuse `createRenderer`; don't add a second rendering path.
- Tick checkboxes and fill "Implementation notes"; update ARCHITECTURE.md (revision log) if anything changes.

Done means every exit criterion in `WAAVY_P4_SSG.md` holds.
