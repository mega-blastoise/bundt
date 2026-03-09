---
title: "Cleo: CLI Reference"
description: Complete reference for all @bundt/cleo CLI commands and options.
---

# CLI Reference

## Global Options

```bash
cleo --help     # Show help
cleo --version  # Show version
```

## Commands

### `cleo` (no arguments)

Launches interactive mode with a full terminal UI for browsing and installing extensions.

### `cleo list`

Lists all extensions in the registry.

```bash
cleo list
```

Output includes the extension name, description, and installation status.

### `cleo search <query>`

Searches the registry using fuzzy matching powered by Fuse.js.

```bash
cleo search "database"
cleo search "context protocol"
```

The search matches against extension names, descriptions, and tags.

### `cleo install <name>`

Installs an extension into your Claude Code MCP configuration.

```bash
cleo install bcp-mcp-server
cleo install postgres-mcp
```

<Callout variant="tip">
  Cleo will prompt for any required configuration values (API keys, paths, etc.) during installation.
</Callout>

### `cleo info <name>`

Shows detailed information about a registry extension.

```bash
cleo info bcp-mcp-server
```

### `cleo config show`

Displays the current MCP server configuration.

```bash
cleo config show
```

### `cleo config add`

Manually adds an MCP server entry.

```bash
cleo config add \
  --name my-server \
  --command "bun run ./my-server.ts" \
  --args "--port 3000"
```

### `cleo config remove <name>`

Removes an MCP server from the configuration.

```bash
cleo config remove my-server
```

## Configuration Files

Cleo reads from and writes to Claude Code's standard configuration locations:

| Platform | Path |
|----------|------|
| macOS | `~/Library/Application Support/Claude/claude_desktop_config.json` |
| Linux | `~/.config/Claude/claude_desktop_config.json` |
| Project | `.claude/mcp.json` (project-scoped) |

Project-scoped configurations take precedence over global ones.

## Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Success |
| 1 | General error |
| 2 | Configuration file not found or invalid |
