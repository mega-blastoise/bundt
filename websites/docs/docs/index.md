---
title: Introduction
description: Bundt is a collection of developer tools built for the Bun runtime. All TypeScript. All fast. All MIT licensed.
---

# Bundt

Bundt is a monorepo of TypeScript developer tools targeting the **Bun runtime**. Every package is independent, versioned separately, and published to npm under the `@bundt` scope.

## Packages

<CardGrid>
  <Card title="@bundt/cleo" icon="terminal" href="/cleo/overview">
    Claude extensions orchestrator. Manage, discover, and run Claude Code agents and MCP server configurations.
  </Card>
  <Card title="@bundt/dxdocs" icon="book-open" href="/dxdocs/overview">
    Beautiful documentation sites from MDX. Zero client JavaScript, pure static HTML with syntax highlighting.
  </Card>
  <Card title="@bundt/prev" icon="layers" href="/prev/overview">
    Agent-native dynamic UI framework. Server-composed streaming React SSR with fragment-based micro-frontends.
  </Card>
  <Card title="@bundt/signals" icon="zap" href="/signals/overview">
    Reactive signal graph abstractions. Signals, computed values, and effects with automatic dependency tracking.
  </Card>
</CardGrid>

## Quick Start

Install any package with Bun:

```bash
bun add @bundt/cleo
bun add @bundt/dxdocs
bun add @bundt/prev
bun add @bundt/signals
```

## Design Principles

- **Bun-native** — every package targets the Bun runtime and leverages its APIs for maximum performance
- **TypeScript-first** — strict mode, no `any` types, full type inference
- **Zero unnecessary dependencies** — each package ships only what it needs
- **Independently versioned** — packages follow semantic versioning and are released on their own cadence
- **MIT licensed** — use them however you want

## Ecosystem

Bundt integrates with the [Bit Context Protocol](https://docs.bitcontextprotocol.com) for AI-native context management. The `@bundt/cleo` CLI includes first-class BCP support through the `@bit-context-protocol/driver` package.
