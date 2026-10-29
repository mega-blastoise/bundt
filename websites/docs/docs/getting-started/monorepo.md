---
title: Monorepo Structure
description: Understanding the Bundt monorepo layout and development workflow.
---

# Monorepo Structure

Bundt uses a Turborepo-managed monorepo. Here's the layout:

```
bundt/
├── apps/              # Deployable CLIs and applications
│   ├── cleo/          # @bundt/cleo — Claude extensions orchestrator
│   ├── dxdocs/        # @bundt/dxdocs — Static docs generator
│   └── ollama/        # @bundt/ollama — Local LLM management
├── packages/          # Publishable npm libraries
│   ├── prev/          # @bundt/prev — Agent-native UI framework
│   ├── signals/       # @bundt/signals — Reactive signal graph
│   ├── hateoas/       # @bundt/hateoas — React HATEOAS framework
│   └── waavy/         # @bundt/waavy — React SSR framework
├── internal/          # Private shared packages (not published)
│   └── shared/        # Cross-package types and utilities
├── websites/          # Marketing and documentation sites
├── turbo.json         # Turborepo task configuration
└── package.json       # Root workspace configuration
```

## Task Orchestration

Turborepo manages build order, caching, and parallel execution:

```bash
# Build all packages (cached, parallel)
bun run build

# Build a specific package
turbo run build --filter=@bundt/cleo

# Run all typechecks
bun run typecheck

# Run all tests
bun run test

# Clean all build artifacts
bun run clean
```

## Build Pattern

Apps with CLIs follow a standard structure:

```
apps/<name>/
├── build/
│   ├── base.ts        # Shared config (externals, Bun.build options)
│   ├── bun_.ts        # Bun-target build
│   └── node_.ts       # Node-target build (optional)
├── bin/
│   └── <name>.ts      # Bun entrypoint (#!/usr/bin/env bun)
├── src/
│   ├── cli.ts         # CLI entry (argument parsing)
│   └── index.ts       # Library entry
└── dist/              # Build output (gitignored)
```

Build scripts use `Bun.build()` directly. The `concurrent_build()` utility runs multiple targets in parallel.

## Contributing

1. Clone the repository
2. Run `bun install` from the root
3. Make changes to any package
4. Run `bun run build` to verify everything compiles
5. Run `bun run typecheck` for type checking
6. Run `bun run test` for the test suite

<Callout variant="info">
  The monorepo uses Bun workspaces. Running `bun install` from the root links all packages automatically.
</Callout>
