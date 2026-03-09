---
title: Installation
description: How to install and set up Bundt packages.
---

# Installation

All Bundt packages are published to npm under the `@bundt` scope. They require **Bun 1.3 or later**.

## Prerequisites

<Steps>
  <Step title="Install Bun">
    If you don't have Bun installed:

    ```bash
    curl -fsSL https://bun.sh/install | bash
    ```
  </Step>
  <Step title="Verify your Bun version">
    ```bash
    bun --version
    # Should output 1.3.x or later
    ```
  </Step>
</Steps>

## Installing Packages

Each package can be installed independently:

```bash
# CLI tools
bun add -g @bundt/cleo
bun add -g @bundt/dxdocs

# Libraries
bun add @bundt/prev
bun add @bundt/signals
```

<Callout variant="tip">
  CLI packages like `@bundt/cleo` and `@bundt/dxdocs` can be installed globally with `-g` for system-wide access, or locally as project dependencies.
</Callout>

## Bun Entrypoints

Every Bundt package ships with a Bun-optimized entrypoint. When running under Bun, the package resolves to source TypeScript via the `"bun"` export condition — no transpilation overhead.

```json
{
  "exports": {
    ".": {
      "bun": "./src/index.ts",
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts"
    }
  }
}
```

This means Bun consumers get direct TypeScript execution while Node.js consumers use the pre-built JavaScript output.

## Peer Dependencies

Some packages have peer dependencies:

| Package | Peer Dependencies |
|---------|-------------------|
| `@bundt/dxdocs` | `react`, `react-dom`, `@mdx-js/mdx`, `zod`, `shiki` |
| `@bundt/prev` | `react`, `react-dom` |
| `@bundt/signals` | None |
| `@bundt/cleo` | None |

Bun automatically installs peer dependencies, so you typically don't need to install them manually.
