# Bundt

Bun Developer Toolkits — a monorepo of TypeScript/Rust developer tools targeting the Bun runtime.

## Quick Reference

```sh
bun run build       # turbo run build (all packages, cached)
bun run typecheck   # turbo run typecheck
bun run test        # turbo run test
bun run clean       # turbo run clean
```

Scope to one package: `turbo run build --filter=@bundt/cleo`

## Workspace Layout

```
apps/          Deployable CLIs and applications (published with bin entries)
packages/      Publishable npm libraries
crates/        Rust crates (Cargo workspace, currently empty)
internal/      Private shared packages (not published to npm)
```

## Packages

| Location | npm | What it does |
|----------|-----|-------------|
| `apps/cleo` | `@bundt/cleo` | Claude extensions orchestrator CLI — manages MCP server configs |
| `apps/dxdocs` | `@bundt/dxdocs` | Zero-JS static docs generator from Markdown/MDX |
| `apps/ollama` | `@bundt/ollama` | Local LLM management CLI (Ollama + Claude Code) |
| `packages/hateoas` | `@bundt/hateoas` | React HATEOAS framework (client, server, protocol, react) |
| `packages/waavy` | `@bundt/waavy` | React SSR for non-JavaScript server environments |
| `packages/signals` | `@bundt/signals` | Signal graph abstractions (placeholder, not yet implemented) |
| `internal/shared` | `@bundt/internal-shared` | Cross-package types and utilities (private, populate on observed duplication only) |

## Architecture & Conventions

### TypeScript

- **Strict mode** everywhere: `noImplicitAny`, `noUncheckedIndexedAccess`, `noImplicitOverride`
- **`verbatimModuleSyntax`** enabled — use `import type` for type-only imports
- **No `any`** — use `unknown` with type guards or explicit interfaces
- **No `enum`** — use `as const` objects or union types
- **No default exports** — named exports only (except config files like `build/base.ts`)
- **No `.js` extensions** in TypeScript imports
- **`jsx: react-jsx`** — automatic JSX runtime, no React import needed
- **`types: ["bun"]`** in root tsconfig — packages needing Node types add `@types/node` locally

### Build Pattern

Apps with CLIs follow a standard build structure:

```
apps/<name>/
  build/
    base.ts        # Shared config (external deps list, common Bun.build options)
    bun_.ts        # Bun-target build (calls Bun.build)
    node_.ts       # Optional Node-target build
  bin/
    <name>.ts      # Bun entrypoint (#!/usr/bin/env bun)
    <name>.mjs     # Node shim (detects Bun, falls back gracefully)
  src/
    cli.ts         # CLI entry (argument parsing)
    index.ts       # Library entry
  dist/            # Build output (gitignored)
```

Build scripts use `Bun.build()` directly. The `concurrent_build()` utility in `build/utils.ts` runs multiple targets in parallel.

Libraries (`packages/`) may use source-level exports (like hateoas) or compiled output (like waavy).

### Dependencies

- **Bun** is the runtime, package manager, bundler, and test runner
- **Turborepo** orchestrates tasks across the workspace
- **Zod 4** for validation schemas (dxdocs, cleo)
- **cac** for CLI argument parsing (cleo, ollama, waavy)
- **picocolors** for terminal colors
- **debug** for debug logging (waavy)

### External Dependencies

- **Bit Context Protocol** (`@bit-context-protocol/*`) — consumed as published npm packages, NOT part of this workspace
- For local BCP development, add `overrides` to root `package.json`

## Package-Specific Notes

### cleo (`apps/cleo`)

- CLI for managing Claude Code MCP server configurations
- Has a registry system for discovering/installing extensions
- Uses `@inquirer/prompts` for interactive mode, `fuse.js` for fuzzy search
- Build produces: `dist/cleo.bun.js` (Bun) + `dist/cleo.js` (Node)
- Release scripts in `scripts/` (bump.sh, tag.sh, prerelease-check.sh, release-commit.sh)

### dxdocs (`apps/dxdocs`)

- Static site generator: Markdown/MDX -> HTML with zero client JS
- Zod 4 schema for configuration (`src/config/schema.ts`)
- Theme system in `src/theme/`
- Build produces: `dist/index.bun.js` (lib) + `dist/cli.bun.js` (CLI) + CSS copied to dist
- Peer depends on `zod@^4.0.0`

### ollama (`apps/ollama`)

- Local LLM management CLI — run Claude Code with Ollama models
- CLI binary: `ollama-bundt` (avoids conflict with Ollama's own `ollama` binary)
- Config paths: `.ollama-bundt/config.json`, `~/.config/ollama-bundt/config.json`
- Manages local LLM processes via `child_process` spawn
- Needs `@types/node` in devDeps for cross-runtime type resolution
- Tests excluded from tsconfig (run separately via `bun test`)

### hateoas (`packages/hateoas`)

- Multi-entry library: `./`, `./server`, `./client`, `./react`, `./protocol`
- Multi-entry build: `dist/index.js`, `dist/server.js`, `dist/client.js`, `dist/react.js`, `dist/protocol.js`
- 42 tests across 4 test files
- No external dependencies beyond React (peer)

### waavy (`packages/waavy`)

- Most complex package — React SSR framework with CLI, server, and build tooling
- Path aliases: `@/*` -> `./src/*`, `@pkg/config` -> `./config/config.ts`, `@pkg/metadata` -> `./package.json`
- Has cross-platform executable building (`build/utils/executable.ts`)
- Server.ts is WIP — uses simplified Bun.serve types with `@ts-expect-error` suppression
- Known issues documented in `.claude/specs/FAST_FOLLOWS.md` (12 items)
- Uses both `commander` and `cac` (dual dep to be resolved)
- Uses both `debug` and `printf` for logging (to be unified)

### signals (`packages/signals`)

- Placeholder only — `src/index.ts` with a comment. Not yet implemented.

## Adding a New Package

1. Create directory in `apps/` (CLI/server) or `packages/` (library)
2. Add `package.json` with `"name": "@bundt/<name>"`, `"type": "module"`
3. Add `tsconfig.json` extending `../../tsconfig.json`
4. Add `build`, `typecheck`, `test`, `clean` scripts
5. Run `bun install` from root to link workspaces

## Release

Each package is versioned independently. Git tags follow `@bundt/<name>@<version>`.
All packages publish to npm under the `@bundt` scope.

## Known Issues & Fast Follows

See `.claude/specs/FAST_FOLLOWS.md` for the comprehensive list of 12 prioritized work items including:
- Waavy code quality fixes (enums, default exports, dual deps)
- Common build tooling extraction
- Release pipeline
- BCP driver integration for cleo
- Documentation site
- ~~loclaude rebrand~~ (done — now `@bundt/ollama`)
- CI/CD setup
