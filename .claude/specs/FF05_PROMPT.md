# Prompt: FF-05 BCP TypeScript Driver Implementation

Use this prompt to continue the FF-05 work in a new Claude Code session.

---

## Context

I'm working on the bundt monorepo (`/home/nicks-dgx/dev/bundt/`) and the Bit Context Protocol repo (`/home/nicks-dgx/dev/.RFCs/bit-context-protocol/`).

We're implementing FF-05: creating a TypeScript driver package for BCP and integrating it into cleo. Read the full spec at `/home/nicks-dgx/dev/bundt/.claude/specs/FF05_BCP_DRIVER.md`.

## What's been done already

### FF-01 + FF-02 (Complete)
- Extracted common build tooling to `internal/build-utils/`
- Extracted common node shim to `internal/node-shim/`

### FF-03 (Complete)
- Unified release pipeline: `scripts/bump.ts`, `scripts/prerelease-check.ts`, `scripts/release.ts`
- All per-package release scripts removed, root scripts added
- Uses `cac` for CLI, `semver` for version computation

### FF-04 / Waavy (Partial — alpha-ready)
- Fixed broken build (`lib/` → `src/` path references)
- Fixed package.json exports and type declarations
- Replaced commander with cac across all CLI entry points
- Deleted dead Server.ts abstraction
- Replaced all enums with `as const` objects
- Added root `.` export, `tsconfig.build.json`, clean type emission
- Build passes, 69/69 tests pass

## Task: Implement FF-05

### Phase 1: Create `@bit-context-protocol/driver` in the BCP repo

1. Read the BCP repo structure: `ls /home/nicks-dgx/dev/.RFCs/bit-context-protocol/`
2. Read the existing CLI wrapper: `/home/nicks-dgx/dev/.RFCs/bit-context-protocol/packages/bcp-mcp-server/src/bcp-cli.ts`
3. Read the spec: `/home/nicks-dgx/dev/bundt/.claude/specs/FF05_BCP_DRIVER.md`
4. Create `packages/driver/` with the package structure described in the spec
5. Extract and generalize the CLI wrapper from bcp-mcp-server
6. Implement the public API: `createDriver()`, `decode()`, `encode()`, `inspect()`, `validate()`
7. Add tests
8. Verify typecheck and tests pass

Key design decisions:
- Backend interface pattern: `BcpBackend` interface with CLI and (future) WASM implementations
- `createDriver()` factory that auto-detects available backend
- Zero runtime dependencies
- The CLI backend spawns the `bcp` Rust binary — handle the case where it's not installed gracefully
- Cross-runtime: use `child_process.spawn` with Bun compat, not `Bun.spawn` directly

### Phase 2: WASM backend (fast-follow)

After Phase 1 ships:
- Set up wasm-pack or wasm-bindgen build for bcp-encoder + bcp-decoder + bcp-driver
- Implement `backends/wasm.ts` with the same `BcpBackend` interface
- Auto-detect: prefer WASM when available, fall back to CLI

### Phase 3: Cleo integration

After the driver is published:
1. Read cleo's source: `/home/nicks-dgx/dev/bundt/apps/cleo/src/`
2. Add `@bit-context-protocol/driver` to cleo's dependencies
3. Create `apps/cleo/src/integrations/bcp.ts`
4. Wire into cleo's smol mode / context preparation
5. Add `--budget <tokens>` flag

For local dev, add override to bundt's root package.json:
```json
"overrides": {
  "@bit-context-protocol/driver": "file:///home/nicks-dgx/dev/.RFCs/bit-context-protocol/packages/driver"
}
```

## Important conventions

- Read `/home/nicks-dgx/dev/bundt/CLAUDE.md` and `/home/nicks-dgx/dev/.RFCs/bit-context-protocol/.claude/` for project conventions
- No `any` types, no `enum`, no default exports, no `.js` extensions in TS imports
- Use `cac` for CLIs, `picocolors` for terminal colors
- Bun is the runtime, but the driver package should work in Node too (use `child_process` not `Bun.spawn`)
- The BCP repo uses `bun` as package manager and has its own workspace config
