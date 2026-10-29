---
title: "Cleo: Extension Registry"
description: How the Cleo extension registry works and how to add extensions.
---

# Extension Registry

The Cleo registry is a curated index of MCP server extensions that can be discovered and installed through the CLI.

## How It Works

The registry is a static dataset bundled with the `@bundt/cleo` package. Each entry describes an MCP server extension:

```typescript
type RegistryEntry = {
  name: string;
  description: string;
  command: string;
  args?: string[];
  env?: Record<string, string>;
  tags: string[];
  homepage?: string;
  repository?: string;
};
```

## Browsing the Registry

```bash
# List all available extensions
cleo list

# Search by keyword
cleo search "file"

# Get details on a specific extension
cleo info <name>
```

## Installing from the Registry

When you install a registry extension, Cleo:

1. Reads the extension's configuration template
2. Prompts for any required environment variables or settings
3. Writes the MCP server entry to your Claude Code configuration
4. Validates the resulting configuration

```bash
cleo install bcp-mcp-server
```

<Callout variant="tip">
  Use `cleo install --dry-run <name>` to preview what configuration changes will be made without applying them.
</Callout>

## Registry Structure

Extensions are organized by category:

| Category | Examples |
|----------|----------|
| AI / Context | BCP MCP server, context managers |
| Database | PostgreSQL, SQLite, Redis adapters |
| File System | File watchers, search indexers |
| Development | Linters, formatters, test runners |
| Integration | GitHub, Jira, Slack bridges |

## Adding Extensions

To propose a new extension for the registry, open a pull request to the [bundt repository](https://github.com/mega-blastoise/bundt) adding an entry to the registry data file in `apps/cleo/src/registry/`.

Each entry must include:
- A unique `name` (kebab-case)
- A clear `description`
- The `command` to start the server
- Relevant `tags` for discovery
