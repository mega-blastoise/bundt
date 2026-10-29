# @bundt/cleo

Claude extensions orchestrator. Manage, discover, install, and run Claude Code agents and skills from the command line.

> **Status:** Pre-release (0.1.0). Core CLI, agent lifecycle, task runner, TUI, and BCP integration are implemented. Registry is scaffolded but not yet live.

## Install

```bash
# Global install (recommended)
bun add -g @bundt/cleo

# Or run directly
bunx @bundt/cleo
```

## Features

- **Agent lifecycle management** — Install, uninstall, validate, and rollback agents and skills with full history tracking
- **Headless task runner** — Run tasks through Claude Code with structured JSON output, cost tracking, and token reporting
- **Interactive task builder** — Build token-efficient context from files, command output, and documents with priority-based BCP encoding
- **Fuzzy search** — Search local and registry agents/skills with deep body matching via Fuse.js
- **Interactive TUI** — Full terminal UI for managing multiple concurrent Claude Code sessions with vim-style navigation
- **BCP integration** — First-class Bit Context Protocol support for token-efficient context delivery
- **Task templates** — Save and reuse task definitions; batch-dispatch multiple templates from the TUI
- **Qualified names** — Namespace/name:tag@version addressing for agents and skills (ADR-001)
- **Skill authoring** — Scaffold, validate, and submit skills to the registry

## Commands

### Task Execution

```bash
# Run a task through Claude Code (headless, structured output)
cleo run "refactor auth module to use functional patterns"
cleo run --model claude-opus-4-6 --max-budget 2.00 "implement the spec"

# Run with BCP context (token-efficient binary context)
cleo run --bcp ./project-context.bcp --budget 8000 "implement feature X"

# Interactive task builder — gather files, commands, docs, then execute
cleo task "fix the failing tests"
cleo task --dry-run "explore the codebase"

# Task templates
cleo task --save my-review          # Save current task as a template
cleo task --template my-review      # Reload a saved template
cleo task --list                    # List saved templates
cleo task --list --global           # List global templates (~/.claude/tasks/)
```

### Agent Management

```bash
# Discover agents
cleo list                           # List available agents (bundled, global, local)
cleo info <agent>                   # Show agent details and frontmatter
cleo search "code review"           # Search for agents and skills
cleo search --deep --type skill "testing"  # Fuzzy body search, filter by type

# Install/uninstall
cleo install code-reviewer          # Install to .claude/agents/
cleo install --global code-reviewer # Install to ~/.claude/agents/
cleo uninstall code-reviewer        # Remove agent and orphaned skills

# Scaffold new agents and skills
cleo init my-agent -d "My custom agent" -t "Read,Write,Bash"
cleo create-skill my-skill -d "Reusable skill for X"

# Validate structure and references
cleo validate                       # Validate all local agents
cleo validate my-agent --global     # Validate specific global agent
```

### Configuration & History

```bash
# Configuration
cleo config get registry.url
cleo config set registry.url https://registry.example.com
cleo config --global get theme

# History and rollback
cleo history                        # View recent operations
cleo history --action install -l 10 # Filter by action, limit results
cleo history --id <event-id> --detail  # Show full event details
cleo rollback my-agent              # Restore to previous snapshot
cleo rollback my-agent --to <id> --dry-run  # Preview rollback
```

### Interactive TUI

```bash
cleo tui
```

The TUI provides a multi-session terminal interface for Claude Code:

| Key | Action |
|-----|--------|
| `n` | New session (with model/agent/template selection) |
| `D` | Dispatch — batch-launch multiple task templates |
| `j/k` | Navigate sessions (sidebar) or scroll output (main) |
| `i` | Enter chat mode (send follow-up to waiting session) |
| `d` | Kill running session |
| `x` | Dismiss completed session |
| `t` | Cycle color theme |
| `Tab` | Toggle focus between sidebar and main panel |
| `1-9` | Jump to session by number |
| `?` | Help |
| `q` | Quit (confirms if sessions are running) |

The TUI supports `Ctrl+T` in the new-session modal to pick from saved task templates, which auto-populates the prompt, model, and BCP context.

## Agent Frontmatter Schema

Agents are Markdown files with YAML frontmatter:

```markdown
---
name: code-reviewer
description: Reviews code changes for quality, patterns, and bugs
tools:
  - Read
  - Bash
  - Grep
  - Glob
model: claude-sonnet-4-6
skills:
  - typescript-patterns
  - testing-standards
namespace: bundt
version: 1.0.0
tag: latest
---

Your agent system prompt goes here...
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | yes | Kebab-case agent name |
| `description` | string | yes | What the agent does |
| `tools` | string[] | yes | Claude Code tools this agent uses |
| `model` | string | no | Preferred model |
| `skills` | string[] | no | Referenced skill directories |
| `namespace` | string | no | Registry namespace (default: `_`) |
| `version` | string | no | Semver version |
| `tag` | string | no | Distribution tag (default: `latest`) |
| `deprecated` | string \| boolean | no | Deprecation notice |

## BCP Integration

Cleo is a first-class consumer of the [Bit Context Protocol](https://github.com/mega-blastoise/bit-context-protocol). When a `.bcp` file is provided via `--bcp`, Cleo:

1. Validates the file via `driver.validate()`
2. Inspects block count and total size via `driver.inspect()`
3. Decodes with adaptive verbosity when `--budget` is set (low-priority blocks are summarized to fit)
4. Injects the decoded context into Claude Code's system prompt as `<bcp-context>...</bcp-context>`

The `cleo task` command builds BCP context programmatically using the Context Builder API — gathering source files, command output, and documents with priority levels, then encoding them into a `.bcp` stream.

## Structured Output

`cleo run` uses Claude Code's `--json-schema` mode to enforce structured responses:

```typescript
{
  summary: string;        // Brief summary of what was done
  filesChanged: string[]; // Absolute paths of files created/modified/deleted
  errors: string[];       // Any errors encountered (empty if none)
}
```

Token usage, cost, and duration are reported after each run.

## Architecture

```
apps/cleo/
  src/
    cli.ts                  CLI entry — 14 commands via cac
    schema.ts               Structured output schema (Zod 4)
    types.ts                Qualified names, frontmatter schemas, validation types
    prompt.ts               System prompt template
    helpers.ts              File system helpers, agent loading
    ui.ts                   Terminal output helpers (picocolors)

    commands/               Command implementations
      run.ts                Headless task runner (spawns claude CLI)
      task.ts               Interactive task builder
      list.ts, info.ts      Agent discovery
      install.ts            Agent + skill installation with history recording
      uninstall.ts          Removal with orphan skill cleanup
      search.ts             Fuzzy search (Fuse.js)
      init.ts               Agent scaffolding
      create-skill.ts       Skill scaffolding
      validate.ts           Structure validation
      config.ts             Key-value config management
      history.ts            Operation history viewer
      rollback.ts           Snapshot restoration
      submit.ts             Registry submission

    task/                   Task builder subsystem
      gather.ts             Interactive context gathering (inquirer)
      execute.ts            BCP assembly + Claude execution
      review.ts             Pre-execution context review
      schema.ts             Task definition types
      templates.ts          Template save/load

    tui/                    Interactive terminal UI
      index.ts              Event loop + key handling
      render.ts             ANSI rendering
      session.ts            Claude Code process management
      state.ts              Application state
      terminal.ts           Raw mode + ANSI helpers
      keys.ts               Key parsing
      themes.ts             Color theme cycling
      tasks.ts              Template integration
      workflows.ts          Multi-step workflows

    integrations/
      bcp.ts                BCP driver integration

    registry/               Agent/skill registry (scaffolded)
      index.ts, schemas.ts, search.ts, submit.ts

    history/                Operation history
      db.ts                 SQLite-backed event store
      recorder.ts           Event recording
```

## Requirements

- [Bun](https://bun.sh) v1.3+
- [Claude Code](https://docs.anthropic.com/en/docs/claude-code) CLI installed and authenticated
- Optional: `bcp` binary for BCP context support (`cargo install bcp-cli`)

## License

MIT
