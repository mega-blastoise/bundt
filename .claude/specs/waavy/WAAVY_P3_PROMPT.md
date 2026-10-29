# Prompt: Waavy P3 — Distribution and 0.3.0 release

Paste this into a new Claude Code session started at the bundt repo root.

---

You're implementing Phase 3 of the waavy rewrite: per-platform npm packages,
the launcher, install tests, the CI matrix, the waavy release workflow, the
Rust `Supervisor`, and the 0.3.0 release of `@bundt/waavy` and crate `waavy`.

Read, in order:
1. `CLAUDE.md`.
2. `.claude/specs/waavy/ARCHITECTURE.md` (§8 build & distribution, §9, §13 decisions).
3. P1 and P2 specs and their Implementation notes — confirm both phases' exit criteria are met; if not, stop and say so.
4. `.claude/specs/waavy/WAAVY_P3_DIST.md` (this phase's contract).

Working rules:
- Branch `waavy/r2`; commit per task (`waavy(p3): T<n> <summary>`).
- **Everything outward-facing needs explicit approval at the moment you do it**: pushing, opening/merging PRs, creating tags, publishing to npm or crates.io, creating GitHub releases, archiving repos, closing PRs, `npm deprecate`. Prepare each step, show what will happen, and wait.
- Validate the release workflow with the `workflow_dispatch` dry run on an `rc` version before proposing the real tag.
- Check the owner prerequisites listed in the spec (tokens/secrets) and ask for anything missing rather than working around it.
- Windows is experimental: its CI steps use `continue-on-error`; don't spend effort beyond the smoke test.
- Tick checkboxes and fill "Implementation notes".

Done means every exit criterion in `WAAVY_P3_DIST.md` holds.
