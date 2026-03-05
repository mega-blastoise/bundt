<div align="center">

# loclaude

Read the [docs](https://nicholasgalante1997.github.io/loclaude/#/)

**Claude Code with Local LLMs**

Stop burning through Claude API usage limits. Run Claude Code's powerful agentic workflow with local Ollama models on your own hardware.

> **Requires ollama v0.14.2 or higher**

**Zero API costs. No rate limits. Complete privacy.**

[![npm version](https://img.shields.io/npm/v/loclaude.svg)](https://www.npmjs.com/package/loclaude)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

[Quick Start](#quick-start-5-minutes) • [Why loclaude?](#why-loclaude) • [Installation](#installation) • [FAQ](#faq)

</div>

---

## Why loclaude?

### Real Value

- **No Rate Limits**: Use Claude Code as much as you want
- **Privacy**: Your code never leaves your machine
- **Cost Control**: Use your own hardware, pay for electricity not tokens
- **Offline Capable**: Work without internet (after model download)
- **GPU or CPU**: Works with NVIDIA GPUs or CPU-only systems

### What to Expect

loclaude provides:

- One-command setup for Ollama + Open WebUI containers
- Smart model management with auto-loading
- GPU auto-detection with CPU fallback
- Project scaffolding with Docker configs

## Installation

```bash
# With npm (requires Node.js 18+)
npm install -g loclaude

# With bun (faster, recommended)
bun install -g loclaude # use bun-loclaude for commands
```

### vs. Other Solutions

| Solution | Cost | Speed | Privacy | Limits |
|----------|------|-------|---------|--------|
| **loclaude** | Free after setup | Fast (GPU) | 100% local | None |
| Claude API/Web | $20-200+/month | Fast | Cloud-based | Rate limited |
| GitHub Copilot | $10-20/month | Fast | Cloud-based | Context limited |
| Cursor/Codeium | $20+/month | Fast | Cloud-based | Usage limits |

loclaude gives you the utility of Ollama with the convenience of a managed solution for claude code integration.

## Quick Start (5 Minutes)

```bash
# 1. Install loclaude
npm install -g loclaude

# 2. Install Claude Code (if you haven't already)
npm install -g @anthropic-ai/claude-code

# 3. Setup your project (auto-detects GPU)
loclaude init

# 4. Start Ollama container
loclaude docker-up

# 5. Pull a model (choose based on your hardware)
loclaude models-pull qwen3-coder:30b    # GPU with 16GB+ VRAM
# OR
loclaude models-pull qwen2.5-coder:7b   # CPU or limited VRAM

# 6. Run Claude Code with unlimited local LLM
loclaude run
```

That's it! You now have unlimited Claude Code sessions with local models.

## Prerequisites

**Required:**

- [Docker](https://docs.docker.com/get-docker/) with Docker Compose v2
- [Claude Code CLI](https://docs.anthropic.com/en/docs/claude-code) (`npm install -g @anthropic-ai/claude-code`)

**Optional (for GPU acceleration):**

- NVIDIA GPU with 16GB+ VRAM (RTX 3090, 4090, A5000, etc.)
- [NVIDIA Container Toolkit](https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/latest/install-guide.html)

**CPU-only systems work fine!** Use `--no-gpu` flag during init and smaller models.

**Check your setup:**

```bash
loclaude doctor
```

## Features

### Automatic Model Loading

When you run `loclaude run`, it automatically:

1. Checks if your selected model is loaded in Ollama
2. If not loaded, warms up the model with a 10-minute keep-alive (Configurable through env vars)
3. Shows `[loaded]` indicator in model selection for running models

### GPU Auto-Detection

`loclaude init` automatically detects NVIDIA GPUs and configures the appropriate Docker setup:

- **GPU detected**: Uses `runtime: nvidia` and CUDA-enabled images
- **No GPU**: Uses CPU-only configuration with smaller default models

## Commands

### Running Claude Code

```bash
loclaude run                    # Interactive model selection
loclaude run -m qwen3-coder:30b # Use specific model
loclaude run -- --help          # Pass args to claude
```

### Project Setup

```bash
loclaude init                   # Auto-detect GPU, scaffold project
loclaude init --gpu             # Force GPU mode
loclaude init --no-gpu          # Force CPU-only mode
loclaude init --force           # Overwrite existing files
loclaude init --no-webui        # Skip Open WebUI in compose file
```

### Docker Management

```bash
loclaude docker-up              # Start containers (detached)
loclaude docker-up --no-detach  # Start in foreground
loclaude docker-down            # Stop containers
loclaude docker-status          # Show container status
loclaude docker-logs            # Show logs
loclaude docker-logs --follow   # Follow logs
loclaude docker-restart         # Restart containers
```

### Model Management

```bash
loclaude models                 # List installed models
loclaude models-pull <name>     # Pull a model
loclaude models-rm <name>       # Remove a model
loclaude models-show <name>     # Show model details
loclaude models-run <name>      # Run model interactively (ollama CLI)
```

### Diagnostics

```bash
loclaude doctor                 # Check prerequisites
loclaude config                 # Show current configuration
loclaude config-paths           # Show config file search paths
```

## Recommended Models

### For GPU (16GB+ VRAM) - Best Experience

| Model | Size | Speed | Quality | Best For |
|-------|------|-------|---------|----------|
| `qwen3-coder:30b` | ~17 GB | ~50-100 tok/s | Excellent | **Most coding tasks, refactoring, debugging** |
| `deepseek-coder:33b` | ~18 GB | ~40-80 tok/s | Excellent | Code understanding, complex logic |

**Recommendation:** Start with `qwen3-coder:30b` for the best balance of speed and quality.

### For CPU or Limited VRAM (<16GB) - Still Productive

| Model | Size | Speed | Quality | Best For |
|-------|------|-------|---------|----------|
| `qwen2.5-coder:7b` | ~4 GB | ~10-20 tok/s | Good | **Code completion, simple refactoring** |
| `deepseek-coder:6.7b` | ~4 GB | ~10-20 tok/s | Good | Understanding existing code |
| `llama3.2:3b` | ~2 GB | ~15-30 tok/s | Fair | Quick edits, file operations |

## Configuration

loclaude supports configuration via files and environment variables.

### Config Files

Config files are loaded in priority order:

1. `./.loclaude/config.json` (project-local)
2. `~/.config/loclaude/config.json` (user global)

Example config:

```json
{
  "ollama": {
    "url": "http://localhost:11434",
    "defaultModel": "qwen3-coder:30b"
  },
  "models": {
    "path": "./models"
  },
  "docker": {
    "composeFile": "./docker-compose.yml",
    "gpu": true
  },
  "claude": {
    "extraArgs": ["--verbose"]
  }
}
```

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `OLLAMA_URL` | Ollama API endpoint | `http://localhost:11434` |
| `OLLAMA_MODEL` | Default model name | `qwen3-coder:30b` |
| `LOCLAUDE_COMPOSE_FILE` | Path to docker-compose.yml | `./docker-compose.yml` |
| `LOCLAUDE_GPU` | Enable GPU (`true`/`false`) | `true` |
| `LOCLAUDE_MODELS_PATH` | Path to ollama models docker volume | `$HOME/.loclaude/models` |

### Priority

Configuration is merged in this order (highest priority first):

1. CLI arguments
2. Environment variables
3. Project config (`./.loclaude/config.json`)
4. User config (`~/.config/loclaude/config.json`)
5. Default values

## Service URLs

When containers are running:

| Service | URL | Description |
|---------|-----|-------------|
| Ollama API | <http://localhost:11434> | LLM inference API |
| Open WebUI | <http://localhost:3000> | Chat interface |

## Project Structure

After running `loclaude init`:

```
.
├── .claude/
│   └── CLAUDE.md          # Claude Code instructions
├── .loclaude/
│   └── config.json        # Loclaude configuration
├── models/                # Ollama model storage (gitignored)
├── docker-compose.yml     # Container definitions (GPU or CPU mode)
├── mise.toml              # Task runner configuration
└── README.md
```

## Using with mise

The `init` command creates a `mise.toml` with convenient task aliases:

```bash
mise run up              # loclaude docker-up
mise run down            # loclaude docker-down
mise run claude          # loclaude run
mise run pull <model>    # loclaude models-pull <model>
mise run doctor          # loclaude doctor
```

## FAQ

### Is this really unlimited?

Yes! Once you have models downloaded, you can run as many sessions as you want with zero additional cost.

### How does the quality compare to Claude API?

30B parameter models (qwen3-coder:30b) are comparable to GPT-3.5 and work okay for most coding tasks. Larger models have a bit more success. Claude API is still better, but this allows for continuing work when you have hit that pesky usage limit.

### Do I need a GPU?

No, but highly recommended. CPU-only mode works with smaller models at ~10-20 tokens/sec. A GPU (16GB+ VRAM) gives you 50-100 tokens/sec with larger, better models.

### Can I use this with the Claude API too?

Absolutely! Keep using Claude API for critical tasks, use loclaude for everything else to save money and avoid limits.

## Troubleshooting

### Check System Requirements

```bash
loclaude doctor
```

This verifies:

- Docker and Docker Compose installation
- NVIDIA GPU detection (optional)
- NVIDIA Container Toolkit (optional)
- Claude Code CLI
- Ollama API connectivity

### Container Issues

```bash
# View logs
loclaude docker-logs --follow

# Restart containers
loclaude docker-restart

# Full reset
loclaude docker-down && loclaude docker-up
```

### Connection Issues

If Claude Code can't connect to Ollama:

1. Verify Ollama is running: `loclaude docker-status`
2. Check the API: `curl http://localhost:11434/api/tags`
3. Verify your config: `loclaude config`

### GPU Not Detected

If you have a GPU but it's not detected:

1. Check NVIDIA drivers: `nvidia-smi`
2. Test Docker GPU access: `docker run --rm --gpus all nvidia/cuda:12.0-base nvidia-smi`
3. Install NVIDIA Container Toolkit if missing
4. Re-run `loclaude init --gpu` to force GPU mode

### Running on CPU

If inference is slow on CPU:

1. Use smaller, quantized models: `qwen2.5-coder:7b`, `llama3.2:3b`
2. Expect ~10-20 tokens/sec on modern CPUs
3. Consider cloud models via Ollama: `glm-4.7:cloud`

## Getting Help

- **Issues/Bugs**: [GitHub Issues](https://github.com/nicholasgalante1997/loclaude/issues)
- **Questions**: [GitHub Discussions](https://github.com/nicholasgalante1997/loclaude/discussions)
- **Documentation**: Run `loclaude --help` or check this README
- **System Check**: Run `loclaude doctor` to diagnose problems

## Development

### Building from Source

```bash
git clone https://github.com/nicholasgalante1997/loclaude.git loclaude
cd loclaude
bun install
bun run build
```

### Running Locally

```bash
# With bun (direct)
bun bin/index.ts --help

# With node (built)
node bin/index.mjs --help
```

### Testing

```bash
# Test both runtimes
bun bin/index.ts doctor
node bin/index.mjs doctor
```

## License

MIT
