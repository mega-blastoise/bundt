# Bundt Platform — Fast Follow Spec

**Scope**: Post-migration work to unify, harden, and prepare the bundt monorepo for release.
**Priority**: Ordered by dependency — earlier items unblock later ones.
**Convention**: Each section is self-contained and can be executed in a single session.

---

## FF-01: Extract Common Build Tooling

**Problem**: `concurrent_build()` is copy-pasted identically across cleo, dxdocs, and loclaude. Each package has its own `build/base.ts`, `build/utils.ts` with the same pattern. Waavy has a fourth variant.

**Solution**: Create `internal/build-utils/` as a shared internal package.

**Deliverables**:
- `internal/build-utils/src/concurrent-build.ts` — the shared `concurrent_build()` function
- `internal/build-utils/src/base-config.ts` — factory function for creating base `Bun.BuildConfig` with common defaults (esm, splitting: false, sourcemap: linked, packages: external)
- `internal/build-utils/src/index.ts` — barrel export
- `internal/build-utils/package.json` — `@bundt/internal-build-utils`, private, source-level exports
- Update `apps/cleo/build/`, `apps/dxdocs/build/`, `apps/loclaude/build/` to import from `@bundt/internal-build-utils`
- Update root `package.json` workspaces if needed
- Update `turbo.json` — build-utils has no deps, should be built first

**Acceptance**: All three apps build successfully using shared build utils. `bun run build` from root succeeds.

---

## FF-02: Extract Common Node Shim (Bun Detection + Installation)

**Problem**: `cleo.mjs`, `dxdocs.mjs`, and `loclaude.mjs` are near-identical Node entry points that detect Bun, offer to install it, and delegate to the Bun entry. They differ only in the package name string and the `.ts` filename.

**Solution**: Create a shared shim generator or a reusable module.

**Deliverables**:
- `internal/node-shim/src/index.ts` — exports a `createNodeShim(options: { name: string, binFilename: string })` function or a template
- Alternatively (simpler): a single `internal/node-shim/shim.mjs` that reads `package.json` name and resolves the `.ts` sibling automatically
- Update all three `bin/*.mjs` files to use the shared implementation
- Consider: the shim is a `.mjs` file run by Node, so it can't import TS directly. Options:
  - Pre-built JS module in the internal package
  - Template string approach where each package's `.mjs` is generated at build time
  - Thin wrapper that delegates to a shared `.mjs` in node_modules

**Acceptance**: All three CLIs work via both `bun bin/<name>.ts` and `node bin/<name>.mjs`. Bun detection and installation flow works.

---

## FF-03: Unify Release Pipeline

**Problem**: Each package has its own `scripts/bump.sh`, `scripts/release-commit.sh`, `scripts/tag.sh`, `scripts/prerelease-check.sh`. These are nearly identical with minor per-package differences (package name checks, extra sed commands). This doesn't scale and will drift.

**Solution**: Root-level release tooling that operates on any workspace package.

**Deliverables**:
- `scripts/bump.ts` — Bun script that takes `--package <name>` and `--type patch|minor|major|prerelease` with `--preid`. Updates the target package's `package.json`, `CHANGELOG.md`, and any version strings in source. Replaces all per-package `bump.sh` scripts.
- `scripts/release.ts` — Orchestrates: build → typecheck → prerelease-check → publish for a given package. Supports `--tag latest|alpha|beta|rc`.
- `scripts/prerelease-check.ts` — Generic checks: dist exists, entry points work, package.json valid, required files present. Parameterized by package path.
- `scripts/tag.ts` — Creates git tag in format `@bundt/<name>@<version>`.
- Update root `package.json` scripts:
  ```
  "release": "bun scripts/release.ts",
  "bump": "bun scripts/bump.ts"
  ```
- Remove per-package `scripts/` directories (cleo, dxdocs, loclaude)
- Update per-package `package.json` to reference root scripts or remove release-related scripts

**Tag format**: `@bundt/cleo@0.1.0`, `@bundt/dxdocs@0.1.0-alpha.2`, etc.

**Acceptance**: Can bump and release any package from root. `bun run bump --package @bundt/cleo --type patch` works. Git tags follow the convention.

---

## FF-04: Waavy Code Quality Pass

**Problem**: Waavy was ported with known code quality issues that conflict with bundt conventions.

**Deliverables** (in order):

### 4a: Remove `enum`, adopt `as const`
- `src/errors/index.ts` — replace `enum ErrorCodes` with `as const` object

### 4b: Replace default exports with named exports
- `src/server/models/Hydra.tsx` — `export class Hydra` (remove `export default`)
- `src/server/models/Server.ts` — already done during migration, verify
- `src/cli/RenderAction/Action.tsx` — `export const renderAction` (remove `export default`)
- `src/browser/index.tsx` — `export { waavy }` (remove `export default waavy`)
- `src/utils/log/index.ts` — `export { logger }` (remove `export default`)
- All other `export default` instances across the package
- Update all internal imports accordingly

### 4c: Converge on `cac`, remove `commander`
- `src/index.ts` (CLI entry) — rewrite from `commander` to `cac`, matching cleo/dxdocs/loclaude pattern
- `build/index.ts` — rewrite from `commander` to `cac` or use plain arg parsing
- `bin/waavy.js` — already uses `cac`, keep as-is
- Remove `commander` from `package.json` dependencies

### 4d: Replace `debug` + `printf` with simpler logging
- Replace `debug` usage with a lightweight namespaced logger using `picocolors` (already a dep)
- Remove `printf` dependency — use template literals or `console.log` format specifiers
- Remove `debug` and `printf` from `package.json` dependencies
- Remove `@types/debug` from devDependencies

### 4e: Fix empty catch blocks
- `src/server/index.tsx` line 31 — `catch (error) {}` in `writeStaticComponentToFile` should at minimum log the error
- `src/cli/RenderAction/Action.tsx` line 118 — empty catch on cache write should log warning
- Audit for any other swallowed errors

### 4f: Remove `process.exit()` from library code
- CLI actions (`BundleAction`, `RenderAction`, `SSGAction`) should throw or return error codes
- Only the top-level CLI entry (`src/index.ts` / `src/cli.ts`) should call `process.exit()`
- `src/server/models/Hydra.tsx` line 114 — `process.exit(1)` in `createBundle()` should throw

### 4g: Rewrite or delete `Server.ts`
- The `WaavyServer` / `AbstractWaavyServer` class hierarchy is unfinished:
  - `add()` method is a no-op
  - Comments literally say "Are we just building a framework now?"
  - Uses class inheritance (`abstract class` → `class extends implements`)
- Options:
  - **Delete it** if the server abstraction isn't part of waavy's core mission (rendering React in non-JS runtimes)
  - **Rewrite as a functional pattern** if it is needed: `createServer(options)` returning a plain object
- The exported types (`IWaavyServer*`) should be kept if they're part of the public API, deleted if not

### 4h: Consider removing `@/*` path aliases
- Path aliases add bundler coupling and make imports opaque
- The source tree is shallow enough that relative imports are clear
- This is a larger refactor — evaluate cost/benefit before committing

**Acceptance**: No `enum`, no default exports, single CLI framework (`cac`), no `debug`/`printf`/`commander` deps, no empty catches, no `process.exit` in library code. Typecheck and tests pass.

---

## FF-05: BCP Driver Integration for Cleo

**Problem**: Cleo should be able to use the Bit Context Protocol for token-efficient context management when orchestrating Claude Code sessions. BCP lives in a separate repo (`/home/nicks-dgx/dev/.RFCs/bit-context-protocol/`) and must remain independent.

**Context**: BCP has:
- Rust crates: `bcp-driver`, `bcp-encoder`, `bcp-decoder`, `bcp-types`, `bcp-wire`
- TS package: `@bit-context-protocol/mcp` (MCP server)
- The driver crate (`bcp-driver`) handles rendering context in multiple formats (markdown, XML, minimal) with token budgeting

**Deliverables**:

### 5a: Publish BCP as consumable packages
- In the BCP repo: publish `@bit-context-protocol/driver` (or whatever the TS interface package is) to npm
- If no TS driver package exists yet, define what cleo needs:
  - Encode context blocks
  - Decode context blocks
  - Token budget management
  - Format selection (markdown, XML, minimal)

### 5b: Add BCP dependency to cleo
- `apps/cleo/package.json` — add `@bit-context-protocol/driver` as a dependency
- Create `apps/cleo/src/integrations/bcp.ts` — adapter module that wraps BCP driver for cleo's use cases
- Wire into cleo's agent/skill execution pipeline where context is prepared for Claude

### 5c: Local development override
- Document in `CLAUDE.md`: how to use `overrides` in root `package.json` to point at local BCP checkout
- Add commented-out override example:
  ```json
  "overrides": {
    "@bit-context-protocol/driver": "file:///home/nicks-dgx/dev/.RFCs/bit-context-protocol/packages/driver"
  }
  ```

**Acceptance**: Cleo can import and use BCP driver. Local development workflow documented. BCP repo remains fully independent.

---

## FF-06: Documentation Site

**Problem**: The bundt platform has no unified documentation. Individual packages have scattered docs or none.

**Solution**: Use `@bundt/dxdocs` to build the bundt platform documentation site. This is also a dogfooding opportunity.

**Deliverables**:

### 6a: Platform documentation site
- Create `docs/` at the monorepo root (or `apps/docs/` as a dxdocs-powered site)
- `dxdocs.config.ts` for the platform site
- Pages:
  - Introduction / What is Bundt
  - Getting Started (install, workspace setup)
  - Architecture (monorepo layout, package relationships)
  - Package guides (one page per package: cleo, dxdocs, hateoas, waavy, signals)
  - Contributing
  - Release process
- Style: use dxdocs defaults, set accent color to bundt brand

### 6b: Per-package API docs
- Each package should have a `docs/` directory with:
  - Quick start
  - API reference
  - Examples
- These can be standalone dxdocs sites or sections of the main site

### 6c: Platform website
- Decide: is the docs site the website, or is there a separate landing page?
- If separate: create `apps/website/` — simple static site (could also be dxdocs-powered)
- Landing page: hero, package grid, quick links
- Deploy target: GitHub Pages or similar static host

### 6d: Automated docs build
- Add `docs:build` and `docs:dev` scripts to root `package.json`
- Add docs build to CI (build step, not deploy — deploy is manual or on tag)

**Acceptance**: `bun run docs:dev` serves the platform documentation locally. Documentation covers all packages at minimum getting-started level.

---

## FF-07: Loclaude Rebrand

**Problem**: Loclaude is being absorbed into the bundt ecosystem and needs a new name and identity under `@bundt/`.

**Deliverables**:
- Decide on new name (candidates: `@bundt/ollama`, `@bundt/local`, `@bundt/forge`, `@bundt/shepherd`, or user's choice)
- Update `apps/loclaude/package.json` — name, description, bin keys
- Update `apps/loclaude/src/cac.ts` — `cac('<new-name>')`
- Update `apps/loclaude/post-install.js` — ASCII art, messaging
- Rename `apps/loclaude/` directory to match new name
- Rename `bin/loclaude.ts` → `bin/<new-name>.ts`, `bin/loclaude.mjs` → `bin/<new-name>.mjs`
- Update CLAUDE.md package table

**Acceptance**: Package publishes under new `@bundt/<name>` identity. CLI invoked by new name. No references to "loclaude" remain in user-facing code.

---

## FF-08: CI/CD Hardening

**Problem**: The current CI workflow is minimal (build + typecheck + test). It doesn't cover linting, per-package release, or change detection.

**Deliverables**:

### 8a: Enhanced CI workflow
- `.github/workflows/ci.yml` updates:
  - Add lint step (once ESLint is configured)
  - Add Rust build step (when crates/ has content): install Rust, `cargo check`
  - Matrix strategy: run on ubuntu-latest and macos-latest (waavy builds cross-platform executables)
  - Cache: turbo cache, bun cache, cargo cache

### 8b: Release workflow
- `.github/workflows/release.yml`:
  - Triggered manually or by tag push matching `@bundt/*@*`
  - Determines which package from the tag
  - Builds, tests, publishes to npm
  - Creates GitHub release with changelog

### 8c: Change detection
- Use turbo's `--filter` with `[HEAD^1]` or similar to only build/test changed packages in PRs
- Reduces CI time as the workspace grows

### 8d: ESLint configuration
- Root `eslint.config.ts` — ESLint 9 flat config
- `simple-import-sort` plugin
- TypeScript-aware rules
- Per-package overrides only where needed (e.g., waavy needs DOM globals)

**Acceptance**: PRs run full CI. Tagged releases auto-publish. Lint catches import order issues and type problems.

---

## FF-09: Workspace DX Improvements

**Problem**: Several quality-of-life gaps in the development workflow.

**Deliverables**:

### 9a: `internal/shared` — extract first real shared code
- After FF-01 extracts build utils, audit remaining duplication:
  - Result type (if multiple packages want functional error handling)
  - Common CLI scaffolding (picocolors helpers, spinner/progress patterns)
  - Version parsing utilities
- Only extract what has 2+ consumers. Do not speculatively add types.

### 9b: Package generator script
- `scripts/create-package.ts` — scaffolds a new package:
  - Prompts: name, type (app/package), description
  - Creates directory structure, package.json, tsconfig.json, src/index.ts
  - Matches conventions exactly
- Reduces friction for adding new packages

### 9c: Root `mise.toml` task improvements
- Add package-specific tasks: `mise run cleo:dev`, `mise run dxdocs:dev`
- Add release tasks: `mise run release:cleo`, etc.
- Add `mise run new` → runs create-package script

### 9d: VSCode workspace file
- `bundt.code-workspace` — multi-root workspace config
- Per-package launch configs for debugging
- Recommended extensions list

**Acceptance**: `bun run create-package` scaffolds a new package correctly. VSCode workspace provides good DX.

---

## FF-10: Signals Package Bootstrap

**Problem**: `packages/signals/` is a placeholder with no source code. The signal graph abstractions need to be brought in or designed.

**Deliverables**:
- Determine: is there existing signal graph code to migrate, or is this being built from scratch?
- If migrating: identify source location, copy in, adapt to bundt conventions
- If building: write a minimal spec first (what is a signal, what is a graph, what operations exist)
- Minimum viable package:
  - `src/signal.ts` — core signal primitive (reactive value with subscribers)
  - `src/computed.ts` — derived signal (depends on other signals)
  - `src/effect.ts` — side-effect runner triggered by signal changes
  - `src/graph.ts` — dependency graph tracking
  - `src/index.ts` — barrel export
  - Tests for each module
- No external dependencies (this should be a zero-dep primitive)

**Acceptance**: `@bundt/signals` has a working signal graph implementation. Typecheck and tests pass.

---

## FF-11: Prepare Packages for npm Publish

**Problem**: All packages currently have `"private": true` (correct during development). Before first release, each needs publish-readiness.

**Deliverables** (per package that will be published):

### Checklist for each package:
- [ ] Remove `"private": true` from `package.json`
- [ ] Verify `"name"` is the correct `@bundt/<name>` scope
- [ ] Verify `"version"` is correct starting version
- [ ] Verify `"exports"` field points to built artifacts (not source)
- [ ] Verify `"files"` field includes only what should be published
- [ ] Verify `"bin"` entries point to correct files (for CLIs)
- [ ] Verify `"engines"` field is set
- [ ] Verify `"license"` is set and LICENSE file exists
- [ ] Add `"repository"` field pointing to GitHub
- [ ] Add `"homepage"` field
- [ ] Add `"bugs"` field
- [ ] Verify `.npmignore` or `"files"` excludes: src/, build/, tests, config files, .claude/
- [ ] `npm pack --dry-run` shows expected contents and reasonable size
- [ ] README.md exists with at minimum: description, install, quick start

### Packages to publish:
- `@bundt/cleo` — CLI, publish with bin
- `@bundt/dxdocs` — CLI + library, publish with bin
- `@bundt/hateoas` — library (needs build step first — currently source-level exports)
- `@bundt/waavy` — CLI + library, publish with bin
- `@bundt/<loclaude-rebrand>` — CLI, publish with bin
- `@bundt/signals` — library (after FF-10)

### Packages NOT published:
- `@bundt/internal-shared` — private
- `@bundt/internal-build-utils` — private (after FF-01)

**Acceptance**: `npm pack --dry-run` for each published package shows correct files. No source code, no build scripts, no config files in the tarball.

---

## FF-12: Hateoas Build Pipeline

**Problem**: `@bundt/hateoas` currently uses source-level exports (`"./server": "./src/server/index.ts"`). This works for local development but not for npm publishing — consumers need compiled output.

**Deliverables**:
- Add `build/` directory with Bun.build config (matching other packages' pattern, using `@bundt/internal-build-utils` from FF-01)
- Build targets: library bundles for each export path (`.`, `./server`, `./client`, `./react`, `./protocol`)
- Type declarations via `tsc -p tsconfig.build.json`
- Add `tsconfig.build.json`
- Update `package.json` exports to point to `dist/` artifacts
- Add `"files"` field
- Add `.npmignore`

**Acceptance**: `bun run build` in hateoas produces `dist/` with JS bundles and `.d.ts` files. All 42 tests still pass.

---

## Implementation Order

| Phase | Items | Rationale |
|-------|-------|-----------|
| 1 | FF-01, FF-02 | Dedup shared code — unblocks cleaner builds |
| 2 | FF-03, FF-08d | Release pipeline + linting — unblocks everything else |
| 3 | FF-04 | Waavy code quality — large surface area, do it early |
| 4 | FF-07, FF-12 | Loclaude rebrand + hateoas build — prep for publish |
| 5 | FF-10 | Signals bootstrap — new package |
| 6 | FF-05 | BCP integration — depends on BCP repo readiness |
| 7 | FF-06 | Documentation — best done after packages stabilize |
| 8 | FF-08a,b,c | CI/CD — best done after release pipeline exists |
| 9 | FF-09 | DX improvements — nice-to-have, low urgency |
| 10 | FF-11 | Publish prep — final gate before first release |

---

## Out of Scope

- Rust crate development (deferred until TS packages are stable)
- Plugin system / capability framework (rejected as premature per architecture review)
- Multi-repo migration (rejected — monorepo is the architecture)
- `@bundt/core`, `@bundt/schema`, `@bundt/protocol` abstract packages (rejected — extract only when duplication appears)
