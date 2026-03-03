<p align="center">
  <br>
  <br>
  <img alt="Bundt" src="https://img.shields.io/badge/bundt-developer_toolkits-f5a623?style=for-the-badge&labelColor=1a1a1a" height="40">
  <br>
  <br>
  <br>
</p>

<div align="center">

[![MIT licensed][license-badge]][license-url]
[![Build Status][ci-badge]][ci-url]
[![Bun][bun-badge]][bun-url]

</div>

## Bundt

**Bun Developer Toolkits** — a collection of high-quality developer tools for the modern JavaScript ecosystem, built on [Bun](https://bun.sh).

Bundt is a unified workspace of independently versioned tools that share a common philosophy: ship fast, stay lean, target Bun-first. Each package solves a specific problem well and can be used standalone or composed together.

## Philosophy

- **Bun-native**: Built for Bun's runtime, bundler, and test runner. Node.js compatibility where it makes sense, but Bun is the first-class target.
- **Minimal abstractions**: Every dependency and abstraction must justify its existence. Three lines of code are better than a premature abstraction.
- **Type-safe by default**: Strict TypeScript throughout. No `any`, no shortcuts.
- **Independent but composable**: Each package has its own version, its own release cycle, and zero coupling to siblings — but they're designed to work together.

## Tools & Packages

### Applications

| Package | Description | Install |
|---------|-------------|---------|
| [`@bundt/cleo`](apps/cleo) | Claude extensions orchestrator — manage, compose, and deploy MCP server configurations for Claude Code | `bun add -g @bundt/cleo` |
| [`@bundt/dxdocs`](apps/dxdocs) | Zero-JavaScript static documentation generator — Markdown/MDX to fast, accessible docs sites | `bun add -g @bundt/dxdocs` |
| [`@bundt/loclaude`](apps/loclaude) | Local LLM management CLI — run and manage local language models with a clean interface | `bun add -g @bundt/loclaude` |

### Libraries

| Package | Description | Install |
|---------|-------------|---------|
| [`@bundt/hateoas`](packages/hateoas) | React HATEOAS framework — hypermedia-driven API clients and server responses for React apps | `bun add @bundt/hateoas` |
| [`@bundt/waavy`](packages/waavy) | React SSR for non-JavaScript environments — stream server-rendered React to any backend | `bun add @bundt/waavy` |
| [`@bundt/signals`](packages/signals) | Signal graph abstractions — fine-grained reactivity primitives | _coming soon_ |

## Quick Start

### Cleo

Orchestrate Claude Code MCP server configurations:

```sh
bun add -g @bundt/cleo

# Initialize a new cleo workspace
cleo init

# List available extensions
cleo list

# Add an extension to your Claude config
cleo add @bundt/bcp-driver
```

### DxDocs

Generate a zero-JS documentation site from Markdown:

```sh
bun add -g @bundt/dxdocs

# Build docs from a content directory
dxdocs build ./docs

# Preview locally
dxdocs serve
```

### Hateoas

Build hypermedia-driven React applications:

```sh
bun add @bundt/hateoas
```

```tsx
import { HateoasProvider, useResource } from '@bundt/hateoas/react';
import { createClient } from '@bundt/hateoas/client';

const client = createClient({ baseUrl: '/api' });

function App() {
  return (
    <HateoasProvider client={client}>
      <UserProfile />
    </HateoasProvider>
  );
}

function UserProfile() {
  const { data, actions } = useResource('/users/me');
  return <div>{data.name}</div>;
}
```

### Waavy

Server-render React from any backend:

```sh
bun add @bundt/waavy react react-dom
```

```ts
import { renderToStream } from '@bundt/waavy/server';

Bun.serve({
  async fetch(request) {
    const stream = await renderToStream(<App url={request.url} />);
    return new Response(stream, {
      headers: { 'content-type': 'text/html' },
    });
  },
});
```

## Development

### Prerequisites

- [Bun](https://bun.sh) >= 1.3
- [Rust](https://rustup.rs) >= 1.85 _(optional, for crate development)_
- [mise](https://mise.jdx.dev) _(recommended — manages tool versions automatically)_

### Setup

```sh
git clone https://github.com/nicholasgriffintn/bundt.git
cd bundt

# Install tool versions (if using mise)
mise install

# Install dependencies
bun install

# Build everything
bun run build
```

### Commands

All commands are orchestrated by [Turborepo](https://turbo.build) with intelligent caching and parallel execution.

```sh
bun run build       # Build all packages
bun run typecheck   # Typecheck all packages
bun run test        # Run all tests
bun run lint        # Lint all packages
bun run clean       # Remove all build artifacts
bun run dev         # Start development mode
```

### Working on a Single Package

Scope any command to a specific package:

```sh
turbo run build --filter=@bundt/cleo
turbo run test --filter=@bundt/hateoas
```

### Workspace Structure

```
bundt/
  apps/                   Deployable CLIs and applications
    cleo/                 Claude extensions orchestrator
    dxdocs/               Static documentation generator
    loclaude/             Local LLM management CLI
  packages/               Publishable npm libraries
    hateoas/              React HATEOAS framework
    waavy/                React SSR framework
    signals/              Signal graph abstractions
  crates/                 Rust crates (Cargo workspace)
  internal/               Private shared packages
    shared/               Cross-package types and utilities
```

### Adding a New Package

1. Create a directory in `apps/` (for CLIs) or `packages/` (for libraries)
2. Add a `package.json` with `"name": "@bundt/<name>"`
3. Add a `tsconfig.json` extending `../../tsconfig.json`
4. Add `build`, `typecheck`, `test`, and `clean` scripts
5. Run `bun install` from root to link the workspace

## Versioning & Releases

Each package is versioned independently and published to npm under the `@bundt` scope. Git tags follow the convention `@bundt/<name>@<version>`.

## Related Projects

- **[Bit Context Protocol](https://github.com/nicholasgriffintn/bit-context-protocol)** — LLM context protocol consumed by Cleo as an external dependency (`@bit-context-protocol/*`)

## Contributing

Contributions are welcome. Please open an issue to discuss significant changes before submitting a PR.

```sh
# Fork and clone
bun install
bun run typecheck   # Verify types
bun run test        # Run tests
```

## License

[MIT](./LICENSE)

[license-badge]: https://img.shields.io/badge/license-MIT-blue.svg
[license-url]: https://github.com/nicholasgriffintn/bundt/blob/main/LICENSE
[ci-badge]: https://github.com/nicholasgriffintn/bundt/actions/workflows/ci.yml/badge.svg?event=push&branch=main
[ci-url]: https://github.com/nicholasgriffintn/bundt/actions/workflows/ci.yml?query=event%3Apush+branch%3Amain
[bun-badge]: https://img.shields.io/badge/Bun-%23000000.svg?logo=bun&logoColor=white
[bun-url]: https://bun.sh
