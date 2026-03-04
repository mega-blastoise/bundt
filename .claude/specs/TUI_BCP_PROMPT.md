# Prompt for Next Session

Read the spec at `.claude/specs/TUI_BCP_INTEGRATION.md` — it describes the current state of `cleo tui` and the planned integration with BCP context and task templates.

The TUI lives at `apps/cleo/src/tui/` and the task system at `apps/cleo/src/task/`. The BCP driver is at `/home/nicks-dgx/dev/.RFCs/bit-context-protocol/packages/driver/` (linked via overrides in root package.json).

Implement the BCP/task integration into the TUI following the spec's implementation order:

1. Add `bcpContext?: string` and `templateName?: string` to the `Session` interface in `tui/types.ts`. Wire `--append-system-prompt` in `tui/session.ts` when `bcpContext` is present.

2. Create `tui/tasks.ts` — loads task templates from `.cleo/tasks/` and `~/.claude/tasks/`, uses `@bit-context-protocol/driver`'s `createContextBuilder` to assemble and decode BCP context from a template's file/command/document definitions.

3. Add a template picker modal to the new-session flow — `Ctrl+T` in the new-session modal opens a template list. Selecting a template populates the prompt, model, and prepares BCP context.

4. Add a batch dispatch modal — new `'dispatch-tasks'` modal with multi-select for launching multiple template-based sessions in parallel.

5. Add workflow definitions — sequential/parallel task chains where completed steps can feed context into subsequent steps.

Read the existing code before making changes. Match existing patterns exactly. Typecheck with `bun run typecheck` when done.
