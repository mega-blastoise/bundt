# TUI + BCP/Task Integration — Spec

## Context

The `cleo tui` is a full-screen terminal UI for managing multiple parallel Claude Code sessions. It lives at `apps/cleo/src/tui/` in the bundt monorepo. The TUI's purpose is **orchestration** — dispatching, monitoring, and lightly steering multiple Claude sessions, not deep interactive conversation.

`cleo task` (at `apps/cleo/src/task/`) is an interactive context-gathering system that assembles BCP (Bit Context Protocol) blocks — files, commands, documents — into a structured, prioritized, budget-aware context payload. It uses `@bit-context-protocol/driver` (at `/home/nicks-dgx/dev/.RFCs/bit-context-protocol/packages/driver/`) which supports both CLI and WASM backends.

## The Integration Idea

Instead of typing ad-hoc prompts into the TUI's new-session modal, users should be able to:

1. **Launch sessions from saved task templates** — `cleo task` already supports saving/loading templates (`.cleo/tasks/*.json`). The TUI should let users pick a template from a list, which pre-fills the prompt AND pre-loads structured BCP context.

2. **Dispatch task templates in parallel** — Select multiple templates and launch them simultaneously. Example: "run the test-writer template on these 3 packages in parallel."

3. **Context-aware session creation** — When creating a new session, optionally attach BCP context blocks (files, git diffs, docs) that get encoded and injected via `--system-prompt` or `--append-system-prompt`. This is the "gather light" mode — not the full interactive `cleo task` flow, but a quick picker.

4. **Template-driven workflows** — A "workflow" is a sequence of task templates with dependencies. Example: "run spec-review first, then when it completes, launch implementation using its output as context." This is the orchestrator pattern.

## Architecture

### Current State

```
apps/cleo/src/
  tui/
    index.ts          # Main loop, key handling
    render.ts         # Full-screen rendering (themed)
    session.ts        # Claude process management (launch, follow-up via --resume, kill)
    state.ts          # App state, session creation
    types.ts          # Session, AppState, stream-json event types
    keys.ts           # Raw stdin key parsing
    terminal.ts       # ANSI escape codes, terminal control
    themes.ts         # 4 themes (dark, catppuccin, gruvbox, nord)
  task/
    schema.ts         # Zod schemas for TaskDefinition
    gather.ts         # Interactive context gathering (@inquirer/prompts)
    execute.ts        # BCP context assembly + Claude execution
    review.ts         # Pretty-print task summary
    templates.ts      # Save/load task templates to .cleo/tasks/
  commands/
    task.ts           # CLI command orchestrating gather → review → save → execute
  integrations/
    bcp.ts            # BCP driver wrapper (prepareBcpContext, createContext, buildAndDecodeContext)
```

### Key Files in BCP Driver

```
/home/nicks-dgx/dev/.RFCs/bit-context-protocol/packages/driver/src/
  index.ts            # createDriver() factory (auto-detects WASM > CLI)
  context.ts          # createContextBuilder() — fluent API for assembling BCP blocks
  types.ts            # BcpDriver interface, OutputMode, DriverConfig
  manifest.ts         # Block type interfaces (CodeBlock, DocumentBlock, etc.)
  backends/
    wasm.ts           # WASM backend (no binary needed)
    cli.ts            # CLI backend (shells out to `bcp` binary)
```

### Proposed New Files

```
apps/cleo/src/tui/
  tasks.ts            # Task template loading, BCP context preparation for TUI
  workflows.ts        # Workflow definition and execution (sequential/parallel task chains)
```

### Session Launch with BCP Context

Current session launch in `session.ts`:
```typescript
const args = [claude, '--print', '--output-format', 'stream-json', '--verbose',
  '--model', session.model, '--permission-mode', 'acceptEdits'];
if (session.agent) args.push('--agent', session.agent);
args.push(session.prompt);
```

With BCP integration, a session can optionally carry decoded BCP context:
```typescript
if (session.bcpContext) {
  args.push('--append-system-prompt', session.bcpContext);
}
```

The `bcpContext` is produced by:
1. Loading a task template's block definitions
2. Reading the referenced files/commands
3. Encoding to BCP with the driver's ContextBuilder
4. Decoding with a token budget to get the rendered text

### Task Template Schema (existing)

```typescript
// From apps/cleo/src/task/schema.ts
const taskDefinitionSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().min(1),          // becomes the prompt
  files: z.array(taskFileSchema).default([]),
  commands: z.array(taskCommandSchema).default([]),
  documents: z.array(taskDocumentSchema).default([]),
  budget: z.number().positive().optional(), // token budget for BCP rendering
  model: z.string().default('claude-sonnet-4-6'),
  maxBudgetUsd: z.number().positive().optional(),
});
```

### TUI Integration Points

1. **New-session modal enhancement** — Add a `[Ctrl+T]` hotkey to browse/pick task templates instead of typing a prompt. Selected template populates prompt + model + agent + BCP context.

2. **Session type field** — `Session` gains `bcpContext?: string` and `templateName?: string` fields.

3. **Batch dispatch modal** — New modal (`'dispatch-tasks'`) that shows template list with multi-select. Enter launches all selected as parallel sessions.

4. **Sidebar indicators** — Sessions launched from templates show a `T` badge or template name.

5. **Workflow mode** — A workflow definition (JSON or code) describes:
   ```typescript
   interface Workflow {
     name: string;
     steps: WorkflowStep[];
   }
   interface WorkflowStep {
     template: string;
     dependsOn?: string[];    // step names that must complete first
     contextFrom?: string[];  // inject output from these steps as additional context
   }
   ```
   The TUI tracks workflow progress and auto-launches next steps when dependencies complete.

## Key Design Decisions

- **BCP context goes into `--append-system-prompt`** rather than `--system-prompt` to preserve Claude Code's default system prompt
- **Token budget defaults to adaptive** — the BCP driver's adaptive mode prioritizes high-priority blocks
- **Templates are loaded at TUI startup** — scan `.cleo/tasks/` and `~/.claude/tasks/` once, refresh on `R` key
- **WASM backend preferred** — no `bcp` binary dependency for context encoding/decoding
- **Follow-ups via `--resume` inherit context** — the BCP context from the initial system prompt persists across turns

## Implementation Order

1. Add `bcpContext` to Session type and wire `--append-system-prompt` in launch
2. Create `tui/tasks.ts` — load templates, prepare BCP context
3. Add template picker modal to new-session flow (Ctrl+T)
4. Add batch dispatch modal
5. Add workflow definitions and sequential execution
6. Sidebar template badges

## Dependencies

- `@bit-context-protocol/driver` — linked via overrides in root package.json:
  ```json
  "overrides": {
    "@bit-context-protocol/driver": "file:///home/nicks-dgx/dev/.RFCs/bit-context-protocol/packages/driver"
  }
  ```
- `cleo` already has this dependency in its package.json

## Current TUI Feature Set (for reference)

- Multi-session management with live stream-json output parsing
- Follow-up messages via `--resume <session-id>`
- 4 themed UIs (dark, catppuccin, gruvbox, nord) with distinct borders, icons, selection styles
- Gradient accent bar, scrollbar, modal system
- Model selection (Tab cycles in new-session modal)
- Agent selection (Shift+Tab opens agent picker, agents discovered from session init events)
- Session dismissal (x), kill (d), rename (/), jump (1-9)
- Focus-aware scrolling (sidebar: nav sessions, main: scroll output)
- Help modal with color swatches
