---
title: "Cleo: Overview"
description: "@bundt/cleo is a Claude extensions orchestrator for managing MCP server configurations."
---

# Cleo

**@bundt/cleo** is a Claude extensions orchestrator CLI. It manages, discovers, and runs Claude Code agents and MCP server configurations from your terminal.

## What It Does

Cleo provides a unified interface for working with Claude Code's MCP (Model Context Protocol) ecosystem:

- **Discover** extensions from the built-in registry
- **Install** MCP servers into your Claude Code configuration
- **Manage** server configurations across projects
- **Search** for extensions with fuzzy matching
- **Interactive mode** with a full terminal UI

## Quick Start

```bash
# Install globally
bun add -g @bundt/cleo

# Launch interactive mode
cleo

# Or use direct commands
cleo list
cleo search "database"
cleo install postgres-mcp
```

## Features

### Extension Registry

Cleo ships with a curated registry of MCP server extensions. Each extension includes metadata about capabilities, configuration options, and installation instructions.

```bash
# Browse all registered extensions
cleo list

# Search with fuzzy matching
cleo search "context"

# Get details about a specific extension
cleo info bcp-mcp-server
```

### Configuration Management

Cleo reads and writes Claude Code's MCP configuration files. It handles the JSON structure, validates entries, and prevents duplicate installations.

```bash
# Show current MCP configuration
cleo config show

# Add a server manually
cleo config add --name my-server --command "bun run server.ts"

# Remove a server
cleo config remove my-server
```

### Interactive Mode

Running `cleo` without arguments launches an interactive TUI powered by `@inquirer/prompts`:

- Browse extensions with arrow keys
- Search with real-time fuzzy filtering
- One-key installation
- Configuration preview before applying changes

<Callout variant="info">
  Cleo integrates with the Bit Context Protocol through `@bit-context-protocol/driver`. See the [BCP Integration](/cleo/bcp-integration) page for details.
</Callout>
