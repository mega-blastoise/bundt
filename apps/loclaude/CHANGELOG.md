# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.0.5] - 2025-02-18

### Changed

- Default docker volume directory changed from `{{cwd}}/models` to `$HOME/.loclaude/models` to allow for cross-workspace model caching

### Added

- Adds `models#path` configuration options to `.loclaude/config.json`
- Adds support for setting `models#path` via environment variable `LOCLAUDE_MODELS_PATH`

## [0.0.4] - 2025-01-24

### Changed

- Minor patches and bug fixes

## [0.0.3] - 2025-01-20

### Changed

- Running `loclaude` with no commands now prints the help message.

## [0.0.2] - 2025-01-20

### Added

- Ollama Compatible Version Check to `doctor` command

### Changed

- Changes release tag from `alpha` to `latest`

## [0.0.1-alpha.2] - 2025-01-20

### Added

- Adds support for CPU Only Ollama Hosts

### Changed

- Modifies documentation on output files from `init` command

## [0.0.1-alpha.1] - 2025-01-19

### Added

- **CLI Commands**
  - `loclaude run` - Run Claude Code with local Ollama (interactive model selection)
  - `loclaude init` - Scaffold docker-compose.yml, config, and mise.toml
  - `loclaude doctor` - Check system prerequisites (Docker, GPU, Claude CLI)
  - `loclaude config` / `loclaude config-paths` - View configuration
  - `loclaude docker-up/down/status/logs/restart` - Docker container management
  - `loclaude models` - List installed Ollama models
  - `loclaude models-pull/rm/show/run` - Model management commands

- **Configuration System**
  - Project-local config: `./.loclaude/config.json`
  - User global config: `~/.config/loclaude/config.json`
  - Environment variable support (`OLLAMA_URL`, `OLLAMA_MODEL`, etc.)
  - Layered config merging with clear priority

- **Cross-Runtime Support**
  - Works with both Bun and Node.js runtimes
  - Dual entry points: `bin/index.ts` (Bun) and `bin/index.mjs` (Node)

- **Docker Integration**
  - Bundled docker-compose.yml template with Ollama + Open WebUI
  - NVIDIA GPU support out of the box
  - Health checks for both services

- **Project Scaffolding**
  - `loclaude init` creates complete project structure
  - Generates mise.toml with task aliases
  - Creates .claude/CLAUDE.md for Claude Code instructions
  - Sets up .gitignore for model directory

### Notes

This is an alpha release. The API and command structure may change before 1.0.

[Unreleased]: https://github.com/nicholasgalante1997/loclaude/compare/v0.0.1-rc.1...HEAD
[0.0.1-alpha.1]: https://github.com/nicholasgalante1997/loclaude/releases/tag/v0.0.1-alpha.1
