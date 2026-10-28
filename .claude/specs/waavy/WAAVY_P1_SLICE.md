# Waavy P1 — Vertical Slice: build → render → hydrate

Status: **Implemented, pending review/commit** (2026-10-28) · Depends on: `ARCHITECTURE.md` r2 · Branch: `waavy/r2` (off `develop`)

## Goal

One registered page builds into a release, renders through the one-shot CLI
(and the compiled binary), and hydrates in a real browser with working
interactivity and CSS. The package is restructured onto the target layers and
the FF-04 cleanup is done as part of the rewrite.

## Locked decisions (from review)

- Rewrite **in place** on branch `waavy/r2`; the old CLI may break mid-phase.
- **React 19 only** (`react`/`react-dom` `^19`).
- **CSS imported by page modules is in scope** for P1.
- Release is self-contained: React is bundled into `server/entry.js` (ARCH D8).
- No caching, no loaders, no named exports, no serve transport (P2), no
  cross-platform packaging (P3), no SSG (P4).

## Out of scope

HTTP `serve`, `--dev` watch mode, Rust, per-platform npm packages, CI matrix
beyond the existing ubuntu job, docs site, SSG.

---

## Key design detail: the release ABI

The server bundle (`server/entry.js`) contains React, react-dom/server, the
page components, and a tiny adapter from waavy. The runtime (CLI/binary or
`createRenderer`) imports it and talks to it only through this object, so the
binary and the release can be different waavy versions within one ABI:

```ts
// exported as `release` from server/entry.js
export type ReleaseEntry = {
  abi: 1;
  waavyVersion: string;          // version of @bundt/waavy used at build time
  buildId: string;
  pages: readonly string[];      // registered page IDs
  renderToReadableStream(
    pageId: string,
    props: unknown,
    options: { signal: AbortSignal; onError: (error: unknown) => void },
  ): Promise<ReadableStream<Uint8Array> & { allReady: Promise<void> }>;
};
```

The generated server entry is:

```ts
import { defineRelease } from "@bundt/waavy/entry-server";
import Page_counter from "/abs/path/pages/counter.tsx";
import Page_styled from "/abs/path/pages/styled.tsx";
export const release = defineRelease({
  buildId: "<injected>",
  pages: { "counter": Page_counter, "styled": Page_styled },
});
```

`defineRelease` wraps `react-dom/server`'s `renderToReadableStream`
(`createElement(Page, props)`). Timeouts, error classification, and document
composition live in the runtime (`src/core/render.ts`, `src/core/document.ts`),
which takes the ABI's `renderToReadableStream` as a parameter — so it is
unit-testable with a fake.

---

## Tasks

Order matters: T1 → T2 (spikes) gate the rest. Check boxes as you go and
record deviations under **Implementation notes** at the bottom.

### T1 — Branch and clear the ground
- [x] Create branch `waavy/r2` from `develop`.
- [x] Delete everything listed in ARCHITECTURE §10, plus: `src/cli/**`,
      `src/server/**` (after T6 ports the render tests' intent), `src/types/**`,
      `src/utils/**`, `src/constants/**`, `src/errors/**`, `src/templates/**`,
      `src/exports/**`, `src/index.ts`, `config/`, `scripts/`, `bin/lib/`,
      `bin/waavy.js`, `post-install.js`, old `build/` contents, `RELEASE.md`.
      Keep `src/__tests__/server/index.test.tsx` and its components temporarily
      as a reference for T6, then delete.
- [x] `package.json`: version `0.3.0-dev.0`; deps `zod@^4`, `cac@^7`,
      `picocolors`; remove `debug`, `printf`, `@tanstack/react-query`,
      `@types/debug`; peer `react@^19`, `react-dom@^19`; devDeps add `playwright`,
      `@happy-dom/global-registrator`. Scripts: `build`, `build:binary`,
      `typecheck`, `test`, `test:e2e`, `clean`.
- [x] `tsconfig.json`: remove all `paths` (`@/*`, `@pkg/*`); add
      `"lib": ["ESNext", "DOM"]` for `src/browser`. `tsconfig.build.json` emits
      declarations for `src/` only into `dist/`.
- **Accept:** `bun install` at repo root succeeds; `packages/waavy` contains
  only the new skeleton + reference tests.

### T2 — Spikes (record results in `spikes/P1_SPIKES.md`)
Each spike is a throwaway script under `packages/waavy/spikes/` (deleted at the
end of P1; results kept in the markdown).
- [x] **S1 Bun.build in a compiled binary:** `bun build --compile` a script
      that calls `Bun.build` on a TSX file importing React; run the binary
      from a directory with `node_modules`. *Pass:* output produced. *Fail →*
      `waavy build` is documented as `bunx @bundt/waavy build` (requires Bun on
      build machines); binary keeps `render`/`serve` only.
- [x] **S2 CSS:** browser build of an entry importing a `.css` file with
      `metafile: true` — confirm CSS is emitted and the metafile maps entry →
      CSS output. Server build (`target: "bun"`) of the same page — confirm a
      plugin can stub `*.css` to an empty module. Record exact metafile fields.
- [x] **S3 External release import from the binary:** compiled binary does
      `await import("/abs/dist/waavy/server/entry.js")` where the entry bundles
      React; render a component. *Pass:* HTML produced, no "Invalid hook call".
      Also confirm Bun resolves `react-dom/server` to the `bun` condition when
      bundling with `target: "bun"`.
- [x] **S4 Workspace resolution for fixtures:** a fixture at
      `packages/waavy/fixtures/basic` resolves `react` and `@bundt/waavy` from
      the root install. If not, add `packages/waavy/fixtures/*` to root
      `workspaces`.
- [x] **S5 Baseline:** time a cold one-shot render of the counter fixture
      (spawn → stdout complete) for later comparison with `serve`.
- **Accept:** `spikes/P1_SPIKES.md` lists each spike: command, result,
  decision. If S1 or S3 fail, stop and raise it before continuing.

### T3 — `core/errors.ts`
- [x] `ERROR_CODES` exactly as ARCHITECTURE §5.4 (`as const`), `ErrorCode` type.
- [x] `class WaavyError extends Error { code; page?; cause? }`,
      `isWaavyError(x)`, `toErrorBody(err) → { error: { code, message, page? } }`
      (non-Waavy errors → `INTERNAL`, message preserved, stack not leaked).
- **Accept:** unit tests for mapping, body shape, unknown error wrapping.

### T4 — `core/protocol.ts`
- [x] Zod schemas: `JsonValue`, `RenderRequestSchema` (`v: 1` literal;
      `page` matches `^[a-z0-9][a-z0-9_-]*(/[a-z0-9_-]+)*$`; `props` default
      `{}`; `document { title?, lang?, head? }`; `stream` default `false`;
      `timeoutMs` int 1–120000 optional), `ErrorBodySchema`;
      `PROTOCOL_VERSION = 1`.
- [x] `parseRenderRequest(input: unknown): RenderRequest` → throws
      `WaavyError(INVALID_REQUEST)` with a one-line summary of Zod issues.
- [x] `protocolJsonSchema()` via `z.toJSONSchema` — emitted at package build
      to `dist/protocol.schema.json`.
- **Accept:** valid/invalid request tests; JSON Schema snapshot test.

### T5 — `core/data-island.ts` and `core/document.ts`
- [x] `serializeIsland({ v: 1, page, buildId, props })` → JSON string with
      `<`→`<`, `>`→`>`, `&`→`&`, U+2028→` `,
      U+2029→` ` (literal six-character escapes).
- [x] `documentPrefix({ lang, title, head, styles, preloads })` and
      `documentSuffix({ island, scripts })` per ARCHITECTURE §4.3: escape
      `title` as HTML text and `lang`/URLs as attributes; `head` inserted raw
      (documented as trusted). Root container id `waavy-root`, island id
      `waavy-data`.
- **Accept:** tests — `</script><script>alert(1)</script>` in props survives
  `JSON.parse` of the island text unchanged and the island contains no literal
  `</script`; U+2028 round-trip; title with `<b>&` escaped; snapshot of a full
  shell.

### T6 — `core/render.ts`
Generic over the ABI's `renderToReadableStream` (passed in).
- [x] `renderBuffered(renderFn, pageId, props, { timeoutMs })` →
      `{ body: string, recoverableErrors: RecoverableError[] }`: await shell,
      then `allReady`, collect with a streaming `TextDecoder`.
- [x] `renderStreaming(renderFn, pageId, props, { timeoutMs, signal })` →
      `{ stream, recoverableErrors: () => RecoverableError[] }`, resolved only
      once the shell is ready.
- [x] Semantics (ARCHITECTURE §5.2): errors reported to `onError` after the
      shell resolved are recoverable; shell rejection → `RENDER_FAILED`;
      timeout fires `AbortController.abort()`; aborted before shell →
      `RENDER_TIMEOUT`; after shell → pending boundaries client-render, counted
      as recoverable. The timer is always cleared (on `allReady`, failure, or
      caller abort). Caller `signal` abort propagates.
- [x] `composeDocument(prefix, bodyStream, suffix)` → `ReadableStream<Uint8Array>`.
- [x] Port the intent of the old `server/index.test.tsx` (string/stream
      output, nesting, special characters) against the new functions, then
      delete the old tests.
- **Accept:** tests with a fake renderFn and real React fixtures for: success;
  recoverable boundary error (count = 1, body valid); shell throw →
  `RENDER_FAILED`; never-resolving shell → `RENDER_TIMEOUT`; slow boundary
  after shell → completes with recoverable count; no timers left alive
  (process exits promptly in a spawned test).

### T7 — `core/config.ts` and `build/config-loader.ts`
- [x] `WaavyConfigSchema`: `pages: Record<PageId, string>` (≥1),
      `publicPath` default `"/assets/"` (must end with `/`; absolute path or
      `https://` URL), `outDir` default `"./dist/waavy"`,
      `render.timeoutMs` default `10000`. `defineConfig` = typed identity.
- [x] `loadConfig(projectRoot, configPath?)` (Bun `import()` of
      `waavy.config.{ts,js,mjs}`): validate, resolve page paths to absolute,
      assert each exists → `CONFIG_INVALID` with the offending key.
- **Accept:** tests for defaults, missing page file, bad page ID, bad publicPath.

### T8 — `build/` (release builder)
- [x] `entries.ts`: write generated server entry and one client entry per page
      to `<projectRoot>/node_modules/.cache/waavy/build/<buildId>/` (inside the
      project so module resolution uses the project's `node_modules`). Client
      entry: `import Page from "<abs>"; import { hydrate } from "@bundt/waavy/browser"; hydrate(Page, { buildId: "<id>" });`
- [x] `build.ts` `buildRelease({ projectRoot, configPath?, minify = true })`:
  1. load config; `buildId = <base36 time>-<6 hex random>`;
  2. client build: `target: "browser"`, `splitting: true`, `minify`,
     `naming: { entry: "[name]-[hash].[ext]", chunk: "chunk-[hash].[ext]", asset: "[name]-[hash].[ext]" }`,
     `define: { "process.env.NODE_ENV": '"production"' }`, `metafile: true`;
  3. server build: `target: "bun"`, `splitting: false`, **all packages bundled**,
     CSS-stub plugin (S2), `naming: "entry.js"`;
  4. derive manifest from the client metafile (entry, css, preload chunks per page);
  5. write to `<outDir>.tmp-<buildId>`, then replace `outDir` atomically
     (rename; remove previous after success);
  6. remove the temp entries dir in `finally`.
  Build errors → `BUILD_FAILED` with Bun's logs in `message`.
- [x] `manifest.ts`: `ManifestSchema` (ARCHITECTURE §4.2 fields:
      `manifestVersion: 1`, `protocolVersion`, `abi: 1`, `waavyVersion`,
      `buildId`, `publicPath`, `server`, `pages{ client, css[], preload[] }`),
      `writeManifest`, `readManifest`.
- **Accept:** building `fixtures/basic` yields the documented tree; manifest
  validates; every referenced file exists; server entry contains no bare
  `import "react"`; a failed build leaves the previous release untouched.

### T9 — `entry-server.ts` (package export `@bundt/waavy/entry-server`)
- [x] `defineRelease({ buildId, pages })` → `ReleaseEntry` (ABI above),
      reading `waavyVersion` from a build-time constant.
- **Accept:** unit test that the object satisfies the ABI and renders a component.

### T10 — `runtime/`
- [x] `release.ts` `openRelease(dir)`: read + validate manifest; assert files
      exist; `import()` server entry; check `release.abi === 1`,
      `manifest.protocolVersion === PROTOCOL_VERSION`, `release.buildId === manifest.buildId`,
      and that `release.pages` equals the manifest's page set. Failures →
      `RELEASE_INVALID` or `VERSION_MISMATCH` (ABI/protocol).
- [x] `renderer.ts` `createRenderer({ release: dir })` →
      `{ render(req), renderStream(req), close() }`; parses the request;
      unknown page → `PAGE_NOT_FOUND`; builds asset URLs (`publicPath` + file);
      composes the document; `render` returns
      `{ html, recoverableErrors, buildId }`; `renderStream` returns
      `{ stream, recoverableErrors(), buildId }`.
- [x] `src/server.ts` exports `createRenderer` and its types only.
- **Accept:** tests on the built fixture for each ERROR_CODE path and for a
  successful render whose HTML contains the manifest's CSS link, module script,
  and island.

### T11 — `browser/hydrate.ts` (package export `@bundt/waavy/browser`)
- [x] `hydrate(Page, { buildId })`: read `#waavy-data`, `JSON.parse`,
      require `v === 1`; warn (not throw) on `buildId` mismatch; locate
      `#waavy-root`; `hydrateRoot(root, createElement(Page, props), { onRecoverableError: console.error })`.
      Missing root/island → `console.error` with a clear message, no throw.
      No Zod in the browser bundle.
- **Accept:** happy-dom unit tests for missing island, bad JSON, v mismatch,
  buildId mismatch warning.

### T12 — CLI (`cli/`, `transport/oneshot.ts`)
- [x] `cli/index.ts` (cac): `--version`, `--help`, commands `build`, `render`.
- [x] `waavy build [--root <dir>] [--config <path>] [--no-minify]` → prints
      the release path and buildId.
- [x] `waavy render --release <dir> --page <id> [--props <json> | --props-file <path>] [--stdin] [--title <s>] [--lang <s>] [--head <html>] [--stream] [--timeout <ms>]`.
      `--stdin` reads a full `RenderRequest` JSON from stdin (other flags
      rejected). stdout: HTML only. stderr: JSON lines only —
      `{"warning":{"code":"RECOVERABLE_ERROR","message":…}}` per recoverable
      error and one `{"error":{…}}` on failure. Exit code from `ERROR_CODES`,
      set via `process.exitCode` after stdout is flushed.
- [x] `transport/oneshot.ts` holds the stdout/stderr/exit mapping; `cli/`
      only parses arguments.
- **Accept:** contract tests spawning `bun dist/cli.js` for: success
  (buffered + `--stream`), each error code, stdin mode, large props via
  `--props-file`, exit codes, and that stderr has only valid JSON lines.

### T13 — Package build
- [x] `build/index.ts` using `createBaseConfig` + `concurrent_build` from
      `@bundt/internal-build-utils`: entries `src/index.ts`, `src/server.ts`,
      `src/entry-server.ts`, `src/cli/index.ts` (target `bun`) and
      `src/browser.ts` (target `browser`) → `dist/`; write
      `dist/protocol.schema.json`. `packages: "external"` for the library.
- [x] `build:binary` (host platform only in P1): `bun build --compile src/cli/index.ts --outfile dist/bin/waavy`.
- [x] `bin/waavy.ts` (`#!/usr/bin/env bun`, imports `../dist/cli.js`) as the
      interim `bin` (replaced in P3).
- [x] `exports`: `.`, `./server`, `./browser`, `./entry-server`,
      `./protocol.schema.json`, `./package.json` — all pointing at `dist/`.
- **Accept:** `turbo run build --filter=@bundt/waavy` and `typecheck` pass;
  `dist/*.d.ts` contain no `@/` or unresolved aliases; the contract tests from
  T12 also pass against `dist/bin/waavy`.

### T14 — Fixtures
`packages/waavy/fixtures/basic/` (private package; `waavy.config.ts`):
- [x] `counter` — props `{ label: string; initial: number }`, button increments.
- [x] `styled` — imports `./styled.css` that sets a distinctive color on `#styled`.
- [x] `boundary` — Suspense boundary whose child throws → recoverable error.
- [x] `broken` — throws during render (shell failure).
- [x] `slow` — Suspense child that never resolves (`use(neverResolves)`).

### T15 — Tests and the import-layer rule
- [x] Import-layer test: scan `src/**` with `Bun.Transpiler().scanImports`;
      enforce ARCHITECTURE §3.2 (`core` imports no `bun:*`, `node:*`, or other
      layers; `browser` imports only `core/data-island` types; nothing imports `cli`).
- [x] `test:e2e` (Playwright Chromium; `bunx playwright install chromium`): the
      test builds `fixtures/basic`, starts a throwaway `Bun.serve` that returns
      `renderer.render(...)` HTML at `/:page` and serves `client/` at
      `/assets/`, then:
  - counter: click button → text changes from `initial` to `initial+1`;
  - XSS: `label = "</script><script>window.__pwned=1</script>"` → label text
    shown verbatim and `window.__pwned === undefined`;
  - styled: computed color of `#styled` equals the CSS value;
  - no `console.error` during load for counter/styled.
- [x] Add a waavy e2e step to `.github/workflows/ci.yml` (ubuntu): install
      Chromium, run `bun run --filter @bundt/waavy test:e2e`.
- **Accept:** `bun test` and `test:e2e` green locally and in CI.

### T16 — Docs and cleanup
- [x] `packages/waavy/README.md`: what waavy is, `waavy.config.ts`, `waavy build`,
      `waavy render`, the release layout, serving `/assets/`, the protocol
      summary, error codes. Mark serve/Rust as upcoming.
- [x] `CHANGELOG.md`: `## Unreleased` describing the rewrite and removed APIs.
- [x] Delete `packages/waavy/spikes/` scripts (keep `spikes/P1_SPIKES.md` in specs).
- [x] Update ARCHITECTURE.md if anything changed (with a revision-log entry).

---

## Exit criteria

1. `fixtures/basic` builds into a release that validates (T8, T10).
2. `waavy render` (both `bun dist/cli.js` and the compiled `dist/bin/waavy`)
   passes the contract tests (T12, T13).
3. Playwright: counter click, XSS, and CSS tests pass (T15).
4. Import-layer test, unit tests, typecheck, and build green in CI.
5. No file from ARCHITECTURE §10 remains; no `enum`, default export (outside
   config/generated code), `@/` import, `debug`, or `printf` in `src/`.

## Risks

- S1 failure changes how `waavy build` is distributed (fallback defined in T2).
- Bun.build metafile shape for CSS may differ from expectations (S2); the
  manifest derivation in T8 depends on it.
- Bundling React into the server entry relies on Bun choosing the `bun`
  export condition for `react-dom/server` (S3).

## Implementation notes

Implemented 2026-10-28 on `waavy/r2` (uncommitted at the owner's request).
Results: 144 unit/integration/contract tests + 3 Playwright tests pass;
`turbo run build typecheck test --filter=@bundt/waavy` green; eslint clean.

**Spikes** — see `spikes/P1_SPIKES.md`. All passed. S1 turned up a follow-up
(S1b): compiled binaries need `--compile-autoload-package-json` (and
`--compile-autoload-tsconfig`) or they cannot resolve packages imported by
the user's `waavy.config.ts`. Fixed in `build/binary.ts` (`COMPILE_FLAGS`),
covered by a binary `waavy build` contract test. **P3's cross-compile script
must reuse `COMPILE_FLAGS`.**

**Deviations from the spec**
- Manifest gained `renderDefaults.timeoutMs`: the runtime never reads
  `waavy.config.ts`, so the config's default deadline is recorded in the
  release.
- Page asset paths in the manifest are relative to `client/` (the directory
  served at `publicPath`), not to the release root; `server` stays relative
  to the release root. Documented in `core/manifest.ts`.
- `buildRelease`/`waavy build` accept an `outDir`/`--out` override (needed
  so test suites build isolated releases; generally useful in CI).
- Fixture lives in root `workspaces` (`packages/waavy/fixtures/*`) per the S4
  fallback; integration tests therefore need `dist/` (`test` compiles the
  binary first; turbo's `test` already depends on `build`).
- Tests are split: colocated unit tests in `src/**`, integration and CLI
  contract tests in `test/`, Playwright in `e2e/` (`test:e2e`).
- Client chunks are named `chunks/chunk-[hash].js` (Bun's `[name]` for shared
  chunks reuses the first entry's name, which misleads).
- `RecoverableError` carries `reason: "error" | "timeout"` so hosts can tell
  a post-shell deadline from a thrown boundary error.

**Bugs found by the tests and fixed**
- `onError` callbacks returning a value: React treats a returned string as the
  error digest. The runtime's handler now returns nothing, and the release
  adapter (`entry-server.ts`) discards the callback's return value.

**Follow-ups**
- `files` includes `dist/`, so a publish today would ship `dist/bin/waavy`
  (~61 MB). P3 moves binaries into per-platform packages; exclude
  `dist/bin` then.
- Bun prints "Could not decode sourcemap … UnsupportedFormat" once in the
  tampered-release tests (copied release, modified manifest). Harmless; look
  again if it appears for untampered releases.
- React's streaming output for aborted boundaries includes small inline
  `<script>`s inside `#waavy-root`; hosts with a strict CSP will need a nonce.
  Track for P2 (`document.nonce` option) — not in the v1 protocol yet.
- `waavy.config.ts` is imported with Bun's module cache; P2's `--dev` watch
  mode must cache-bust config and page re-imports.
