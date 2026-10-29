# FF-05: BCP TypeScript Driver — Implementation Spec

## Goal

Create `@bit-context-protocol/driver` — a TypeScript package in the BCP repo that provides encode/decode/render capabilities for .bcp files. Ship as CLI wrapper immediately, fast-follow with WASM backend. Wire into cleo's smol mode for token-efficient context delivery.

## Architecture

### Phase 1: CLI Wrapper (`packages/driver`)

Location: `/home/nicks-dgx/dev/.RFCs/bit-context-protocol/packages/driver/`

```
packages/driver/
  src/
    index.ts          # Public API barrel export
    types.ts          # TypeScript types mirroring Rust driver config
    backend.ts        # Backend interface (CLI or WASM)
    backends/
      cli.ts          # CLI wrapper backend (shells out to `bcp` binary)
      wasm.ts         # WASM backend (Phase 2, stub for now)
    driver.ts         # Main driver class — delegates to active backend
    encoder.ts        # encode() — JSON manifest → .bcp binary
    decoder.ts        # decode() — .bcp binary → rendered text
    inspector.ts      # inspect() — .bcp file → block summary
  package.json
  tsconfig.json
```

### Public API Design

```typescript
// Types (mirror Rust DriverConfig)
type OutputMode = 'xml' | 'markdown' | 'minimal';
type ModelFamily = 'claude' | 'gpt' | 'gemini' | 'generic';
type Verbosity = 'full' | 'summary' | 'adaptive';

interface DriverConfig {
  mode?: OutputMode;        // default: 'xml'
  targetModel?: ModelFamily; // default: undefined
  tokenBudget?: number;     // default: undefined (no budget)
  verbosity?: Verbosity;    // default: 'adaptive'
}

interface BcpBlock {
  type: string;
  size: number;
  summary?: string;
  // ... per-block metadata
}

interface InspectResult {
  blockCount: number;
  totalSize: number;
  blocks: BcpBlock[];
}

interface DecodeResult {
  text: string;
  tokenEstimate?: number;
}

interface EncodeOptions {
  compress?: boolean;
}

// Main API
interface BcpDriver {
  decode(input: string | Uint8Array, config?: DriverConfig): Promise<DecodeResult>;
  encode(manifest: unknown, outputPath: string, options?: EncodeOptions): Promise<string>;
  inspect(input: string | Uint8Array): Promise<InspectResult>;
  validate(input: string | Uint8Array): Promise<{ valid: boolean; errors: string[] }>;
}

// Factory
function createDriver(options?: { backend?: 'cli' | 'wasm'; binaryPath?: string }): BcpDriver;
```

### Backend Interface

```typescript
interface BcpBackend {
  decode(filePath: string, mode: OutputMode, budget?: number): Promise<string>;
  encode(manifestPath: string, outputPath: string, compress: boolean): Promise<void>;
  inspect(filePath: string): Promise<string>;
  validate(filePath: string): Promise<{ valid: boolean; output: string }>;
  available(): Promise<boolean>;
}
```

The CLI backend is essentially the existing `bcp-cli.ts` from `bcp-mcp-server`, extracted and generalized. It spawns the `bcp` binary and parses stdout.

### Phase 2: WASM Backend

- Compile `bcp-encoder`, `bcp-decoder`, `bcp-driver` crates to `wasm32-wasi` or `wasm32-unknown-unknown`
- Use `wasm-bindgen` or `wasm-pack` to generate JS bindings
- Drop into `backends/wasm.ts` implementing the same `BcpBackend` interface
- No consumer API changes — `createDriver({ backend: 'wasm' })` or auto-detect

### Phase 3: Cleo Integration

Location: `apps/cleo/src/integrations/bcp.ts`

- Cleo's smol mode currently reduces context verbosity
- BCP integration: encode workspace context → .bcp → decode with token budget
- Integration point: when cleo prepares context for Claude Code sessions, optionally route through BCP driver
- Config: `cleo.config.ts` or CLI flag `--bcp` / `--budget <tokens>`

## Existing Code to Reuse

The MCP server already has a working CLI wrapper:
- `/home/nicks-dgx/dev/.RFCs/bit-context-protocol/packages/bcp-mcp-server/src/bcp-cli.ts` — `runBcpCli()`, `resolveBcpBinary()`, `validateBcpAvailable()`
- This should be extracted into `packages/driver/src/backends/cli.ts`

## Package Setup

```json
{
  "name": "@bit-context-protocol/driver",
  "version": "0.1.0-alpha.0",
  "type": "module",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js",
      "default": "./dist/index.js"
    }
  },
  "peerDependencies": {},
  "dependencies": {}
}
```

Zero runtime dependencies. The CLI backend uses `Bun.spawn()` (or `child_process.spawn` for Node compat).

## BCP Binary Availability

The Rust `bcp` CLI is NOT on PATH by default. The driver must handle this:
1. Check `BCP_CLI_PATH` env var
2. Check if `bcp` is on PATH
3. If neither: throw clear error with install instructions
4. Future: auto-download prebuilt binary (like `esbuild` does)

## Cleo Integration Points

Cleo's current architecture (from reviewing `apps/cleo/src/`):
- CLI entry: `src/cli.ts` with cac
- Has existing smol mode concept
- Registry system for extensions

The BCP integration should be:
1. Add `@bit-context-protocol/driver` as a dependency of `@bundt/cleo`
2. Create `src/integrations/bcp.ts` adapter
3. Wire into context preparation pipeline
4. Add `--bcp` flag and `--budget <n>` option to relevant commands

## Acceptance Criteria

### Phase 1 (CLI wrapper)
- [ ] `@bit-context-protocol/driver` package exists in BCP repo
- [ ] `createDriver()` returns a working driver with CLI backend
- [ ] `decode()`, `encode()`, `inspect()`, `validate()` all work
- [ ] Graceful error when `bcp` binary not found
- [ ] Published to npm as `@bit-context-protocol/driver@0.1.0-alpha.0`
- [ ] Tests pass

### Phase 2 (WASM)
- [ ] WASM build of bcp-encoder + bcp-decoder + bcp-driver
- [ ] `createDriver({ backend: 'wasm' })` works without binary
- [ ] Same test suite passes with both backends
- [ ] Auto-detect: prefer WASM, fall back to CLI

### Phase 3 (Cleo integration)
- [ ] `@bundt/cleo` depends on `@bit-context-protocol/driver`
- [ ] Smol mode can use BCP for token-efficient context
- [ ] `--budget <tokens>` flag on relevant commands
- [ ] Local dev override documented in CLAUDE.md

## Cross-Repo Workflow

During development, use overrides in bundt's root `package.json`:

```json
{
  "overrides": {
    "@bit-context-protocol/driver": "file:///home/nicks-dgx/dev/.RFCs/bit-context-protocol/packages/driver"
  }
}
```

Remove override once published to npm.
