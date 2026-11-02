# Prompt: Waavy P5 — `/status` and `waavy dashboard`

Paste this into a new Claude Code session started at the bundt repo root.

---

You're implementing Phase 5 of waavy: a `GET /status` snapshot on
`waavy serve`, `Client::status()` in the Rust crate, and a separate
`waavy dashboard` command that serves a live local page over it.

Read, in order:
1. `CLAUDE.md`.
2. `.claude/specs/waavy/ARCHITECTURE.md` (§5 serve/transport, layer rules).
3. `websites/waavy-maintainers/docs/architecture/transports.mdx` and
   `known-issues.mdx` (Bun `node:http` behaviours you must respect).
4. `.claude/specs/waavy/WAAVY_P5_STATUS.md` (this phase's contract). D17 is
   decided: the dashboard page is plain HTML plus one ES module, with no
   framework.

Working rules:
- Branch `waavy/p5-status` from `main`. Commit per task
  (`waavy(p5): T<n> <summary>`). Don't push, open a PR, or publish without
  asking.
- Collect stats only behind the `Logger` seam. Don't add counters inside the
  request handler.
- Never put request props, bodies or rendered HTML into `/status` or the
  dashboard.
- Keep the change additive: `PROTOCOL_VERSION` stays 1.
- Tick checkboxes, fill in "Implementation notes", and move the matching
  kanban cards (project `bundt`, label `p5`) as tasks land.

Done means every exit criterion in `WAAVY_P5_STATUS.md` holds.
