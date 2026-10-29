---
title: "Cleo: BCP Integration"
description: How Cleo integrates with the Bit Context Protocol for AI-native context management.
---

# BCP Integration

Cleo includes first-class integration with the [Bit Context Protocol](https://bitcontextprotocol.com) through the `@bit-context-protocol/driver` package.

## What is BCP?

The Bit Context Protocol is a binary wire format for structured context delivery to AI systems. It defines 11 semantic block types with priority-based rendering, enabling efficient context packing within token budgets.

## How Cleo Uses BCP

Cleo uses BCP for:

- **Context-aware extension discovery** — extensions can declare their context requirements using BCP block types
- **MCP server communication** — the BCP MCP server (`@bit-context-protocol/mcp`) provides BCP encoding/decoding as MCP tools
- **Agent orchestration** — when running Claude Code agents, Cleo can package project context using BCP's priority system

## Installing the BCP MCP Server

```bash
cleo install bcp-mcp-server
```

This adds the BCP MCP server to your Claude Code configuration, giving Claude access to BCP encoding, decoding, and context management tools.

## BCP Block Types

BCP defines 11 semantic block types:

| Block | Type | Use Case |
|-------|------|----------|
| 0x01 | Code | Source code with language and path |
| 0x02 | Conversation | Chat turns with role |
| 0x03 | FileTree | Directory structure |
| 0x04 | ToolResult | Tool/MCP output with status |
| 0x05 | Document | Prose content (markdown/plain/html) |
| 0x06 | StructuredData | Tables, JSON, YAML, TOML, CSV |
| 0x07 | Diff | Code changes with hunks |
| 0x08 | Annotation | Metadata overlay (priority/summary/tag) |
| 0x09 | EmbeddingRef | Vector reference |
| 0x0A | Image | Image data or URI |
| 0xFE | Extension | User-defined block types |

## Priority Levels

Each block carries a priority level (0-255) that determines rendering order when context must be truncated to fit token budgets:

- **0-63**: Critical — always included
- **64-127**: High — included unless severely constrained
- **128-191**: Medium — included when space permits
- **192-255**: Low — first to be dropped

<Callout variant="info">
  For full BCP documentation, visit [docs.bitcontextprotocol.com](https://docs.bitcontextprotocol.com).
</Callout>
