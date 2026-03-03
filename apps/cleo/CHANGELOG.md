# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-03-01

### Added

- CLI framework with cac for command routing
- `run` command: headless Claude Code execution with structured JSON output
- `list` command: discover agents across bundled, global, and local scopes
- `info` command: display agent details and frontmatter
- `install` / `uninstall` commands: manage agents in .claude/agents/
- `init` command: scaffold new agent markdown files
- `create-skill` command: scaffold skill directories with SKILL.md
- `validate` command: validate agent structure and references
- `config` command: get/set configuration values
- `history` command: view operation history with filtering
- `rollback` command: restore agents/skills to previous snapshots
- `search` command: fuzzy search across local and registry agents
- `submit` command: submit agents/skills to the registry
- Qualified name system (ADR-001): namespace/name:tag@version
- Zod-based schema validation for agent and skill frontmatter
