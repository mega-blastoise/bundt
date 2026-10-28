# Prompt: Waavy P1 — Vertical slice

Paste this into a new Claude Code session started at the bundt repo root.

---

You're implementing Phase 1 of the waavy rewrite in the bundt monorepo
(`packages/waavy`, package `@bundt/waavy`).

Read, in order, before writing code:
1. `CLAUDE.md` (repo conventions: no enums, no default exports, no `any`, `import type`, Bun + turbo).
2. `.claude/specs/waavy/ARCHITECTURE.md` (target design, r2).
3. `.claude/specs/waavy/WAAVY_P1_SLICE.md` (this phase's task list; it is the contract).

Working rules:
- Work on branch `waavy/r2` (create it from `develop` if it doesn't exist). Commit per task (`waavy(p1): T<n> <summary>`). Do not push, open PRs, or publish anything without asking.
- Do T1, then the T2 spikes **before** anything else. If S1 (Bun.build inside a compiled binary) or S3 (compiled binary importing a release that bundles React) fails, stop and report with the evidence and the fallback the spec defines.
- Tick task checkboxes in the spec as you finish them. Record every deviation, surprise, or follow-up under "Implementation notes" in the spec, and update ARCHITECTURE.md (with a revision-log line) if a design point changes.
- Out of scope for P1: `serve`, `--dev`, Rust, cross-platform packaging, SSG, caching, loaders. Don't build ahead.
- Only the default export of page modules and `waavy.config.ts` may use `export default` (generated code may too).
- Run `turbo run build typecheck test --filter=@bundt/waavy` and `test:e2e` before declaring a task done; report failures with output instead of working around them.

Done means every exit criterion in `WAAVY_P1_SLICE.md` holds. Finish with a short report: what was built, test results, spike outcomes, open follow-ups.
