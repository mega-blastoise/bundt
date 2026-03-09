# @nix/kiro-agents — Comprehensive Specification

> This document is a complete, reproducible specification of the `@nix/kiro-agents` repository. It captures every module, interface, algorithm, convention, and test pattern needed to rebuild the project from scratch with identical behavior.

---

## 1. Project Identity

- **Package name**: `@nix/kiro-agents`
- **Version**: `1.0.0-nix.5` (prerelease convention: `<major>.<minor>.<patch>-nix.<N>`)
- **Module format**: ESM (`"type": "module"`)
- **Primary binary**: `hiro` (aliases: `kiro-agents`, `bun-kiro-agents`)
- **Repository**: `git@gitlab.spectrumflow.net:spectrum-consulting/kiro/kiro-shared.git`
- **Registry**: Spectrum Artifactory (`https://artifactory.spectrumtoolbox.com/artifactory/api/npm/npm/`)
- **Publish tag**: `nix`
- **Workspaces**: `["docs"]`

---

## 2. Technology Stack

### Runtime Requirements

| Runtime | Minimum Version | Purpose |
|---------|----------------|---------|
| Bun | >= 1.2.20 | Development, testing, MCP scaffold runtime, `bun:sqlite` |
| Node.js | >= 18 | Published binary entrypoint, `node:sqlite` (>= 22.5.0) |

### Dependencies (Production)

| Package | Version | Purpose |
|---------|---------|---------|
| `commander` | ^12.1.0 | CLI framework (12 commands + mcp subgroup) |
| `picocolors` | ^1.1.1 | Terminal color output (banner, status, formatting) |
| `zod` | ^3 | Schema validation (uses `zod/v4` import path) |
| `front-matter` | ^4.0.2 | YAML frontmatter parsing for skills and submissions |
| `fuse.js` | ^7.1.0 | Fuzzy search for deep registry search |
| `marked` | ^17.0.3 | Markdown-to-text extraction for deep search indexing |
| `@inquirer/prompts` | ^7.0.0 | Interactive prompts (MCP integrate/scaffold/generate, Bun install) |

### Dependencies (Dev)

| Package | Version | Purpose |
|---------|---------|---------|
| `@types/bun` | latest | Bun type definitions |
| `npm-run-all` | ^4.1.5 | Sequential script runner (`run-s`) |
| `typescript` | latest | Type checking and declaration emit |

### Peer Dependencies

| Package | Version | Optional |
|---------|---------|----------|
| `typescript` | ^5.0.0 | Yes |

---

## 3. Project Structure

```
├── bin/                        # CLI entrypoints
│   ├── index.mjs               #   Node.js entrypoint (published binary)
│   └── index.ts                #   Bun entrypoint (development)
├── build/                      # Bun.build() configuration
│   ├── base.ts                 #   Shared build config
│   ├── bun.ts                  #   Bun target config
│   ├── node.ts                 #   Node target config
│   ├── out.ts                  #   Build runner
│   └── index.ts                #   Config exports + concurrent_build()
├── lib/                        # TypeScript source (all ESM, .js extension imports)
│   ├── cli.ts                  #   Commander-based CLI definition
│   ├── commands/               #   Command implementations
│   │   ├── config.ts
│   │   ├── create-skill.ts
│   │   ├── history.ts
│   │   ├── info.ts
│   │   ├── init.ts
│   │   ├── mcp.ts
│   │   ├── rollback.ts
│   │   ├── search.ts
│   │   ├── submit.ts
│   │   ├── uninstall.ts
│   │   └── validate.ts
│   ├── bun-check.ts            #   Bun detection + auto-install
│   ├── config.ts               #   Config read/write
│   ├── helpers.ts              #   Shared utility functions
│   ├── history/                #   History tracking subsystem
│   │   ├── db.ts               #     SQLite abstraction
│   │   ├── recorder.ts         #     Event recording
│   │   └── index.ts            #     Public exports
│   ├── install.ts              #   Agent installation logic
│   ├── registry/               #   Community registry subsystem
│   │   ├── gitlab.ts           #     GitLab API client
│   │   ├── schemas.ts          #     Zod v4 validation schemas
│   │   ├── search.ts           #     Bundled + remote search
│   │   ├── submit.ts           #     Submission logic
│   │   └── index.ts            #     Public exports
│   ├── types.ts                #   Core interfaces
│   ├── ui.ts                   #   Colorized output helpers
│   └── index.ts                #   Public SDK exports
├── test/                       # Test suite (Bun test runner)
│   ├── helpers.test.ts
│   ├── install.test.ts
│   ├── config.test.ts
│   ├── cli.test.ts
│   ├── e2e.test.ts
│   ├── commands/
│   │   ├── config.test.ts
│   │   ├── create-skill.test.ts
│   │   ├── history.test.ts
│   │   ├── info.test.ts
│   │   ├── init.test.ts
│   │   ├── rollback.test.ts
│   │   ├── search.test.ts
│   │   ├── submit.test.ts
│   │   ├── uninstall.test.ts
│   │   └── validate.test.ts
│   └── registry/
│       ├── schemas.test.ts
│       ├── search.test.ts
│       └── submit.test.ts
├── kiro/                       # Agent resources (shipped with package)
│   ├── agents/                 #   13 agent JSON configs
│   │   ├── prompts/            #   13 agent prompt markdown files
│   │   └── context/            #   Per-agent context (3 agents have context)
│   ├── skills/                 #   20 skill directories (each with SKILL.md)
│   ├── mcp/                    #   6 bundled MCP server configs + scaffold templates
│   │   └── scaffold/           #   11 .tmpl files + PROMPT.md.tmpl
│   ├── steering/               #   Steering file templates + examples
│   │   ├── templates/          #   6 templates with {{PLACEHOLDER}} syntax
│   │   └── examples/           #   software-enablement/ (6 filled-in examples)
│   └── prompts/                #   11 SDLC workflow prompts + 8 spec templates
│       └── specs/
├── docs/                       # Documentation website workspace
│   ├── src/
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   ├── nav.ts
│   │   ├── components/
│   │   └── styles/
│   ├── content/                #   12 MDX pages
│   ├── package.json
│   └── vite.config.ts
├── doc/
│   └── PUBLISHING.md
├── scripts/
│   └── release.sh
├── package.json
└── tsconfig.json
```

---

## 4. TypeScript Configuration

```jsonc
{
  "compilerOptions": {
    "target": "ESNext",
    "lib": ["ESNext"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "moduleDetection": "force",
    "allowImportingTsExtensions": true,
    "verbatimModuleSyntax": true,
    "allowJs": true,
    "strict": true,
    "skipLibCheck": true,
    "noFallthroughCasesInSwitch": true,
    "noUnusedLocals": false,
    "noUnusedParameters": false,
    "rootDir": "./",
    "outDir": "./out",
    "noEmit": false,
    "emitDeclarationOnly": true,
    "declaration": true,
    "listEmittedFiles": true,
    "types": ["bun"],
    "typeRoots": ["node_modules/@types"]
  },
  "include": ["lib"],
  "exclude": ["node_modules", "out", "docs"]
}
```

Key decisions:
- `emitDeclarationOnly: true` — `tsc` only emits `.d.ts` files; bundling is done by `Bun.build()`
- `verbatimModuleSyntax: true` — requires explicit `type` keyword on type-only imports
- `moduleResolution: "bundler"` — allows `.js` extension imports that resolve to `.ts` files
- `allowImportingTsExtensions: true` — permits `.ts` imports in source (Bun resolves them)

---

## 5. Build System

### Build Pipeline

Scripts in `package.json`:
```
"prebuild": "run-s clean"
"build": "run-s bundle:* check-types"
```

Execution order: `clean` → `bundle:out` → `check-types`

1. **clean** — `rm -rf out`
2. **bundle:out** — `bun run build/out.ts` (runs `Bun.build()` for both targets concurrently)
3. **check-types** — `tsc -p tsconfig.json` (emits `out/lib/*.d.ts`, type-checks)

### Build Configuration

**`build/base.ts`** — Shared config:
```typescript
export const base_config: Bun.BuildConfig = {
  entrypoints: ['lib/index.ts'],
  outdir: './out',
  format: 'esm',
  splitting: false,
  sourcemap: 'linked',
  minify: true,
  root: '.',
  packages: 'external',
  external: ['commander'],
};
```

**`build/bun.ts`** — Bun target:
```typescript
{ ...base_config, target: 'bun', naming: { entry: 'index.bun.js' } }
```

**`build/node.ts`** — Node target:
```typescript
{ ...base_config, target: 'node', naming: { entry: 'index.js' } }
```

**`build/out.ts`** — Runner:
```typescript
await concurrent_build(bun_config, node_config);
```

**`build/index.ts`** — `concurrent_build()`:
```typescript
export async function concurrent_build(...configs: Bun.BuildConfig[]) {
  const start = performance.now();
  const outputs = await Promise.all(configs.map((c) => Bun.build(c)));
  console.log(`✅ Build succeeded in ${(performance.now() - start).toFixed(2)} ms`);
  return outputs;
}
```

### Build Outputs

| File | Target | Purpose |
|------|--------|---------|
| `out/index.js` | Node.js | Published ESM bundle |
| `out/index.bun.js` | Bun | Bun-optimized ESM bundle |
| `out/lib/*.d.ts` | — | TypeScript declarations |
| `out/index.js.map` | — | Source map (linked) |
| `out/index.bun.js.map` | — | Source map (linked) |

### Package Exports

```jsonc
{
  "module": "out/index.js",
  "types": "out/lib/index.d.ts",
  "exports": {
    ".": { "import": "./out/index.js", "types": "./out/lib/index.d.ts" },
    "./bun": { "import": "./out/index.bun.js", "types": "./out/lib/index.d.ts" },
    "./bun.js": { "import": "./out/index.bun.js", "types": "./out/lib/index.d.ts" },
    "./package.json": "./package.json"
  },
  "files": ["out", "bin", "kiro"]
}
```

### Binary Entrypoints

**`bin/index.mjs`** (Node.js — published binary for `hiro` and `kiro-agents`):
```javascript
#!/usr/bin/env node
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
process.env.KIRO_SHARED_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const { run_cli } = await import('../out/index.js');
run_cli();
```

**`bin/index.ts`** (Bun — development and `bun-kiro-agents` binary):
```typescript
#!/usr/bin/env bun
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
process.env.KIRO_SHARED_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const { run_cli } = await import('../out/index.bun.js');
run_cli();
```

Both set `KIRO_SHARED_ROOT` to the package root directory. This env var is used throughout the CLI to locate the `kiro/` resource directory.

### Binary Registration

```jsonc
{
  "bin": {
    "hiro": "bin/index.mjs",
    "kiro-agents": "bin/index.mjs",
    "bun-kiro-agents": "bin/index.ts"
  }
}
```


---

## 6. Core Type System

### `lib/types.ts`

```typescript
/** Shape of an agent .json config file */
export interface AgentConfig {
  name: string;
  description: string;
  prompt: string;                    // "file://./prompts/<name>.md"
  tools: string[];                   // e.g. ["fs_read", "fs_write", "execute_bash", "grep", "glob", "code"]
  allowedTools?: string[];           // Auto-approved tools (no user confirmation)
  resources?: (string | object)[];   // Steering globs + skill:// URIs
  hooks?: {
    agentSpawn?: { command: string; description: string }[];
  };
  toolsSettings?: Record<string, unknown>;  // e.g. subagent allowedAgents
  keyboardShortcut?: string;         // e.g. "ctrl+shift+a"
  welcomeMessage?: string;
}

/** Result of validating a single agent */
export interface ValidationResult {
  agent: string;
  errors: string[];
  warnings: string[];
}

export interface SkillFrontmatter {
  name: string;
  description: string;
  version?: string;
  author?: string;
  tags?: string[];
}
```

---

## 7. Core Library Modules

### 7.1 `lib/helpers.ts`

Six utility functions used across the codebase. All use synchronous `node:fs` APIs.

**`loadAgentConfig(agentsDir, name)`** → `AgentConfig | null`
- Reads `<agentsDir>/<name>.json`, parses JSON
- Returns `null` if file doesn't exist or JSON is invalid (try-catch)

**`getAvailableAgents(agentsDir)`** → `string[]`
- Scans directory for `.json` files, strips extension
- Returns `[]` if directory doesn't exist

**`ensureDir(dir)`** → `void`
- `mkdirSync(dir, { recursive: true })`

**`copyIfExists(src, dest, opts?)`** → `boolean`
- If `opts?.recursive`, uses `cpSync(src, dest, { recursive: true })`
- Otherwise `cpSync(src, dest)`
- Returns `false` if source doesn't exist

**`parseSkillUri(uri)`** → `{ skillName, skillFile } | null`
- Only matches strings starting with `skill://`
- Strips the prefix to get `skillFile`
- Extracts `skillName` as `basename(dirname(skillFile))`
- Example: `skill://kiro/skills/aws-expert/SKILL.md` → `{ skillName: "aws-expert", skillFile: "kiro/skills/aws-expert/SKILL.md" }`

**`resolveSkillPath(rootDir, skillFile)`** → `string`
- Simply `join(rootDir, skillFile)`

### 7.2 `lib/install.ts`

Re-exports `getAvailableAgents` from helpers.

**`installAgent(name, rootDir, agentsDir, targetBase, isGlobal)`** → `void`

Algorithm:
1. Load agent config via `loadAgentConfig()`. Error + `process.exitCode = 1` if not found.
2. Validate required fields: `name`, `prompt`, `tools` (non-empty). Error if missing.
3. Create target directories: `<targetBase>/agents/prompts/`
4. Copy prompt file from `<agentsDir>/prompts/<name>.md` → target. Rewrite `config.prompt` to `file://./prompts/<name>.md`. Warn if prompt missing.
5. Copy context directory (if exists): `<agentsDir>/context/<name>/` → `<targetBase>/agents/context/<name>/` (recursive)
6. Process `config.resources` array:
   - For each `skill://` URI: parse it, resolve source path, copy `SKILL.md` to `<targetBase>/skills/<skillName>/SKILL.md`, rewrite URI to `skill://.kiro/skills/<skillName>/SKILL.md`, record install event for skill
   - Non-skill resources pass through unchanged
7. Write modified config JSON to `<targetBase>/agents/<name>.json`
8. Print success message with target path label (`~/.kiro` or `.kiro`)
9. Record install event with config snapshot and installed skills metadata

### 7.3 `lib/config.ts`

Config file: `nix-kiro.config.json` in the target base directory.

**`getConfig(targetBase)`** → `Record<string, unknown>`
- Reads and parses the config file. Returns `{}` on missing file or invalid JSON.

**`getConfigValue(targetBase, key)`** → `unknown`
- Supports dot-notation traversal: `"a.b.c"` → `config.a.b.c`
- Returns `undefined` for missing keys or if any intermediate value is not an object

**`setConfigValue(targetBase, key, value)`** → `void`
- Ensures target directory exists
- Reads existing config (or starts with `{}`)
- Creates intermediate objects for dot-notation keys
- Writes back with `JSON.stringify(config, null, 2) + '\n'`

### 7.4 `lib/ui.ts`

All output formatting uses `picocolors`. No chalk, no ansi-colors.

**Banner:**
```
  ╔═══════════════════════════════════════╗
  ║  ⚡ H I R O  a hero 4 kiro            ║
  ╚═══════════════════════════════════════╝
```
- `cyan` box, `magenta` lightning bolt, `white` bold text, `dim` tagline

**Status helpers:**
- `success(msg)` — `✔` green prefix
- `error(msg)` — `✖` red prefix, writes to `stderr`
- `warn(msg)` — `⚠` yellow prefix, writes to `stderr` (via `console.warn`)
- `info(msg)` — `ℹ` blue prefix

**Formatting exports:**
- `label(key, val)` — indented dim key + value
- `heading(text)` — bold cyan
- `dim`, `bold`, `cyan`, `green`, `red`, `yellow`, `magenta`, `blue`, `white` — re-exports from picocolors
- `sep()` — dim 45-char horizontal rule
- `file(path)` — underline cyan

**`table(headers, rows, colWidths?)`:**
- Auto-calculates column widths if not provided (max of header + all row values + 2)
- Bold headers, dim separator line, padded rows

**`actionColor(action)`:**
- `install` → green, `uninstall` → red, `init`/`create-skill` → blue, `rollback` → yellow

### 7.5 `lib/bun-check.ts`

**`isBunInstalled()`** → `boolean`
- `execSync('bun --version', { stdio: 'ignore' })` in try-catch

**`getBunVersion()`** → `string | null`
- `execSync('bun --version', { encoding: 'utf8' }).trim()` in try-catch

**`ensureBun()`** → `Promise<boolean>` (async)
- Returns `true` immediately if Bun is installed
- Otherwise: prints warning, explains why Bun is needed, uses `@inquirer/prompts` `confirm()` to ask user
- If confirmed: runs `curl -fsSL https://bun.sh/install | bash` via `execSync({ stdio: 'inherit' })`
- Returns `true` on success, `false` on decline or failure

### 7.6 `lib/index.ts` — Public SDK Exports

Re-exports from all subsystems:

```typescript
// Agent management
export { getAvailableAgents, installAgent } from './install.js';
export { loadAgentConfig, ensureDir, copyIfExists, parseSkillUri, resolveSkillPath } from './helpers.js';

// CLI
export { run_cli } from './cli.js';

// Configuration
export { getConfig, getConfigValue, setConfigValue } from './config.js';

// History
export { openDatabase, recordEvent } from './history/index.js';
export type { DatabaseHandle, PreparedStatement, HistoryEvent } from './history/index.js';

// Types
export type { AgentConfig, ValidationResult } from './types.js';

// Registry (schemas, submit, search, gitlab)
export { SkillMetadataSchema, AgentSubmissionSchema, SkillSubmissionSchema, RegistrySubmissionSchema,
         submitSkill, submitAgent, parseFrontmatter, formatIssueBody,
         searchRegistry, searchBundled, deepSearchBundled } from './registry/index.js';
export type { SkillMetadata, AgentSubmission, SkillSubmission, RegistrySubmission,
              RegistryResult, GitLabIssue } from './registry/index.js';

// MCP
export { mcpIntegrateCommand, mcpScaffoldCommand, mcpGenerateCommand } from './commands/mcp.js';
export { isBunInstalled, getBunVersion, ensureBun } from './bun-check.js';
```

---

## 8. CLI Definition (`lib/cli.ts`)

### Architecture

- Uses `commander` `Command` class
- Program name: `hiro`
- Version read from `package.json` at `KIRO_SHARED_ROOT`
- Banner displayed on `--help` via `helpInformation` override
- `KIRO_SHARED_ROOT` env var provides package root; `AGENTS_DIR` = `<ROOT>/kiro/agents`

### `getVersion(root)` → `string`
- Reads `package.json` from root, returns `version` field or `'0.0.0'` on error

### Commands

| Command | Signature | Handler |
|---------|-----------|---------|
| `list` | (none) | Inline: prints agents from `getAvailableAgents()` with cyan bullets |
| `info <agent>` | `(agent: string)` | `infoCommand(agent, AGENTS_DIR)` |
| `install [agents...]` | `--global` | Inline: resolves names (all if empty), target base, calls `installAgent()` per agent |
| `uninstall <agents...>` | `--global` | `uninstallCommand(agents, opts)` |
| `validate [agents...]` | (none) | `validateCommand(AGENTS_DIR, ROOT, agents)` |
| `init <name>` | `-d`, `-t`, `-s`, `-o` | `initCommand(name, opts)` |
| `create-skill <name>` | `-d`, `-o` | `createSkillCommand(name, opts)` |
| `config <args...>` | `--global` | `configCommand(args, opts)` |
| `history [target]` | `--global`, `-a`, `-l`, `--id`, `--detail` | `historyCommand(target, opts)` |
| `rollback <target>` | `--global`, `--to`, `--dry-run` | `rollbackCommand(target, opts)` |
| `submit <type> <name>` | (none) | `submitCommand(type, name)` |
| `search <query>` | `--deep` | `searchCommand(query, ROOT, opts)` |

### MCP Subcommand Group

Parent: `mcp` — description: "MCP server integration, scaffolding, and AI-powered generation"

| Subcommand | Signature | Handler |
|------------|-----------|---------|
| `mcp integrate` | `--global` | `mcpIntegrateCommand(opts)` |
| `mcp scaffold <name>` | `-o` | `mcpScaffoldCommand(name, opts)` |
| `mcp generate` | `-o`, `-p` | `mcpGenerateCommand(opts)` |


---

## 9. Command Implementations

### 9.1 `commands/info.ts`

**`infoCommand(name, agentsDir)`** → `void`

1. Check agent exists in `getAvailableAgents()`. Error + exit code 1 if not found.
2. Load config via `loadAgentConfig()`. Error if load fails.
3. Print: heading with name, description, keyboard shortcut (magenta), tools (cyan, comma-separated), auto-approved tools (green), skills (yellow, extracted from `skill://` resources via `parseSkillUri`), steering globs, spawn hooks (count + descriptions), welcome message (dim, after separator).

### 9.2 `commands/init.ts`

**`initCommand(name, opts)`** → `void`

Options: `description?`, `tools?` (comma-separated string), `shortcut?`, `output?`

Default tools: `['fs_read', 'fs_write', 'execute_bash', 'grep', 'glob', 'code']`
Default allowed: `['fs_read', 'grep', 'glob', 'code']`

Algorithm:
1. Resolve output dir (default: `<cwd>/.kiro/agents/`), ensure prompts subdir exists
2. Check if `<name>.json` already exists → error + exit code 1
3. Parse tools from comma-separated string or use defaults
4. Build config object with: name, description (default: `"Custom agent: <name>"`), prompt path, tools, allowedTools (intersection of tools with default allowed list), resources (`["file://.kiro/steering/**/*.md"]`), hooks (placeholder echo command), optional keyboardShortcut, welcomeMessage
5. Build prompt template with sections: Identity, Core Competencies (Short/Long), Development Patterns, Critical Constraints — all with TODO placeholders
6. Write config JSON (pretty-printed + trailing newline) and prompt markdown
7. Print success with file paths and usage hint
8. Record `init` event with config snapshot

### 9.3 `commands/validate.ts`

**`validateCommand(agentsDir, rootDir, names?)`** → `void`

If no names provided, validates all agents from `getAvailableAgents()`.

**`validate(name, agentsDir, rootDir)`** → `ValidationResult`

Checks (errors):
- Config file exists at `<agentsDir>/<name>.json`
- Valid JSON parse
- Required fields: `name`, `description`, `prompt`, `tools` (non-empty array)
- If prompt starts with `file://`: prompt file exists at `<agentsDir>/prompts/<name>.md`
- For each `skill://` resource: skill source file exists at `<rootDir>/<skillFile>`

Checks (warnings):
- No `keyboardShortcut` defined
- No `welcomeMessage` defined
- No `hooks.agentSpawn` defined (or empty array)

Output: `✓`/`✗` per agent with errors (red) and warnings (yellow dim), summary line with total checked and error count. Sets `process.exitCode = 1` if any errors.

### 9.4 `commands/uninstall.ts`

**`uninstallCommand(names, opts)`** → `void`

Options: `global?`

Resolves target base: `<homedir>/.kiro` (global) or `<cwd>/.kiro` (local).
Errors if no names provided.

**`uninstallAgent(name, agentsTarget, targetBase, isGlobal)`** → `void`

Algorithm:
1. Check `<agentsTarget>/<name>.json` exists → error if not
2. Read config to extract skill names from `skill://` resources
3. Remove: config JSON, prompt markdown, context directory (recursive)
4. Determine which skills are still referenced by remaining agents:
   - Scan all remaining `.json` files in agents dir
   - Parse each, collect all `skill://` references into a `stillUsed` Set
5. For each skill from the removed agent: if not in `stillUsed`, remove the skill directory (recursive)
6. Print success, record `uninstall` event with config snapshot

### 9.5 `commands/create-skill.ts`

**`createSkillCommand(name, opts)`** → `void`

Options: `description?`, `output?`

1. Resolve output dir (default: `<cwd>/.kiro/skills/<name>/`)
2. Check if `SKILL.md` already exists → error + exit code 1
3. Generate content with YAML frontmatter (`name`, `description`) and markdown body:
   - Heading: name split on hyphens, each word capitalized (e.g. `react-router-expert` → `React Router Expert`)
   - Sections: Key Concepts, Best Practices, Common Patterns (all TODO)
4. Write file, print success with skill:// reference hint
5. Record `create-skill` event

### 9.6 `commands/config.ts`

**`configCommand(args, opts)`** → `void`

Options: `global?`

Parses `args` as `[sub, key, ...rest]`:
- `get <key>`: reads value, prints `(not set)` if undefined
- `set <key> <value>`: coerces value (`"true"`→`true`, `"false"`→`false`, numeric strings→number), writes via `setConfigValue()`
- Anything else: error + exit code 1

### 9.7 `commands/history.ts`

**`historyCommand(target, opts)`** → `void`

Options: `global?`, `action?`, `limit?` (string), `id?` (string), `detail?`

1. Check `history.enabled === true` in config → error if not
2. Open database → return if null
3. If `opts.id`: single event detail view
   - Query `SELECT * FROM events WHERE id = ?`
   - Display: heading, timestamp, action (colored), type, name, version, config snapshot (if `--detail`), metadata (if `--detail`)
4. Otherwise: list view
   - Build WHERE clause from `target` (target_name) and `action` filters
   - `ORDER BY id DESC LIMIT ?` (default 25)
   - Display as table with columns: ID, Timestamp (dim), Action (colored), Type, Name (bold), Version (dim)
   - Column widths: `[6, 22, 14, 8, 20, 12]`
5. Always close database in `finally` block

### 9.8 `commands/rollback.ts`

**`rollbackCommand(target, opts)`** → `void`

Options: `global?`, `to?` (string), `dryRun?`

1. Check history enabled → error if not
2. Open database
3. Find snapshot:
   - If `opts.to`: `SELECT * FROM events WHERE id = ? AND target_name = ? AND config_snapshot IS NOT NULL`
   - Otherwise: `... ORDER BY id DESC LIMIT 1 OFFSET 1` (previous version, skipping current)
4. Parse `config_snapshot` JSON
5. If `dryRun`: print what would be restored (JSON dump), return
6. Write restored config:
   - Agent: `<targetBase>/agents/<target>.json`
   - Skill: `<targetBase>/skills/<target>/SKILL.md`
7. Print success, record `rollback` event with restored snapshot and `metadata: { restoredFromEvent: row.id }`
8. Always close database in `finally`

### 9.9 `commands/submit.ts`

**`submitCommand(type, name)`** → `Promise<void>` (async)

1. Validate type is `'agent'` or `'skill'` → error + exit code 1
2. Call `submitSkill(name)` or `submitAgent(name)` from registry
3. Print success with GitLab issue URL
4. Catch errors → print error message + exit code 1

### 9.10 `commands/search.ts`

**`searchCommand(query, root, opts?)`** → `Promise<void>` (async)

Options: `deep?`

1. Print heading ("Deep searching" or "Searching")
2. Call `searchRegistry(query, root, opts.deep)`
3. If no results: print dim "No results found"
4. Otherwise: display table with columns: Name (cyan), Type, Version, Source (green "bundled" / yellow "registry"), 👍 count, Description (truncated to 50 chars)
5. If deep: add Match column (dim, truncated to 60 chars)
6. Print result count

### 9.11 `commands/mcp.ts`

Three commands sharing helpers. All MCP commands check for Bun via `ensureBun()` (scaffold and generate only).

**Shared helpers:**
- `ROOT` = `process.env.KIRO_SHARED_ROOT`
- `MCP_DIR` = `<ROOT>/kiro/mcp`
- `SCAFFOLD_DIR` = `<MCP_DIR>/scaffold`
- `getBundledServers()`: scans MCP_DIR for subdirectories (excluding `scaffold`), reads `mcp.json` from each, returns `{ name, description, config }[]`
- `readTemplate(relPath)`: reads from SCAFFOLD_DIR
- `fillTemplate(content, vars)`: replaces `{{KEY}}` with values
- `getMcpConfigPath(isGlobal)`: `<base>/.kiro/mcp.json`
- `readMcpConfig(path)`: reads existing or returns `{ mcpServers: {} }`

**`mcpIntegrateCommand(opts)`** → `Promise<void>`

Interactive wizard using `@inquirer/prompts`:
1. Select source: "bundled" or "custom"
2. Select global/local (if not passed via `--global`)
3. If bundled:
   - Select from bundled servers list
   - Check for existing entry → confirm overwrite
   - Merge into mcpServers object
   - Warn if env/args contain `YOUR_*` placeholders
4. If custom:
   - Input: name, command, args (comma-separated)
   - Create entry: `{ command, args, env: {}, disabled: false }`
5. Write updated `mcp.json`

**`mcpScaffoldCommand(name, opts)`** → `Promise<void>`

1. Check Bun via `ensureBun()` → exit code 1 if not available
2. Resolve output dir (default: `<cwd>/<name>`)
3. Check dir is empty → error if not
4. Template variables: `SERVER_NAME`, `TOOL_NAME` (name with non-alphanumeric replaced by `_`), `TOOL_DESCRIPTION`
5. Process 11 template files:
   - `package.json.tmpl` → `package.json`
   - `tsconfig.json.tmpl` → `tsconfig.json`
   - `src/index.ts.tmpl` → `src/index.ts`
   - `src/types.ts.tmpl` → `src/types.ts`
   - `src/router.ts.tmpl` → `src/router.ts`
   - `src/lifecycle.ts.tmpl` → `src/lifecycle.ts`
   - `src/logger.ts.tmpl` → `src/logger.ts`
   - `src/tools.ts.tmpl` → `src/tools.ts`
   - `src/handlers/example.ts.tmpl` → `src/handlers/example.ts`
   - `src/transports/stdio.ts.tmpl` → `src/transports/stdio.ts`
   - `src/transports/http.ts.tmpl` → `src/transports/http.ts`
6. Print file list, setup instructions (`cd`, `bun install`, `bun run start`), integration hint

**`mcpGenerateCommand(opts)`** → `Promise<void>`

1. Check Bun via `ensureBun()`
2. Interactive inputs: server name, description (one sentence), tools spec (opens `$EDITOR` via `editor()` prompt with `.md` postfix and template default)
3. Read `PROMPT.md.tmpl` from scaffold dir
4. Fill template with: `SERVER_NAME`, `SERVER_DESCRIPTION`, `PROJECT_DIR`, `TOOLS_SPEC`
5. Write to `<cwd>/<name>-implement.md` (or `--output` path)
6. Print usage: `cat <file> | kiro-cli chat`

---

## 10. History Subsystem

### 10.1 `history/db.ts`

**Interfaces:**

```typescript
interface PreparedStatement {
  run(...params: unknown[]): { changes: number; lastInsertRowid: number };
  all(...params: unknown[]): unknown[];
  get(...params: unknown[]): unknown | undefined;
}

interface DatabaseHandle {
  exec(sql: string): void;
  prepare(sql: string): PreparedStatement;
  close(): void;
}
```

**Schema:**

```sql
CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp TEXT NOT NULL DEFAULT (datetime('now')),
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_name TEXT NOT NULL,
  package_version TEXT,
  config_snapshot TEXT,
  metadata TEXT
);
CREATE INDEX IF NOT EXISTS idx_events_target ON events(target_type, target_name);
CREATE INDEX IF NOT EXISTS idx_events_action ON events(action);
CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(timestamp);
```

**`openDatabase(targetBase)`** → `DatabaseHandle | null`

1. Database path: `<targetBase>/history.db`
2. Ensure target directory exists
3. Try `bun:sqlite` first (if `globalThis.Bun` exists): `new Database(dbPath)` → wrap with `wrapBunDatabase()`
4. Fall through to `node:sqlite`: `new DatabaseSync(dbPath)` → wrap with `wrapNodeDatabase()`
5. If neither available: print warning once (module-level `warned` flag), return `null`

**`wrapBunDatabase(db)`** — Thin wrapper, passes through directly.

**`wrapNodeDatabase(db)`** — Converts `bigint` returns from Node's SQLite to `Number()` for `changes` and `lastInsertRowid`.

### 10.2 `history/recorder.ts`

**`HistoryEvent` interface:**
```typescript
interface HistoryEvent {
  action: 'install' | 'uninstall' | 'init' | 'create-skill' | 'rollback';
  targetType: 'agent' | 'skill';
  targetName: string;
  configSnapshot?: object;
  metadata?: object;
}
```

**`recordEvent(targetBase, event)`** → `void`

1. Check `history.enabled === true` in config → return silently if not
2. Open database → return if null
3. Insert event with: action, target_type, target_name, package_version (from `KIRO_SHARED_ROOT/package.json`), config_snapshot (JSON stringified or null), metadata (JSON stringified or null)
4. Close database in `finally`
5. Entire function wrapped in outer try-catch — **history failures never block primary operations**

**`getPackageVersion()`** → `string`
- Reads version from `KIRO_SHARED_ROOT/package.json`, returns `'0.0.0'` on any error

---

## 11. Registry Subsystem

### 11.1 `registry/schemas.ts`

Uses `zod/v4` import path (Zod v3 package with v4 subpath).

**Constants:**
- `KEBAB` = `/^[a-z0-9]+(-[a-z0-9]+)*$/` — kebab-case validation
- `SEMVER` = `/^\d+\.\d+\.\d+$/` — strict semver (no `v` prefix, no prerelease)

**`SkillMetadataSchema`:**
```typescript
z.object({
  name: z.string().regex(KEBAB, 'Must be kebab-case'),
  description: z.string().min(10).max(200),
  version: z.string().regex(SEMVER, 'Must be semver (e.g. 1.0.0)'),
  author: z.string().min(1),
  tags: z.array(z.string()).min(1).max(10),
})
```

**`AgentSubmissionSchema`:**
```typescript
z.object({
  type: z.literal('agent'),
  metadata: SkillMetadataSchema.extend({
    tools: z.array(z.string()).min(1),
    allowedTools: z.array(z.string()).optional(),
    keyboardShortcut: z.string().optional(),
  }),
  prompt: z.string().min(50, 'Prompt must be substantive'),
  skills: z.array(z.string()).optional(),
})
```

**`SkillSubmissionSchema`:**
```typescript
z.object({
  type: z.literal('skill'),
  metadata: SkillMetadataSchema,
  content: z.string().min(50, 'Skill content must be substantive'),
})
```

**`RegistrySubmissionSchema`:**
```typescript
z.discriminatedUnion('type', [AgentSubmissionSchema, SkillSubmissionSchema])
```

### 11.2 `registry/gitlab.ts`

**Constants:**
- `PROJECT_ID` = `'98936'`
- `NAMESPACE_ID` = `'48757'`
- `GITLAB_URL` = `'https://gitlab.spectrumflow.net'`

**`getRegistryToken()`** → `string`
- Checks `registry.token` in local config (`<cwd>/.kiro`), then global (`~/.kiro`)
- Throws if not found with setup instructions

**`api<T>(path, opts?)`** → `Promise<T>`
- Base URL: `<GITLAB_URL>/api/v4/projects/<PROJECT_ID><path>`
- Headers: `PRIVATE-TOKEN: <token>`, `Content-Type: application/json`
- Throws on non-OK response with status and body text

**`createIssue(title, description, labels)`** → `Promise<GitLabIssue>`
- POST to `/issues` with JSON body: `{ title, description, labels: labels.join(',') }`

**`searchIssues(search, labels)`** → `Promise<GitLabIssue[]>`
- GET `/issues?search=<query>&labels=<labels>&state=opened&per_page=50`

**`GitLabIssue` interface:**
```typescript
interface GitLabIssue {
  id: number; iid: number; title: string; description: string;
  labels: string[]; web_url: string; thumbs_up: number; created_at: string;
}
```

### 11.3 `registry/search.ts`

**`RegistryResult` interface:**
```typescript
interface RegistryResult {
  name: string; type: 'agent' | 'skill'; description: string;
  version: string; author: string; tags: string[];
  source: 'bundled' | 'registry'; thumbsUp?: number;
  url?: string; matchContext?: string;
}
```

**`searchBundled(query, root)`** → `RegistryResult[]`
- Lowercases query
- Scans `<root>/kiro/skills/` directories: reads `SKILL.md`, parses frontmatter via `front-matter`, matches name or description against query
- Scans `<root>/kiro/agents/` JSON files: parses config, matches name or description
- All results: `source: 'bundled'`, `version: '1.0.0'`, `author: 'nix-team'`

**`deepSearchBundled(query, root)`** → `RegistryResult[]`
- First runs `searchBundled()` to get shallow matches (used as exclusion set)
- Collects deep candidates (skills not in shallow results): reads SKILL.md body, converts markdown to plain text via `marked.lexer()` + recursive `extractText()`
- Collects agent candidates: reads prompt markdown, converts to text
- Runs Fuse.js search with: `keys: ['text']`, `threshold: 0.4`, `ignoreLocation: true`, `includeMatches: true`
- Extracts match context: 40 chars before and after the first match index, wrapped in `…`

**`mdToText(md)`** — Converts markdown to plain text using `marked.lexer()` tokens, extracting `text` fields recursively, collapsing whitespace.

**`searchRegistry(query, root, deep?)`** → `Promise<RegistryResult[]>`
- Combines: `searchBundled()` + optional `deepSearchBundled()` + remote `searchIssues()` (parsed via `parseIssue()`)
- Deduplication: bundled wins, then deep, then remote. Key: `${type}:${name}`
- Remote search failures silently caught (offline/no token → bundled-only)

**`parseIssue(issue)`** → `RegistryResult | null`
- Parses title: `[SUBMISSION] <type>: <name> v<version>`
- Extracts tags, author, description from issue body via regex

### 11.4 `registry/submit.ts`

**`parseFrontmatter(raw)`** → `{ meta, body }`
- Uses `front-matter` library. Returns `{ meta: {}, body: raw }` on parse failure.

**`resolveSkillPath(name)`** → `string | null`
- Checks: `<cwd>/.kiro/skills/<name>/SKILL.md`, then `<cwd>/kiro/skills/<name>/SKILL.md`

**`resolveAgentDir()`** → `string`
- Returns `<cwd>/.kiro/agents` if exists, otherwise `<cwd>/kiro/agents`

**`formatIssueBody(submission)`** → `string`
- Metadata section: Author, Type, Version, Tags
- Skill: Content in YAML code block
- Agent: Prompt in markdown code block, Skills list, Tools list
- Footer: `✅ Schema valid (zod v4)`

**`submitSkill(name)`** → `Promise<string>` (returns issue URL)
1. Resolve skill path → throw if not found
2. Read and parse frontmatter
3. Validate with `SkillSubmissionSchema.parse()`
4. Check for duplicates via `searchIssues(name, ['submission', 'skill'])`
5. Create GitLab issue with title `[SUBMISSION] skill: <name> v<version>`, labels `['submission', 'skill', 'pending-review']`

**`submitAgent(name)`** → `Promise<string>`
1. Load agent config → throw if not found
2. Read prompt file (resolves `file://./` path relative to agents dir)
3. Validate with `AgentSubmissionSchema.parse()`
4. Check for duplicates
5. Create GitLab issue with labels `['submission', 'agent', 'pending-review']`


---

## 12. Agent Resources

### 12.1 Agent Configuration Convention

All 13 agents follow the same JSON structure. Every agent has:
- `name` — matches filename without `.json`
- `description` — one-line purpose statement
- `prompt` — `file://./prompts/<name>.md`
- `tools` — array of Kiro CLI tool names
- `allowedTools` — subset of tools auto-approved without user confirmation
- `resources` — array of steering globs (`file://.kiro/steering/**/*.md`) and skill URIs (`skill://kiro/skills/<name>/SKILL.md`)
- `hooks.agentSpawn` — shell commands that run on agent startup to gather project context
- `keyboardShortcut` — keyboard shortcut string (e.g. `ctrl+shift+a`)
- `welcomeMessage` — greeting shown when agent starts

### 12.2 Agent Inventory

| Agent | Shortcut | Tools | Skills | Context Files |
|-------|----------|-------|--------|---------------|
| `architect` | `ctrl+shift+a` | fs_read, fs_write, execute_bash, grep, glob, code | system-design-expert, aws-expert, mermaid-diagrams | — |
| `typescript-dev` | `ctrl+shift+c` | fs_read, fs_write, execute_bash, grep, glob, code | kiro-cli-expert, typescript-expert, merge-request-summary, resolve-mr-comments, generate-changelog | — |
| `orchestrator` | `ctrl+shift+o` | fs_read, grep, glob, code (read-only) | — | — |
| `security` | `ctrl+shift+s` | fs_read, grep, glob, code (read-only) | owasp-expert | — |
| `test` | `ctrl+shift+t` | fs_read, fs_write, execute_bash, grep, glob, code | playwright-expert | — |
| `devops` | `ctrl+shift+d` | fs_read, fs_write, execute_bash, grep, glob, code | spectrum-flow-expert, terraform-expert, aws-expert | — |
| `mermaid-diagrams` | `ctrl+shift+m` | fs_read, fs_write, grep, glob, code | mermaid-diagrams | quick-reference.md, diagram-examples.md, use-cases.md |
| `charter-portfolio` | `ctrl+shift+p` | fs_read, fs_write, grep, glob, code | — (uses context file) | portfolio-management-process.md |
| `ui-ux-design` | `ctrl+shift+u` | fs_read, fs_write, grep, glob, code | design-thinking-expert, shadcn-ui-expert, mermaid-diagrams | — |
| `strands-builder` | `ctrl+shift+b` | fs_read, fs_write, execute_bash, grep, glob, code, web_fetch, web_search | aws-expert, typescript-expert | mcp-setup.md, quick-reference.md |
| `react-dev` | `ctrl+shift+r` | fs_read, fs_write, execute_bash, grep, glob, code | react-component-expert, typescript-expert | — |
| `bun-api-dev` | `ctrl+shift+b` | fs_read, fs_write, execute_bash, grep, glob, code | bun-server-expert, typescript-expert | — |
| `react-state-dev` | `ctrl+shift+e` | fs_read, fs_write, execute_bash, grep, glob, code | react-state-expert, typescript-expert | — |

**Special: `orchestrator`** has `toolsSettings.subagent.allowedAgents`: `["architect", "ui-ux-design", "typescript-dev", "test", "security", "devops"]`

### 12.3 Prompt Format Convention

All agent prompts follow this structure:
```markdown
## Identity
Name: <Agent Name>
Purpose: <One paragraph describing specialization>

## Core Competencies
### Short
- **Topic**: Brief description (bullet list)

### Long
<Detailed patterns, tables, workflows>

## Development Patterns
<Step-by-step workflows the agent follows>

## Critical Constraints
- **ALWAYS**: <Rule>
- **NEVER**: <Rule>
```

### 12.4 Skill Inventory (20 skills)

Each skill is a `SKILL.md` file with YAML frontmatter (`name` + `description`) in its own directory under `kiro/skills/`.

| Skill | Description |
|-------|-------------|
| `aws-expert` | AWS services, architecture patterns, best practices |
| `bun-server-expert` | Bun server development, native serve() API, route handlers |
| `design-thinking-expert` | Design Thinking methodology, UX research |
| `generate-changelog` | Conventional changelog generation from git history |
| `kiro-cli-expert` | Kiro CLI usage, configuration, custom agent development |
| `mermaid-diagrams` | Comprehensive Mermaid diagram syntax and patterns |
| `merge-request-summary` | MR/PR summary generation from diffs |
| `owasp-expert` | OWASP Top 10, secure coding, vulnerability patterns |
| `playwright-expert` | Playwright test authoring, Page Object Models, CI setup |
| `prisma-expert` | Prisma ORM schema design, migrations, query patterns |
| `react-component-expert` | React component architecture, composition, accessibility |
| `react-router-v7-expert` | React Router v7 loaders, actions, nested routing |
| `react-state-expert` | React state management (Context, Zustand, TanStack Query) |
| `resolve-mr-comments` | Automated resolution of MR review comments |
| `shadcn-ui-expert` | shadcn/ui component library usage and customization |
| `spectrum-flow-expert` | Spectrum Flow CI/CD platform, deployment patterns |
| `system-design-expert` | Distributed systems design, scalability, trade-offs |
| `terraform-expert` | Terraform modules, state management, AWS provider |
| `typescript-expert` | TypeScript advanced types, patterns, best practices |

### 12.5 MCP Server Configurations (6 bundled)

Each in `kiro/mcp/<name>/` with `mcp.json` + `README.md`:

| Server | Key in mcp.json | Command | Args |
|--------|----------------|---------|------|
| `context7` | `Context7` | `npx` | `["-y", "@upstash/context7-mcp", "--api-key", "YOUR_API_KEY"]` |
| `aws-frontend` | `aws-frontend` | `uvx` | `["awslabs.frontend-mcp-server@latest"]` |
| `playwright` | `playwright` | `npx` | `["@playwright/mcp@latest"]` |
| `chrome-devtools` | `chrome-devtools` | `npx` | `["chrome-devtools-mcp@latest"]` |
| `aws-documentation` | `aws-documentation` | `uvx` | `["awslabs.aws-documentation-mcp-server@latest"]` |
| `strands-agents` | `strands-agents` | `uvx` | `["--with", "pip-system-certs", "strands-agents-mcp-server"]` |

### 12.6 MCP Scaffold Templates (12 files)

Located in `kiro/mcp/scaffold/`. Template variables: `{{SERVER_NAME}}`, `{{TOOL_NAME}}`, `{{TOOL_DESCRIPTION}}`, `{{SERVER_DESCRIPTION}}`, `{{PROJECT_DIR}}`, `{{TOOLS_SPEC}}`.

| Template | Output | Purpose |
|----------|--------|---------|
| `package.json.tmpl` | `package.json` | Bun-only, zero runtime deps |
| `tsconfig.json.tmpl` | `tsconfig.json` | Strict TS config for Bun |
| `src/index.ts.tmpl` | `src/index.ts` | Entrypoint — CLI arg parsing, transport dispatch |
| `src/types.ts.tmpl` | `src/types.ts` | Wire types, MCP constants, error codes |
| `src/router.ts.tmpl` | `src/router.ts` | JSON-RPC method router |
| `src/lifecycle.ts.tmpl` | `src/lifecycle.ts` | Session state + MCP handshake |
| `src/logger.ts.tmpl` | `src/logger.ts` | Level-gated stderr logger |
| `src/tools.ts.tmpl` | `src/tools.ts` | Tool definitions array |
| `src/handlers/example.ts.tmpl` | `src/handlers/example.ts` | Example tool handler |
| `src/transports/stdio.ts.tmpl` | `src/transports/stdio.ts` | Newline-delimited JSON-RPC over stdin/stdout |
| `src/transports/http.ts.tmpl` | `src/transports/http.ts` | Streamable HTTP with session management |
| `PROMPT.md.tmpl` | `<name>-implement.md` | AI implementation prompt for kiro-cli |

### 12.7 Steering Templates (6 templates)

Located in `kiro/steering/templates/`. All use `{{PLACEHOLDER}}` syntax.

| Template | Purpose | Priority |
|----------|---------|----------|
| `product.md` | Product context, domain concepts, business objectives | Critical |
| `tech.md` | Technology stack, frameworks, common commands | Critical |
| `structure.md` | Project structure, architecture patterns, conventions | Critical |
| `coding-standards.md` | TypeScript, React, API, general coding standards | High |
| `security.md` | Security requirements and best practices | High |
| `logging.md` | Logging and monitoring standards | Medium |

Example implementations in `kiro/steering/examples/software-enablement/` (6 filled-in files).

### 12.8 SDLC Prompt Templates

**Workflow prompts** (11 files in `kiro/prompts/`):

| # | File | Phase |
|---|------|-------|
| 01 | `01-discovery.md` | Discovery |
| 02 | `02-specification.md` | Specification |
| 03 | `03-implementation-plan.md` | Planning |
| 04 | `04-implement-component.md` | Implementation |
| 05 | `05-implement-api.md` | Implementation |
| 06 | `06-implement-page.md` | Implementation |
| 07 | `07-implement-state.md` | Implementation |
| 08 | `08-code-review.md` | Review |
| 09 | `09-integration-verify.md` | Verification |
| 10 | `10-bug-fix.md` | Maintenance |
| 11 | `11-refactor.md` | Maintenance |

Plus `sync-upstream.md` for fork synchronization.

**Spec generation templates** (8 files in `kiro/prompts/specs/`):
`spec-overview.md`, `spec-strategy.md`, `spec-foundation.md`, `spec-component.md`, `spec-page.md`, `spec-api.md`, `spec-migration.md`, `spec-testing.md`

---

## 13. Documentation Website (`docs/` workspace)

A single-page documentation site built as a Vite workspace. The site is a 3-column layout (sidebar / content / table of contents) with light/dark theme support, MDX content pages, and custom components.

### 13.1 Package Configuration

**`docs/package.json`:**
```jsonc
{
  "name": "kiro-agents-docs",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  }
}
```

**Dependencies:**

| Package | Version | Purpose |
|---------|---------|---------|
| `@mdx-js/mdx` | ^3.1.0 | MDX compiler |
| `@mdx-js/rollup` | ^3.1.0 | Vite/Rollup MDX plugin |
| `lucide-react` | ^0.468.0 | Icons: `Info`, `AlertTriangle`, `AlertCircle`, `Lightbulb`, `Github`, `ExternalLink`, `Rocket`, `Bot`, `Server`, `GitPullRequest` |
| `react` | ^19.0.0 | UI framework |
| `react-dom` | ^19.0.0 | DOM renderer |
| `react-router-dom` | ^7.1.0 | Client-side routing (`BrowserRouter`, `Routes`, `Route`, `NavLink`, `Link`, `Outlet`, `useLocation`) |
| `remark-gfm` | ^4.0.1 | GitHub Flavored Markdown (tables, strikethrough) |
| `shiki` | ^3.0.0 | Syntax highlighting (dependency present, not explicitly integrated in source) |

**Dev Dependencies:**

| Package | Version | Purpose |
|---------|---------|---------|
| `@types/react` | ^19.0.0 | React type definitions |
| `@types/react-dom` | ^19.0.0 | ReactDOM type definitions |
| `@vitejs/plugin-react` | ^4.3.0 | Vite React plugin (JSX transform) |
| `typescript` | ^5.7.0 | Type checking |
| `vite` | ^6.0.0 | Build tool and dev server |

### 13.2 TypeScript Configuration

**`docs/tsconfig.json`:**
```jsonc
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noEmit": true,
    "skipLibCheck": true,
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["src/**/*", "content/**/*"]
}
```

**`docs/src/vite-env.d.ts`:**
```typescript
/// <reference types="vite/client" />

declare module '*.mdx' {
  import type { ComponentType } from 'react';
  const component: ComponentType;
  export default component;
}
```

### 13.3 Vite Configuration

**`docs/vite.config.ts`:**
```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import mdx from '@mdx-js/rollup';
import remarkGfm from 'remark-gfm';
import { resolve } from 'node:path';

export default defineConfig({
  plugins: [
    mdx({ remarkPlugins: [remarkGfm] }),
    react(),
  ],
  resolve: {
    alias: { '@': resolve(__dirname, 'src') },
  },
});
```

Key: `mdx()` plugin must come before `react()` in the plugins array.

### 13.4 HTML Entry Point

**`docs/index.html`:**
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Kiro Agents — Documentation</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Fira+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/src/main.tsx"></script>
</body>
</html>
```

Google Fonts loaded: **Fira Sans** (400, 500, 600, 700) and **JetBrains Mono** (400, 500).

### 13.5 Application Entry & Routing

**`docs/src/main.tsx`:**
```typescript
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { App } from './App';
import './styles/global.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
```

**`docs/src/App.tsx`:**

12 lazy-loaded MDX routes wrapped in `Suspense`, all nested under `<Layout />`:

```typescript
import { Routes, Route } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { Layout } from './components/Layout';

const Introduction = lazy(() => import('../content/introduction.mdx'));
const QuickStart = lazy(() => import('../content/quick-start.mdx'));
const Installation = lazy(() => import('../content/installation.mdx'));
const CliReference = lazy(() => import('../content/cli-reference.mdx'));
const McpServerManagement = lazy(() => import('../content/mcp-server-management.mdx'));
const Agents = lazy(() => import('../content/agents.mdx'));
const Skills = lazy(() => import('../content/skills.mdx'));
const Steering = lazy(() => import('../content/steering.mdx'));
const SdkApi = lazy(() => import('../content/sdk-api.mdx'));
const Contributing = lazy(() => import('../content/contributing.mdx'));
const Maintaining = lazy(() => import('../content/maintaining.mdx'));
const Publishing = lazy(() => import('../content/publishing.mdx'));

function Loading() {
  return <div style={{ padding: 40, color: 'var(--text-tertiary)' }}>Loading…</div>;
}

export function App() {
  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Introduction />} />
          <Route path="quick-start" element={<QuickStart />} />
          <Route path="installation" element={<Installation />} />
          <Route path="cli-reference" element={<CliReference />} />
          <Route path="mcp-server-management" element={<McpServerManagement />} />
          <Route path="agents" element={<Agents />} />
          <Route path="skills" element={<Skills />} />
          <Route path="steering" element={<Steering />} />
          <Route path="sdk-api" element={<SdkApi />} />
          <Route path="contributing" element={<Contributing />} />
          <Route path="maintaining" element={<Maintaining />} />
          <Route path="publishing" element={<Publishing />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
```

### 13.6 Navigation Data

**`docs/src/nav.ts`:**

```typescript
export type NavItem = { label: string; path: string };
export type NavGroup = { title: string; items: NavItem[] };

export const nav: NavGroup[] = [
  {
    title: 'Getting Started',
    items: [
      { label: 'Introduction', path: '/' },
      { label: 'Quick Start', path: '/quick-start' },
      { label: 'Installation', path: '/installation' },
    ],
  },
  {
    title: 'CLI',
    items: [
      { label: 'CLI Reference', path: '/cli-reference' },
      { label: 'MCP Server Management', path: '/mcp-server-management' },
    ],
  },
  {
    title: 'Resources',
    items: [
      { label: 'Agents', path: '/agents' },
      { label: 'Skills', path: '/skills' },
      { label: 'Steering Templates', path: '/steering' },
      { label: 'SDK / API', path: '/sdk-api' },
    ],
  },
  {
    title: 'Contributing',
    items: [
      { label: 'Contributing Guide', path: '/contributing' },
      { label: 'Maintaining', path: '/maintaining' },
      { label: 'Publishing', path: '/publishing' },
    ],
  },
];
```

4 groups, 12 items total. Group titles are uppercase-styled in CSS.

### 13.7 Layout Component

**`docs/src/components/Layout.tsx`:**

```typescript
import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { TableOfContents } from './TableOfContents';
import { MDXProvider } from './mdx/MDXProvider';

export function Layout() {
  return (
    <div className="layout">
      <Header />
      <Sidebar />
      <main className="content">
        <MDXProvider>
          <Outlet />
        </MDXProvider>
      </main>
      <TableOfContents />
    </div>
  );
}
```

CSS Grid layout: `grid-template-columns: var(--sidebar-width) 1fr var(--toc-width)`, `grid-template-rows: var(--header-height) 1fr`. Header spans all columns (`grid-column: 1 / -1`). Sidebar, content, and ToC are all in `grid-row: 2`.

### 13.8 Header Component

**`docs/src/components/Header.tsx`:**

```typescript
import { Github, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';

export function Header() {
  return (
    <header className="header">
      <Link to="/" className="header-logo">
        ⚡ <span>Kiro Agents</span>
      </Link>
      <div className="header-links">
        <a href="https://kiro.dev/docs/cli/" target="_blank" rel="noreferrer">
          Kiro CLI <ExternalLink size={12} />
        </a>
        <a href="https://gitlab.spectrumflow.net/spectrum-consulting/kiro/kiro-shared" target="_blank" rel="noreferrer">
          <Github size={18} />
        </a>
      </div>
    </header>
  );
}
```

- Logo: `⚡` emoji + `<span>` with gradient text (`var(--gradient-hero)` via `-webkit-background-clip: text`)
- Sticky header with `backdrop-filter: blur(12px)` and semi-transparent background via `color-mix(in srgb, var(--bg) 85%, transparent)`
- Two external links: "Kiro CLI" text with ExternalLink icon (12px), GitHub icon (18px)

### 13.9 Sidebar Component

**`docs/src/components/Sidebar.tsx`:**

```typescript
import { NavLink } from 'react-router-dom';
import { nav } from '../nav';

export function Sidebar() {
  return (
    <aside className="sidebar">
      {nav.map((group) => (
        <div key={group.title} className="sidebar-group">
          <div className="sidebar-group-title">{group.title}</div>
          {group.items.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
            >
              {item.label}
            </NavLink>
          ))}
        </div>
      ))}
    </aside>
  );
}
```

- Sticky sidebar: `position: sticky`, `top: var(--header-height)`, `height: calc(100vh - var(--header-height))`, `overflow-y: auto`
- Group titles: `0.7rem`, uppercase, `letter-spacing: 0.08em`, tertiary color
- Links: `0.875rem`, `border-left: 2px solid transparent`, active state gets `var(--border-active)` left border + `var(--bg-active)` background + `var(--text-active)` color + `font-weight: 500`

### 13.10 Table of Contents Component

**`docs/src/components/TableOfContents.tsx`:**

```typescript
import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

type Heading = { id: string; text: string; depth: number };

export function TableOfContents() {
  const [headings, setHeadings] = useState<Heading[]>([]);
  const [active, setActive] = useState('');
  const { pathname } = useLocation();

  useEffect(() => {
    const els = document.querySelectorAll('.content h2, .content h3');
    const items: Heading[] = Array.from(els).map((el) => ({
      id: el.id || slugify(el.textContent ?? ''),
      text: el.textContent ?? '',
      depth: el.tagName === 'H3' ? 3 : 2,
    }));
    els.forEach((el, i) => { if (!el.id && items[i]) el.id = items[i].id; });
    setHeadings(items);
  }, [pathname]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) { setActive(e.target.id); break; }
        }
      },
      { rootMargin: '-80px 0px -60% 0px' },
    );
    headings.forEach((h) => {
      const el = document.getElementById(h.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [headings]);

  if (headings.length === 0) return null;

  return (
    <nav className="toc">
      <div className="toc-title">On this page</div>
      {headings.map((h) => (
        <a
          key={h.id}
          href={`#${h.id}`}
          className={`${h.depth === 3 ? 'depth-3' : ''}${active === h.id ? ' active' : ''}`}
        >
          {h.text}
        </a>
      ))}
    </nav>
  );
}

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}
```

Behavior:
1. On `pathname` change: queries all `h2` and `h3` inside `.content`, builds heading list, assigns IDs to elements that lack them
2. `IntersectionObserver` with `rootMargin: '-80px 0px -60% 0px'` — 80px top offset (header clearance), bottom 60% ignored. First intersecting entry wins.
3. Returns `null` if no headings found (empty page)
4. `depth-3` class on h3 links adds `padding-left: 24px` (vs 12px for h2)
5. Active link gets `var(--text-active)` color and `var(--border-active)` left border

### 13.11 MDX Components

**`docs/src/components/mdx/MDXProvider.tsx`:**

```typescript
import type { ReactNode, ComponentPropsWithoutRef } from 'react';
import { Callout } from './Callout';
import { Card, CardGrid } from './Card';
import { Steps, Step } from './Steps';

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function heading(Tag: 'h2' | 'h3') {
  return function HeadingComponent(props: ComponentPropsWithoutRef<'h2'>) {
    const text = typeof props.children === 'string' ? props.children : '';
    const id = props.id || slugify(text);
    return <Tag {...props} id={id} />;
  };
}

const components = {
  h2: heading('h2'),
  h3: heading('h3'),
  Callout,
  Card,
  CardGrid,
  Steps,
  Step,
};

export function MDXProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

export { components };
```

Note: The `components` object is exported but MDX files import components directly via relative paths (MDX v3 pattern). The `MDXProvider` wrapper is a passthrough — it does not use React context injection.

**`docs/src/components/mdx/Callout.tsx`:**

```typescript
import type { ReactNode } from 'react';
import { Info, AlertTriangle, AlertCircle, Lightbulb } from 'lucide-react';

type Variant = 'info' | 'warning' | 'error' | 'tip';

const icons: Record<Variant, ReactNode> = {
  info: <Info size={18} />,
  warning: <AlertTriangle size={18} />,
  error: <AlertCircle size={18} />,
  tip: <Lightbulb size={18} />,
};

export function Callout({ variant = 'info', children }: { variant?: Variant; children: ReactNode }) {
  return (
    <div className={`callout callout-${variant}`}>
      <span className="callout-icon">{icons[variant]}</span>
      <div>{children}</div>
    </div>
  );
}
```

4 variants with distinct colors (see CSS tokens below). Default variant: `info`. Layout: flex row with 12px gap, icon flex-shrink 0.

**`docs/src/components/mdx/Card.tsx`:**

```typescript
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

export function Card({ title, icon, href, children }: { title: string; icon?: ReactNode; href?: string; children: ReactNode }) {
  const inner = (
    <>
      {icon && <div className="card-icon">{icon}</div>}
      <div className="card-title">{title}</div>
      <div className="card-desc">{children}</div>
    </>
  );
  if (href?.startsWith('/')) return <Link to={href} className="card">{inner}</Link>;
  if (href) return <a href={href} className="card" target="_blank" rel="noreferrer">{inner}</a>;
  return <div className="card">{inner}</div>;
}

export function CardGrid({ children }: { children: ReactNode }) {
  return <div className="card-grid">{children}</div>;
}
```

Three rendering modes: internal link (React Router `Link`), external link (`<a target="_blank">`), or static `<div>`. `CardGrid` uses CSS Grid with `auto-fill, minmax(240px, 1fr)`.

**`docs/src/components/mdx/Steps.tsx`:**

```typescript
import type { ReactNode } from 'react';

export function Steps({ children }: { children: ReactNode }) {
  return <ol className="steps">{children}</ol>;
}

export function Step({ title, children }: { title: string; children: ReactNode }) {
  return (
    <li className="step">
      <div className="step-title">{title}</div>
      <div>{children}</div>
    </li>
  );
}
```

Uses CSS `counter-reset: step` on `.steps` and `counter-increment: step` on `.step::before` to render numbered circles. Each step has a left border line connecting to the next; last step has `border-left-color: transparent`.

### 13.12 Complete CSS (`docs/src/styles/global.css`)

The entire stylesheet is reproduced here since pixel-accurate recreation requires every token and rule.

**Design Tokens (Light Theme — `:root`):**

```css
--font-sans: 'Fira Sans', -apple-system, BlinkMacSystemFont, sans-serif;
--font-mono: 'JetBrains Mono', ui-monospace, monospace;

--bg: #ffffff;
--bg-secondary: #f8fafc;
--bg-tertiary: #f1f5f9;
--bg-code: #0f172a;
--bg-sidebar: #ffffff;
--bg-hover: #f1f5f9;
--bg-active: #ede9fe;
--bg-callout-info: #eff6ff;
--bg-callout-warn: #fffbeb;
--bg-callout-error: #fef2f2;
--bg-callout-tip: #f0fdf4;
--bg-card: #ffffff;

--text: #0f172a;
--text-secondary: #475569;
--text-tertiary: #94a3b8;
--text-link: #7c3aed;
--text-code: #e2e8f0;
--text-active: #7c3aed;

--border: #e2e8f0;
--border-active: #7c3aed;
--border-callout-info: #3b82f6;
--border-callout-warn: #f59e0b;
--border-callout-error: #ef4444;
--border-callout-tip: #22c55e;

--accent: #7c3aed;
--accent-light: #ede9fe;
--gradient-hero: linear-gradient(135deg, #7c3aed 0%, #2563eb 100%);

--sidebar-width: 260px;
--toc-width: 220px;
--header-height: 60px;
--content-max: 740px;
--radius: 8px;
--radius-lg: 12px;

color-scheme: light;
```

**Design Tokens (Dark Theme — `@media (prefers-color-scheme: dark)`):**

```css
--bg: #0b0f1a;
--bg-secondary: #111827;
--bg-tertiary: #1e293b;
--bg-code: #0d1117;
--bg-sidebar: #0f1629;
--bg-hover: #1e293b;
--bg-active: #1e1b4b;
--bg-callout-info: #0c1929;
--bg-callout-warn: #1c1a05;
--bg-callout-error: #1f0a0a;
--bg-callout-tip: #052e16;
--bg-card: #111827;

--text: #f1f5f9;
--text-secondary: #94a3b8;
--text-tertiary: #64748b;
--text-link: #a78bfa;
--text-code: #e2e8f0;
--text-active: #a78bfa;

--border: #1e293b;
--border-active: #a78bfa;
--accent: #a78bfa;
--accent-light: #1e1b4b;

color-scheme: dark;
```

Theme switching is automatic via `prefers-color-scheme` media query — no JS toggle, no class-based switching.

**Reset:**
```css
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
```

**Base:**
```css
html { font-size: 16px; scroll-behavior: smooth; }
body {
  font-family: var(--font-sans);
  background: var(--bg);
  color: var(--text);
  line-height: 1.7;
  -webkit-font-smoothing: antialiased;
}
```

**Layout Grid:**
```css
.layout {
  display: grid;
  grid-template-columns: var(--sidebar-width) 1fr var(--toc-width);
  grid-template-rows: var(--header-height) 1fr;
  min-height: 100vh;
}
```

**Header:**
```css
.header {
  grid-column: 1 / -1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  border-bottom: 1px solid var(--border);
  position: sticky;
  top: 0;
  z-index: 50;
  backdrop-filter: blur(12px);
  background: color-mix(in srgb, var(--bg) 85%, transparent);
}
.header-logo {
  display: flex; align-items: center; gap: 10px;
  font-weight: 700; font-size: 1.05rem;
  color: var(--text); text-decoration: none;
}
.header-logo span {
  background: var(--gradient-hero);
  -webkit-background-clip: text; -webkit-text-fill-color: transparent;
  background-clip: text;
}
.header-links { display: flex; align-items: center; gap: 16px; }
.header-links a {
  color: var(--text-secondary); text-decoration: none;
  font-size: 0.875rem; font-weight: 500; transition: color 0.15s;
}
.header-links a:hover { color: var(--text); }
```

**Sidebar:**
```css
.sidebar {
  grid-row: 2;
  border-right: 1px solid var(--border);
  background: var(--bg-sidebar);
  padding: 20px 0;
  overflow-y: auto;
  position: sticky;
  top: var(--header-height);
  height: calc(100vh - var(--header-height));
}
.sidebar-group { margin-bottom: 20px; }
.sidebar-group-title {
  padding: 0 20px; font-size: 0.7rem; font-weight: 600;
  text-transform: uppercase; letter-spacing: 0.08em;
  color: var(--text-tertiary); margin-bottom: 6px;
}
.sidebar-link {
  display: block; padding: 6px 20px; font-size: 0.875rem;
  color: var(--text-secondary); text-decoration: none;
  border-left: 2px solid transparent; transition: all 0.15s;
}
.sidebar-link:hover { color: var(--text); background: var(--bg-hover); }
.sidebar-link.active {
  color: var(--text-active); border-left-color: var(--border-active);
  background: var(--bg-active); font-weight: 500;
}
```

**Content Area:**
```css
.content {
  grid-row: 2;
  padding: 40px 48px 80px;
  max-width: calc(var(--content-max) + 96px);
  min-width: 0;
}
```

**Table of Contents:**
```css
.toc {
  grid-row: 2; padding: 24px 16px;
  position: sticky; top: var(--header-height);
  height: calc(100vh - var(--header-height));
  overflow-y: auto; font-size: 0.8rem;
}
.toc-title {
  font-size: 0.7rem; font-weight: 600; text-transform: uppercase;
  letter-spacing: 0.08em; color: var(--text-tertiary); margin-bottom: 12px;
}
.toc a {
  display: block; padding: 3px 0 3px 12px;
  color: var(--text-tertiary); text-decoration: none;
  border-left: 1px solid var(--border); transition: all 0.15s;
}
.toc a:hover { color: var(--text-secondary); }
.toc a.active { color: var(--text-active); border-left-color: var(--border-active); }
.toc a.depth-3 { padding-left: 24px; }
```

**Typography (MDX content):**
```css
.content h1 {
  font-size: 2rem; font-weight: 700; letter-spacing: -0.02em;
  margin-bottom: 8px; line-height: 1.2;
}
.content h1 + p { color: var(--text-secondary); font-size: 1.1rem; margin-bottom: 32px; }
.content h2 {
  font-size: 1.4rem; font-weight: 600; margin-top: 48px; margin-bottom: 16px;
  padding-bottom: 8px; border-bottom: 1px solid var(--border); letter-spacing: -0.01em;
}
.content h3 { font-size: 1.1rem; font-weight: 600; margin-top: 32px; margin-bottom: 12px; }
.content p { margin-bottom: 16px; }
.content a { color: var(--text-link); text-decoration: none; font-weight: 500; }
.content a:hover { text-decoration: underline; }
.content ul, .content ol { margin-bottom: 16px; padding-left: 24px; }
.content li { margin-bottom: 6px; }
.content li::marker { color: var(--text-tertiary); }
.content strong { font-weight: 600; }
.content code {
  font-family: var(--font-mono); font-size: 0.875em;
  background: var(--bg-tertiary); padding: 2px 6px; border-radius: 4px;
}
.content pre {
  background: var(--bg-code) !important; border-radius: var(--radius);
  padding: 20px; margin-bottom: 20px; overflow-x: auto;
  font-size: 0.85rem; line-height: 1.6; border: 1px solid var(--border);
}
.content pre code { background: none; padding: 0; color: var(--text-code); font-size: inherit; }
```

**Tables:**
```css
.content table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 0.9rem; }
.content th {
  text-align: left; font-weight: 600; padding: 10px 12px;
  border-bottom: 2px solid var(--border); font-size: 0.8rem;
  text-transform: uppercase; letter-spacing: 0.04em; color: var(--text-secondary);
}
.content td { padding: 10px 12px; border-bottom: 1px solid var(--border); }
.content tr:last-child td { border-bottom: none; }
```

**Blockquote & HR:**
```css
.content blockquote {
  border-left: 3px solid var(--accent); padding: 12px 16px;
  margin-bottom: 16px; background: var(--bg-secondary);
  border-radius: 0 var(--radius) var(--radius) 0; color: var(--text-secondary);
}
.content hr { border: none; border-top: 1px solid var(--border); margin: 32px 0; }
```

**Callout:**
```css
.callout {
  display: flex; gap: 12px; padding: 16px; border-radius: var(--radius);
  margin-bottom: 20px; border-left: 3px solid; font-size: 0.9rem;
}
.callout-icon { flex-shrink: 0; margin-top: 1px; }
.callout-info { background: var(--bg-callout-info); border-color: var(--border-callout-info); }
.callout-warning { background: var(--bg-callout-warn); border-color: var(--border-callout-warn); }
.callout-error { background: var(--bg-callout-error); border-color: var(--border-callout-error); }
.callout-tip { background: var(--bg-callout-tip); border-color: var(--border-callout-tip); }
```

**Card & CardGrid:**
```css
.card-grid {
  display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 16px; margin-bottom: 24px;
}
.card {
  background: var(--bg-card); border: 1px solid var(--border);
  border-radius: var(--radius-lg); padding: 20px;
  text-decoration: none; color: var(--text); transition: all 0.2s;
}
.card:hover {
  border-color: var(--accent);
  box-shadow: 0 4px 12px color-mix(in srgb, var(--accent) 10%, transparent);
  transform: translateY(-1px);
}
.card-icon { margin-bottom: 10px; color: var(--accent); }
.card-title { font-weight: 600; margin-bottom: 4px; font-size: 0.95rem; }
.card-desc { color: var(--text-secondary); font-size: 0.85rem; line-height: 1.5; }
```

**Steps:**
```css
.steps { margin-bottom: 24px; padding-left: 0; list-style: none; counter-reset: step; }
.step {
  position: relative; padding-left: 40px; padding-bottom: 24px;
  border-left: 2px solid var(--border); margin-left: 14px;
}
.step:last-child { border-left-color: transparent; }
.step::before {
  counter-increment: step; content: counter(step);
  position: absolute; left: -15px; top: 0;
  width: 28px; height: 28px; border-radius: 50%;
  background: var(--accent); color: white;
  font-size: 0.8rem; font-weight: 600;
  display: flex; align-items: center; justify-content: center;
}
.step-title { font-weight: 600; margin-bottom: 4px; }
```

**Responsive Breakpoints:**
```css
@media (max-width: 1100px) {
  .layout { grid-template-columns: var(--sidebar-width) 1fr; }
  .toc { display: none; }
}
@media (max-width: 768px) {
  .layout { grid-template-columns: 1fr; }
  .sidebar { display: none; }
  .content { padding: 24px 20px 60px; }
}
```

At 1100px: ToC hidden, layout becomes 2-column. At 768px: sidebar also hidden, layout becomes single-column with reduced padding.

### 13.13 MDX Content Pages

12 MDX files in `docs/content/`. No frontmatter is used — files are raw MDX with optional component imports at the top. Content is derived from the root `README.md` but condensed and reorganized for the docs site.

**Component import pattern:** MDX files import components directly via relative paths (MDX v3 per-file import pattern, not provider injection):
```typescript
import { Callout } from '../src/components/mdx/Callout';
import { Steps, Step } from '../src/components/mdx/Steps';
import { Card, CardGrid } from '../src/components/mdx/Card';
```

**Content inventory:**

| File | Size | Imports | Custom Components Used | Content Summary |
|------|------|---------|----------------------|-----------------|
| `introduction.mdx` | 1.9KB | `Rocket, Bot, Server, GitPullRequest` from lucide-react; `Card, CardGrid` | CardGrid with 4 Cards (icons + internal links) | Package overview, "What's Included" bullet list, "How It Works" with code block |
| `quick-start.mdx` | 864B | `Callout`; `Steps, Step` | Steps (5 steps with bash code blocks), Callout (tip) | 5-step install-to-chat walkthrough |
| `installation.mdx` | 1.2KB | `Callout` | Callout (info) | Registry install commands, prerequisites, CLI aliases table |
| `cli-reference.mdx` | 3.6KB | _(none)_ | _(none)_ | All 12 CLI commands with usage examples, option tables, code blocks |
| `mcp-server-management.mdx` | 4.5KB | `Callout`; `Steps, Step` | Callout (warning), Steps (5-step workflow) | MCP integrate/scaffold/generate docs, bundled servers table, generated structure tree |
| `agents.mdx` | 2.0KB | _(none)_ | _(none)_ | Agent table (10 agents with shortcuts, descriptions, skills), usage instructions |
| `skills.mdx` | 1.9KB | _(none)_ | _(none)_ | Skills table (16 skills), creation and referencing instructions |
| `steering.mdx` | 1.3KB | _(none)_ | _(none)_ | Steering templates table (6 templates with priority), setup and examples |
| `sdk-api.mdx` | 2.7KB | `Callout` | Callout (info) | SDK exports table, TypeScript interfaces, dual entrypoints |
| `contributing.mdx` | 2.9KB | `Steps, Step` | Steps (5-step agent creation) | Adding agents/skills, registry submission, config convention, prompt format |
| `maintaining.mdx` | 5.3KB | _(none)_ | _(none)_ | Prerequisites, building, test structure table (18 files), project structure tree, build system |
| `publishing.mdx` | 1.0KB | `Callout` | Callout (warning) | Release commands, CI pipeline stages table |

**MDX content patterns:**
- All pages start with `# Title` as h1
- Sections use `## Heading` (h2) and `### Subheading` (h3)
- Code blocks use triple backticks with language identifiers (`bash`, `typescript`, `json`, `jsonc`, `markdown`)
- Tables use GFM pipe syntax (enabled by `remark-gfm`)
- Bold text for emphasis within paragraphs and list items
- Inline code for CLI commands, file paths, package names, and config keys

### 13.14 File Structure Summary

```
docs/
├── content/
│   ├── introduction.mdx          # Home page — CardGrid, lucide icons
│   ├── quick-start.mdx           # Steps + Callout
│   ├── installation.mdx          # Callout
│   ├── cli-reference.mdx         # Pure markdown, tables + code
│   ├── mcp-server-management.mdx # Callout + Steps
│   ├── agents.mdx                # Pure markdown, table
│   ├── skills.mdx                # Pure markdown, table
│   ├── steering.mdx              # Pure markdown, table
│   ├── sdk-api.mdx               # Callout
│   ├── contributing.mdx          # Steps
│   ├── maintaining.mdx           # Pure markdown, tables + tree
│   └── publishing.mdx            # Callout
├── src/
│   ├── components/
│   │   ├── mdx/
│   │   │   ├── MDXProvider.tsx    # Component exports + heading slugifier
│   │   │   ├── Callout.tsx       # 4-variant callout with lucide icons
│   │   │   ├── Card.tsx          # Card + CardGrid (link/static modes)
│   │   │   └── Steps.tsx         # Ordered steps with CSS counters
│   │   ├── Header.tsx            # Sticky header with gradient logo
│   │   ├── Layout.tsx            # CSS Grid 3-column layout
│   │   ├── Sidebar.tsx           # NavLink-based navigation
│   │   └── TableOfContents.tsx   # IntersectionObserver heading tracker
│   ├── styles/
│   │   └── global.css            # Complete stylesheet (light/dark themes)
│   ├── App.tsx                   # 12 lazy-loaded routes
│   ├── main.tsx                  # StrictMode → BrowserRouter → App
│   ├── nav.ts                    # 4 groups, 12 nav items
│   └── vite-env.d.ts            # Vite client + MDX module declaration
├── index.html                    # Google Fonts, root div, module script
├── package.json                  # Private workspace package
├── tsconfig.json                 # ES2022, react-jsx, bundler resolution
└── vite.config.ts                # MDX + React plugins, @ alias

```

### 13.15 Design Decisions

- **No SSR/SSG** — pure client-side SPA with lazy-loaded routes
- **No syntax highlighting integration** — `shiki` is listed as a dependency but not wired into the MDX pipeline or any component; code blocks render with `--bg-code` background and `--text-code` color only
- **No mobile menu** — sidebar simply hides at 768px with no hamburger toggle
- **OS-level dark mode** — uses `prefers-color-scheme` media query, no manual toggle
- **MDX v3 per-file imports** — components are imported directly in each MDX file rather than injected via provider context
- **No frontmatter** — MDX files have no YAML frontmatter; routing is defined entirely in `App.tsx`
- **Heading IDs** — generated at runtime by both `MDXProvider` (for h2/h3 rendering) and `TableOfContents` (for observer targets), using the same `slugify()` function
- **`color-mix()` for transparency** — header background uses `color-mix(in srgb, var(--bg) 85%, transparent)` for the frosted glass effect, and card hover shadow uses `color-mix(in srgb, var(--accent) 10%, transparent)`

---
## 14. Test Suite

### Test Infrastructure

- **Runner**: `bun:test` (built-in Bun test runner)
- **Total**: 142 tests across 18 files
- **Categories**: Unit (helpers, install, config, commands, registry), CLI integration (subprocess), E2E (full lifecycle)

### Test Patterns

**Temp directory management:**
```typescript
let tmp: string;
beforeEach(() => {
  tmp = join(tmpdir(), `kiro-test-<module>-${Date.now()}`);
  mkdirSync(tmp, { recursive: true });
});
afterEach(() => {
  rmSync(tmp, { recursive: true, force: true });
});
```

**Console capture:**
```typescript
const spy = spyOn(console, 'log').mockImplementation(() => {});
// ... run command ...
const output = spy.mock.calls.flat().join('\n');
expect(output).toContain('expected text');
spy.mockRestore();
```

**ANSI strip helper:**
```typescript
const strip = (s: string) => s.replace(/\u001b\[[0-9;]*m/g, '');
```

**CLI subprocess testing:**
```typescript
async function run(...args: string[]) {
  const proc = Bun.spawn(['bun', CLI, ...args], {
    cwd: ROOT,
    env: { ...process.env, KIRO_SHARED_ROOT: ROOT },
    stdout: 'pipe', stderr: 'pipe',
  });
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  return { stdout, stderr, exitCode: await proc.exited };
}
```

**Exit code cleanup:**
```typescript
afterAll(() => { process.exitCode = 0; });
```

**Process.cwd mocking (for commands that use cwd):**
```typescript
spyOn(process, 'cwd').mockReturnValue(tmp);
```

### Test Coverage Map

| File | Tests | Module Under Test |
|------|-------|-------------------|
| `test/helpers.test.ts` | 15 | `getAvailableAgents` (3), `loadAgentConfig` (3), `ensureDir` (2), `copyIfExists` (3), `parseSkillUri` (3), `resolveSkillPath` (1) |
| `test/install.test.ts` | 8 | `getAvailableAgents` re-export (1), `installAgent`: config+prompt copy (1), context copy (1), skill install+URI rewrite (1), nonexistent agent error (1), missing fields error (1), missing prompt warning (1), global path label (1) |
| `test/config.test.ts` | 11 | `getConfig`: missing (1), invalid JSON (1), valid (1). `getConfigValue`: top-level (1), nested dot-notation (1), missing key (1), missing nested (1). `setConfigValue`: create file (1), nested with intermediates (1), preserve existing (1), overwrite (1) |
| `test/commands/info.test.ts` | 2 | Agent details display (1), unknown agent error (1) |
| `test/commands/validate.test.ts` | 7 | Valid pass (1), missing fields (1), invalid JSON (1), missing prompt (1), missing skill (1), optional field warnings (1), batch validation (1) |
| `test/commands/init.test.ts` | 6 | Scaffold config+prompt (1), custom description (1), custom tools (1), keyboard shortcut (1), duplicate detection (1), prompt identity section (1) |
| `test/commands/create-skill.test.ts` | 4 | Scaffold SKILL.md (1), custom description (1), duplicate detection (1), heading capitalization (1) |
| `test/commands/uninstall.test.ts` | 5 | Remove agent+orphaned skills (1), preserve shared skills (1), remove context (1), no agents error (1), not installed error (1) |
| `test/commands/config.test.ts` | 6 | Set+get roundtrip (1), boolean coercion (1), number coercion (1), missing key display (1), invalid usage error (1), set without value error (1) |
| `test/commands/history.test.ts` | 7 | History not enabled error (1), empty history (1), list events (1), filter by target (1), filter by action (1), event detail (1), nonexistent event (1) |
| `test/commands/rollback.test.ts` | 5 | History not enabled error (1), restore from snapshot (1), dry-run (1), missing snapshot (1), nonexistent event (1) |
| `test/commands/submit.test.ts` | 3 | Invalid type rejection (1), skill submission error (1), agent submission error (1) |
| `test/commands/search.test.ts` | 3 | Results display (1), no results (1), deep search (1) |
| `test/registry/schemas.test.ts` | 19 | SkillMetadataSchema: valid (1), non-kebab (2), leading/trailing hyphens (1), description length (2), invalid semver (1), empty author (1), tags bounds (2). AgentSubmissionSchema: valid (1), short prompt (1), empty tools (1), optional fields (2). SkillSubmissionSchema: valid (1), short content (1). RegistrySubmissionSchema: agent routing (1), skill routing (1), unknown type (1) |
| `test/registry/submit.test.ts` | 10 | `parseFrontmatter`: valid (1), array values (1), no frontmatter (1), empty frontmatter (1), invalid YAML (1). `formatIssueBody`: skill (1), agent (1), no skills (1). `submitSkill` not found (1). `submitAgent` not found (1) |
| `test/registry/search.test.ts` | 14 | `searchBundled`: by name (1), by description (1), agents by name (1), agents by description (1), both types (1), no matches (1), case-insensitive (1), missing dirs (1), invalid JSON skip (1). `deepSearchBundled`: skill body (1), agent prompt (1), excludes shallow (1), no matches (1), fuzzy typo tolerance (1) |
| `test/cli.test.ts` | 9 | Version output (1), help commands (1), list agents (1), info details (1), info error (1), validate pass (1), unknown command (1), search bundled (1), submit invalid type (1) |
| `test/e2e.test.ts` | 8 | Full lifecycle install→verify→uninstall (1), install all+uninstall one (1), init→uninstall custom (1), create-skill (1), validate all real agents (1), search bundled (1), submit without token (1), submit with PAT env var (1, conditional) |

### NPM Scripts

```json
{
  "test": "bun test",
  "test:unit": "bun test test/helpers.test.ts test/install.test.ts test/config.test.ts test/commands/ test/registry/",
  "test:cli": "bun test test/cli.test.ts",
  "test:e2e": "bun test test/e2e.test.ts"
}
```

---

## 15. Release & Publishing

### Release Script (`scripts/release.sh`)

Bash script with `set -euo pipefail`. Supports:

| Command | Example |
|---------|---------|
| `patch` | `1.0.0` → `1.0.1` |
| `minor` | `1.0.0` → `1.1.0` |
| `major` | `1.0.0` → `2.0.0` |
| `prerelease <tag>` | `1.0.0-nix.1` → `1.0.0-nix.2` (or `1.0.0` → `1.0.1-nix.0`) |
| `<explicit version>` | Any valid semver |

Algorithm:
1. Read current version from `package.json` via `jq`
2. Compute next version based on bump type
3. Prompt for confirmation
4. Update `package.json` via `jq`
5. Run `bun run build` to verify
6. `git add package.json && git commit -m "release: v<version>" && git tag v<version>`
7. Prompt to push (`git push && git push --tags`)

### CI Pipeline (GitLab CI)

Stages: `install_dependencies` → `build` → `version` → `publish-dry-run` → `publish`

- `publish-dry-run` runs on every branch
- `publish` runs only on semver git tags (`v*`)
- Validates tag matches `package.json` version before publishing
- Publishes to Artifactory with `ARTIFACTORY_EMAIL` and `ARTIFACTORY_API_KEY` CI variables

### NPM Scripts

```json
{
  "release": "./scripts/release.sh",
  "release:pre": "./scripts/release.sh prerelease nix",
  "release:patch": "./scripts/release.sh patch",
  "release:minor": "./scripts/release.sh minor",
  "release:major": "./scripts/release.sh major"
}
```

---

## 16. Key Design Decisions & Conventions

### Code Style
- **ESM only** — no CommonJS interop guaranteed
- **`.js` extension imports** — all internal imports use `.js` extension (resolved by bundler to `.ts`)
- **Synchronous fs operations** — all file I/O uses `node:fs` sync APIs (not `fs/promises`)
- **No classes** — entire codebase uses functions and interfaces only
- **Explicit type imports** — `verbatimModuleSyntax` enforces `import type` for type-only imports
- **Error handling** — `process.exitCode = 1` (not `process.exit(1)`) for non-fatal errors

### Architecture Patterns
- **History never blocks** — all `recordEvent()` calls wrapped in try-catch, failures silently ignored
- **Runtime detection** — SQLite uses `bun:sqlite` first, falls back to `node:sqlite`, warns once if neither available
- **Skill URI rewriting** — during install, `skill://kiro/skills/<name>/SKILL.md` is rewritten to `skill://.kiro/skills/<name>/SKILL.md`
- **Orphan cleanup** — uninstall removes skills only if no other installed agent references them
- **Template system** — `{{PLACEHOLDER}}` syntax with `replaceAll()` for MCP scaffold and steering templates
- **Deduplication** — registry search deduplicates by `${type}:${name}`, bundled results take priority

### Environment Variables
- `KIRO_SHARED_ROOT` — package root directory (set by bin entrypoints)
- `KIRO_REGISTRY_PAT` — optional, used in E2E tests for registry token

### File Locations
- Local config: `<cwd>/.kiro/nix-kiro.config.json`
- Global config: `~/.kiro/nix-kiro.config.json`
- Local history: `<cwd>/.kiro/history.db`
- Global history: `~/.kiro/history.db`
- Local MCP config: `<cwd>/.kiro/mcp.json`
- Global MCP config: `~/.kiro/mcp.json`
- Installed agents: `<target>/.kiro/agents/<name>.json`
- Installed prompts: `<target>/.kiro/agents/prompts/<name>.md`
- Installed skills: `<target>/.kiro/skills/<name>/SKILL.md`
- Installed context: `<target>/.kiro/agents/context/<name>/`
