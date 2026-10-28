# Waavy — Architecture Audit & Target Design

Status: **r2.2** (P1–P2 implemented) · 2026-10-28 · Scope: `packages/waavy` (`@bundt/waavy` 0.2.0)

This document is the source of truth for waavy's architecture going forward. It
supersedes the standalone repos (`nicholasgalante1997/waavy`, `waavy-rs`,
`create-waavy-app`) and folds in the still-open items from
`fast-follows/WAAVY_REFACTORS.md` and FF-04. Implementation specs cite sections
here.

**Revision log**
- r1 — initial audit + design.
- r2.2 (P2 implementation) — HTTP transport on `node:http` (truncation is only
  signalable there; spikes/P2_SPIKES.md); streaming is a supported mode; `cli`
  may import `runtime`; measured `serve` overhead 0.13 ms p50, confirming §7
  (no render cache).
- r2.1 (P1 implementation) — manifest records `renderDefaults.timeoutMs`;
  page asset paths are relative to `client/`; `waavy build --out`; compiled
  binaries need `--compile-autoload-package-json` (spikes/P1_SPIKES.md S1b);
  `RecoverableError.reason` distinguishes deadline aborts.
- r2 — scope cut after review: host-supplied props are the only data contract
  (no loaders/route discovery); HTML caching deferred; build output becomes a
  self-contained *release*; document ownership specified; buffered rendering
  is the default with precise streaming semantics; smaller public API; phases
  resequenced around a vertical slice (render → hydrate → HTTP → Rust).

---

## 1. What waavy is (and is not)

**Mission:** let *any* server — Rust, Python, Go, Ruby, Java, PHP — render
React components to HTML and hydrate them in the browser, without that server
running JavaScript itself.

**The first release, stated as one sentence:** *registered components + JSON
props → HTML and matching hydration assets, via one-shot or warm HTTP
execution.*

Waavy owns: building a release of registered pages, rendering a page with
host-supplied props, and getting props + matching client assets to the browser
so hydration works.

The host owns: routing, data fetching, auth/personalization, response caching,
serving static assets, and the HTTP response to the end user.

Not in scope until there is evidence it's needed (see §12): data loaders
(`getServerSideProps`/`getStaticProps`), filesystem route discovery, HTML
render caching, component-owned `<html>` documents, named-export pages.
(`@bundt/prev` is the framework in this monorepo; waavy stays below that line.)

---

## 2. Audit: current architecture

### 2.1 Shape today

~3.9k LOC in `src/`. Effective structure:

```
bin/waavy.js (Node launcher) ──spawns──▶ compiled Bun binary (src/index.ts, cac)
                                             │
            ┌────────────────┬───────────────┼────────────────┬──────────────┐
         render            bundle           ssg           prerender (off)
     cli/RenderAction   cli/BundleAction  cli/SSGAction
       │  cache models (5 classes)          │
       │  inline-script hydration (#1)      │  hydration.ts + template (#3)
       ▼                                    ▼
   server/index.tsx (render helpers) ◀── exports/server.ts ──▶ server/models/Hydra.tsx (#2)
   browser/index.tsx  ◀── exports/browser.ts
```

Cross-layer imports (measured): `cli → types/utils/server/errors/constants/templates`
as expected, but also **`errors → cli`** and **`types → cli`** — the library
layer depends on CLI code. Bun APIs appear in 16 files spanning `server/`,
`utils/`, `types/`, and `cli/`; the "agnostic" `exports/server.ts` re-exports
Bun-only code.

### 2.2 Architectural findings

Structural causes; the individual bugs they produce are in Appendix A.

| # | Finding | Consequence |
|---|---|---|
| A1 | **No defined contract with the host backend.** The CLI flag set *is* the API, duplicated in `setup.ts` and unused `index.metadata.ts` (which disagree); output/error semantics differ per output mode. | Callers (waavy-rs) encode undocumented behavior; exit codes 24–26 unreachable in practice. |
| A2 | **Three incompatible hydration protocols**, all emitting executable JS with unescaped JSON. | Hydration broken on every path; XSS surface. |
| A3 | **No link between client bundle and page.** `render` takes `--bootstrap` by hand; `bundle` emits hashed files with no manifest; SSG builds a bundle then never references it. | Server HTML and client JS silently fail to match. |
| A4 | **Library / Bun adapters / CLI not layered**, importing each other in both directions. | `out/server.js` targets Node but calls `Bun.*`; types leak `@/cli`; duplicated helpers and serializers. |
| A5 | **One-shot process per render is the only execution model**; cold import of the component graph every request. | High latency floor; the render cache exists largely to paper over this. |
| A6 | **Cache over-engineered and unsound.** Two backends + header DB, per-lookup scrypt, keyed on raw path + props, no invalidation. | SQLite backend never hits; stale HTML after code changes. |
| A7 | **Page/data contract implicit and split** between render (`getServerSideProps`) and SSG (`getStaticProps`/`route(s)`/`options`). | Loader semantics, merge precedence, and server-only deps in browser-bound modules — all unspecified. |
| A8 | **Errors are side effects, not a model.** `handleError` writes HTML to stderr then rethrows; 9 empty catches; `process.exit` in library code. | Failures silent or collapse to exit 9. |
| A9 | **Distribution relies on an unwired postinstall download** from the old repo's releases. | `npm i @bundt/waavy` cannot produce a working CLI. |
| A10 | **Out of step with bundt conventions** (`out/`, own build, 40 default exports, 78 `@/` imports, `debug`/`printf`). | Broken `.d.ts`; harder to maintain. |
| A11 | **Dead / speculative surface** (Hydra, PreRender, TanStack extension, telemetry, empty template, PeerDependencyManager, worker types, metadata files, silent logger). | Hides the real system. |

### 2.3 Worth keeping

Web-stream render helpers in `server/index.tsx` and their ~35 tests; the
compiled-executable approach (hosts need neither Bun nor Node);
`waavy.config.ts` discovery; the `bin/waavy.js` launcher concept (reworked in §8).

---

## 3. Target architecture

### 3.1 Concepts

- **Page** — a module whose default export is a React component taking JSON
  props, registered under a stable **page ID** in `waavy.config.ts`.
- **Release** — the output of `waavy build`: server bundle, client assets,
  and a manifest, all from one build. Production renders *only* from a release.
- **Renderer** — the warm process (or one-shot invocation) that loads a
  release and answers render requests.
- **Host** — the user's backend; talks to the renderer over the protocol (§5).

### 3.2 Layers (internal)

```
                 ┌───────────────────────────────────────────────┐
   host ───────▶ │ transport     one-shot CLI │ HTTP (serve)      │  src/transport/
                 └──────────────────────┬────────────────────────┘
                                        ▼
                 ┌───────────────────────────────────────────────┐
                 │ runtime   load release, validate, dispatch     │  src/runtime/
                 └──────────────────────┬────────────────────────┘
                                        ▼ calls into release's server entry
   ┌──────────────────────────┐   ┌───────────────────────────────┐
   │ core (agnostic)          │   │ build (Bun)                   │
   │ render, document shell,  │◀──│ Bun.build server + client,    │  src/build/
   │ data island, protocol,   │   │ generated entries, manifest   │
   │ errors, config schema    │   └───────────────────────────────┘
   └──────────────────────────┘
      src/core/        ▲
                       │ (data-island reader + types only)
               ┌───────┴────────┐
               │ browser/hydrate│  src/browser/
               └────────────────┘
   cli (cac): build · render · serve · ssg      src/cli/
```

**Dependency rule (enforced by an import-graph test):**
`cli → {transport, build, runtime}`, `transport → runtime`, `runtime → core`,
`build → core`, `browser → core` (types + island reader only). Nothing imports
`cli`. `core` imports nothing Bun- or Node-specific.

Seams (loader, release reader, clock) are injected **internally** for tests
and are not public API.

### 3.3 Public surface (kept deliberately small)

| Entry | Contents | Stability |
|---|---|---|
| `@bundt/waavy` | `defineConfig`, types: `WaavyConfig`, `RenderRequest`, `RenderResponse`, `ErrorCode` | public |
| `@bundt/waavy/server` | `createRenderer({ release })` → `{ render(req), renderStream(req), close() }` for JS hosts wanting in-process rendering | public |
| `@bundt/waavy/browser` | `hydrate()` — imported by **generated** client entries | public-for-generated-code; not a user API |
| `protocol.schema.json` (in package) | JSON Schema of request/response, generated from the Zod schemas | public, versioned |
| `waavy` binary | `build`, `render`, `serve`, `ssg` | public |

Everything else (render primitives, shell builder, manifest reader) is
internal. Every public constructor is a compatibility obligation, so none are
exported until a consumer needs them.

### 3.4 Source tree

```
src/
  core/
    render.ts        renderBuffered / renderStream (react-dom/server web APIs)
    document.ts      document shell + container + asset tags
    data-island.ts   JSON serialize + escape
    protocol.ts      Zod: RenderRequest, RenderResponse, ErrorBody, PROTOCOL_VERSION
    errors.ts        WaavyError + ERROR_CODES (as const)
    config.ts        WaavyConfig schema, defineConfig
  build/
    build.ts         waavy build → release dir
    entries.ts       generated server entry + per-page client entries
    manifest.ts      Manifest schema, write
  runtime/
    release.ts       open + validate release, compat check
    renderer.ts      createRenderer: dispatch by page ID into server entry
  transport/
    oneshot.ts       argv/stdin → request → stdout/stderr/exit code
    http.ts          Bun.serve on unix socket or TCP port
  browser/
    hydrate.ts
  cli/
    index.ts build.ts render.ts serve.ts ssg.ts
  index.ts server.ts browser.ts      (package entries)
```

Named exports only, relative imports (no `@/`), `as const` instead of enums,
`console` + `picocolors` instead of `debug`/`printf`. The restructure *is* the
FF-04 cleanup.

---

## 4. Pages, releases, documents, hydration

### 4.1 Page registration (the only page definition)

```ts
// waavy.config.ts
import { defineConfig } from "@bundt/waavy";

export default defineConfig({
  pages: {
    "product": "./pages/product.tsx",
    "home":    "./pages/home.tsx",
  },
  publicPath: "/assets/",     // URL prefix where the host serves client assets
  outDir: "./dist/waavy",     // release location
});
```

```tsx
// pages/product.tsx — browser-safe, no server-only imports, no loaders
export default function Product(props: { name: string; price: number }) { … }
```

- One canonical definition: the config's `pages` map. Page modules export only
  a default component. `defineConfig` is a typed identity function.
- Page identity is the **page ID** everywhere (request, manifest, client entry).
  Named exports are not supported initially, so the server entry and the
  generated client entry can never disagree about which component they load.
- Props are host-supplied JSON. There are no loaders, contexts, or merge rules.

### 4.2 Release (deployment contract)

`waavy build` produces a single directory; nothing outside it is read at render
time:

```
dist/waavy/
  manifest.json
  server/entry.js         one bundle: all registered pages + react + react-dom/server + core render
  client/<page>-<hash>.js per-page hydration entries (+ shared chunks, css)
```

```json
{
  "manifestVersion": 1,
  "protocolVersion": 1,
  "waavyVersion": "0.3.0",
  "buildId": "2026-10-28T…-a1b2c3",
  "publicPath": "/assets/",
  "server": "server/entry.js",
  "pages": {
    "product": { "client": "client/product-3f2a.js", "css": ["client/product-77e1.css"], "preload": ["client/chunk-91ac.js"] }
  }
}
```

- **Self-contained (D8):** the server entry bundles the host project's React,
  react-dom/server, and waavy's core render code at build time. The renderer
  binary just imports `server/entry.js` and calls its exported
  `render(pageId, props, opts)`. One React instance per release, pinned by the
  project's lockfile; no runtime `node_modules` resolution.
- Server and client bundles come from the same build and the same `buildId`;
  mismatched HTML/JS across a source change is impossible in production.
- The renderer validates the release **at startup** (manifest schema, every
  referenced file exists, `protocolVersion`/`waavyVersion` compatible) and
  refuses to start with `RELEASE_INVALID` / `VERSION_MISMATCH`.
- Unknown page ID at request time → `PAGE_NOT_FOUND`.
- **Assets:** the host (or its CDN) serves `dist/waavy/client/` at
  `publicPath`. `waavy serve --dev` may serve them itself for local work; that
  is a dev convenience, not production behavior.
- **Dev mode:** `waavy serve --dev` builds an in-memory release from source and
  rebuilds on change (still release-shaped, so dev and prod use one code path).

### 4.3 Document ownership

**Default (and only initial) mode: waavy owns the document shell.**

```html
<!doctype html>
<html lang="{document.lang|en}">
  <head>
    <meta charset="utf-8">
    <title>{document.title}</title>
    {document.head}                                     <!-- host-supplied trusted HTML -->
    <link rel="stylesheet" href="{publicPath}{css}">    <!-- from manifest -->
    <link rel="modulepreload" href="{publicPath}{preload}">
  </head>
  <body>
    <div id="waavy-root">{rendered component}</div>
    <script type="application/json" id="waavy-data">{escaped island}</script>
    <script type="module" src="{publicPath}{client}"></script>
  </body>
</html>
```

- React renders **only the component** into `#waavy-root` (via
  `renderToReadableStream` of the component, wrapped by the shell outside
  React), and the client hydrates **only** `#waavy-root` with the same props —
  so server and client trees match by construction
  ([hydrateRoot](https://react.dev/reference/react-dom/client/hydrateRoot)).
- `document.head` is trusted HTML from the host; waavy does not sanitize it
  and documents that.
- Deferred, each with its own contract and tests when added (§12): **fragment
  mode** (return container + island + scripts for embedding in host templates,
  with head assets returned separately), and **component-owned document
  mode** (component renders `<html>`).

### 4.4 Data island and hydration

Island: `{"v":1,"page":"product","buildId":"…","props":{…}}`.

Escaping (applied to the serialized JSON string, emitted as these literal
six-character JSON escapes):
- `<` → `<`, `>` → `>`, `&` → `&`
- U+2028 → ` `, U+2029 → ` `

Generated client entry per page:

```ts
import Page from "../../pages/product.tsx";
import { hydrate } from "@bundt/waavy/browser";
hydrate(Page);
```

`hydrate` reads `#waavy-data`, checks `buildId` matches the one compiled into
the entry (warn on mismatch), and calls `hydrateRoot(#waavy-root, <Page {...props}/>)`
with `onRecoverableError` wired to `console.error`.

Required tests: a prop value containing `</script><script>alert(1)</script>`
round-trips intact and does not execute; a **real-browser** (Playwright)
test clicks an interactive control after hydration and observes the state
change — not merely the absence of hydration warnings.

---

## 5. Host protocol

### 5.1 Request / response

```ts
type RenderRequest = {
  v: 1;
  page: string;                 // registered page ID
  props?: JsonValue;            // default {}
  document?: { title?: string; lang?: string; head?: string };
  stream?: boolean;             // default false (buffered)
  timeoutMs?: number;           // default from config (e.g. 10_000)
};
```

Success: complete HTML document (`text/html; charset=utf-8`).
Failure: `{ "error": { "code": ErrorCode, "message": string, "page"?: string } }`.

### 5.2 Rendering semantics

Terms, kept distinct:
- **Recoverable error** — React `onError` for an error inside a Suspense
  boundary; React emits the fallback and the client retries rendering that
  subtree ([renderToReadableStream](https://react.dev/reference/react-dom/server/renderToReadableStream)).
  The document is still valid. Counted and reported (header
  `Waavy-Recoverable-Errors: <n>` in buffered HTTP mode; stderr JSON line in
  one-shot), not a failure.
- **Render failure** — the shell fails (`renderToReadableStream` rejects).
  No usable HTML. → `RENDER_FAILED`.
- **Timeout** — at `timeoutMs`, waavy calls `abort()`. If the shell is not
  ready → `RENDER_TIMEOUT` (failure). If it is, pending boundaries switch to
  client rendering and the document completes (recoverable, counted).

**Buffered (default):** waavy waits for `allReady`, builds the full document,
then responds. The host gets either a complete document with `200` (+
recoverable count) or an error body with a non-2xx status / non-zero exit. A
host that has received a 200 has the whole, final document.

**Streaming (opt-in, `stream: true`):**
- Headers are not sent until the shell is ready, so shell failures and shell
  timeouts still return a proper error status and body.
- After `200` is sent, the only failure is an **interrupted stream**: waavy
  terminates the response without the final chunk (TCP/socket close before the
  chunked terminator). Hosts must treat an incomplete body as failure and must
  not assume a forwarded 200 means success. This is the documented contract.
- HTTP trailers are **not** part of the contract. A Phase 2 spike checks
  whether Bun.serve + hyper/reqwest support them end-to-end; only then could a
  `Waavy-Error` trailer be added as an optional extra.
- Client disconnect → waavy aborts the render (AbortSignal) and frees resources.

### 5.3 Transports

**One-shot:** `waavy render --release dist/waavy --page product --props '{…}'`
(or the full `RenderRequest` as JSON on stdin with `--stdin`).
- stdout: the HTML document (buffered by default; `--stream` opts in).
- stderr: JSON lines only — recoverable-error reports and, on failure, one
  `{"error":…}` line.
- exit code: `0` on success, else from `ERROR_CODES`.

**HTTP:** `waavy serve --release dist/waavy (--socket /run/waavy.sock | --port 4100)`
- `POST /render` → §5.1/§5.2.
- `GET /health` → `{ ok, buildId, protocolVersion }`.
- Releases are swapped by restarting the process (no hot swap initially).

Clients (waavy-rs and future ones) **connect** to an existing renderer;
process supervision is a separate, optional component (§9). One-shot fallback
is an explicit caller choice, never an automatic retry of a failed render.

### 5.4 Errors

```ts
export const ERROR_CODES = {
  INVALID_REQUEST:  { exit: 10, http: 400 },
  PAGE_NOT_FOUND:   { exit: 11, http: 404 },
  RENDER_FAILED:    { exit: 20, http: 500 },
  RENDER_TIMEOUT:   { exit: 21, http: 504 },
  RELEASE_INVALID:  { exit: 30, http: 503 },
  VERSION_MISMATCH: { exit: 31, http: 503 },
  BUILD_FAILED:     { exit: 40, http: 500 },
  CONFIG_INVALID:   { exit: 41, http: 500 },
  INTERNAL:         { exit: 70, http: 500 },
} as const;
```

One `WaavyError` (`code`, `message`, `cause`). Library code throws; only
`transport/` maps codes to exit/HTTP. No empty catches; `process.exit` only in
`transport/oneshot.ts` and `cli/`.

---

## 6. Execution model

| Mode | Use | Notes |
|---|---|---|
| `render` (one-shot) | scripts, CI, low traffic, simplest integration | spawn + import release per call |
| `serve` (warm) | production hosts | release imported once; module cache warm |
| `ssg` | static output at build time | batch over the same renderer |

### SSG

Same renderer, buffered mode, driven by an explicit job list — no route
discovery, no loaders in page modules:

```jsonc
// jobs.json  (or `ssg.jobs: () => Promise<Job[]>` in waavy.config.ts, which runs in Bun at build time, never in the browser)
[{ "page": "product", "path": "/products/42", "props": { … }, "document": { "title": "…" } }]
```

Output: `<outDir>/<path>/index.html` per job, plus `client/` copied to
`<outDir><publicPath>`. Any job failure fails the command with its code.

---

## 7. Caching

**No HTML render cache in the initial release.** The warm renderer keeps
modules loaded; response caching is the host's job (it knows which props and
users are cacheable). The existing cache code and its tests are deleted.

Revisit only after measuring `serve` latency on realistic pages. If added, it
is explicit opt-in per request, keyed on `(buildId, pageId, canonical props,
document)` — the complete render input, which is well-defined precisely because
there are no loaders or request context.

---

## 8. Build & distribution

- Align with bundt: `build/` (package build) using
  `@bundt/internal-build-utils`, output to `dist/`; package exports point at
  built `dist/*.js` + `dist/*.d.ts` (no `@/` aliases to break declarations).
- **Binary via per-platform packages** (esbuild/biome pattern):
  `@bundt/waavy-{darwin-arm64,darwin-x64,linux-x64,linux-arm64,win32-x64}` in
  `optionalDependencies` with `os`/`cpu`; `bin/waavy.js` resolves the matching
  binary. Removes `post-install.js`, `undici`, gzip, and GitHub URLs from npm installs.
- GitHub release assets (bundt release workflow, tag `@bundt/waavy@x.y.z`)
  serve non-npm hosts and CI images.
- `waavy build` needs the project's `node_modules` (React etc.) on the build
  machine; `serve`/`render` need only the binary + release (D8).
- CI: build the binary and run contract tests on linux + macOS runners;
  an install test from `npm pack` tarballs.
- **Phase 1 spike:** confirm `Bun.build` works inside a `bun build --compile`
  executable (needed for `waavy build` from the binary). Fallback: `waavy build`
  runs via `bunx @bundt/waavy build` on build machines only.

---

## 9. Satellites

- **waavy-rs → `bundt/crates/waavy` (D4).** Split into:
  - `Client` — connects to `--socket`/`--port`, `render(&RenderRequest) -> Result<Html, WaavyError>`
    and `render_stream(...) -> impl Stream<Item = Result<Bytes>>` that yields
    an error if the stream ends without the chunked terminator (§5.2). Typed
    `ErrorCode` enum generated from / checked against `protocol.schema.json`.
  - `oneshot::render(...)` — explicit one-shot invocation.
  - `Supervisor` (optional, feature-gated) — spawn/health-check/restart a
    `waavy serve` process. Not required to use `Client`.
  - Integration tests against the compiled binary + a fixture release.
- **`examples/axum`** — the reference host: axum route → `Client::render` →
  response; serves `dist/waavy/client` at `/assets/`.
- **create-waavy-app** — deferred; `examples/` cover onboarding until the
  contract is stable.
- **Standalone repos** — archived with README pointers **after** Phase 3
  (replacement installable and usable) (D5).

---

## 10. What gets deleted

All of `cli/RenderAction/models/*` and `cli/RenderAction/utils/cache/*` (cache),
`cli/RenderAction/cache.ts`, `__tests__/cache/*`, `server/models/Hydra.tsx`,
`server/hydration.ts`, `templates/*hydration*`, inline window scripts,
`cli/PreRenderAction`, `cli/SSGAction` (rewritten per §6), `cli/BundleAction`
(subsumed by `build`), `extensions/tanstack-react-query.tsx` (D6),
`utils/telemetry`, `utils/models/{PeerDependencyManager,Features,Serializer}.ts`
+ feature flags in `config/config.ts`, `types/worker.ts`, all
`index.metadata.ts`, `utils/log`, `post-install.js`, `scripts/gzip-binaries.ts`,
`templates/waavy-error-page.ts` (errors are JSON; host renders its own error page).

---

## 11. Testing strategy

- **core:** unit tests — port existing render tests; add island escaping,
  document shell, protocol schema, error mapping, timeout/abort semantics.
- **build:** fixture project → release; manifest schema; every file present;
  server entry exports `render`; buildId consistency server↔client.
- **runtime:** release validation failures (missing file, version mismatch),
  unknown page ID.
- **contract tests:** spawn the compiled binary in one-shot and serve mode;
  assert stdout/stderr/exit codes and HTTP status/body against the schema,
  including: shell failure, recoverable boundary error, timeout before/after
  shell, streamed interruption, client disconnect.
- **browser e2e (Playwright):** build → serve → load page → click → assert
  state change; `</script>` prop test.
- **Rust:** `crates/waavy` integration tests against the binary.
- **install test:** `npm pack` → install in a temp project → `waavy --version`.
- **import-layer test:** enforces §3.2.

---

## 12. Plan

| Phase | Spec | Content | Exit criteria |
|---|---|---|---|
| 0 | — (done locally) | bundt is source of truth; `CLAUDE.md` points here | — |
| 1 | `WAAVY_P1_SLICE.md` | New tree (§3.4) + FF-04 cleanup; `core`; config with page registry; `waavy build` → release; `createRenderer`; one-shot buffered `render`; document shell + island + `hydrate`; Bun.build-in-binary spike | One fixture page builds, renders via one-shot, and passes the Playwright click test + `</script>` test; import-layer test green |
| 2 | `WAAVY_P2_SERVE_RS.md` | `serve` (HTTP, socket + port); streaming opt-in per §5.2; trailer spike (informational); `crates/waavy` `Client` + one-shot; `examples/axum` using the compiled binary | Rust integration test renders a page through `serve` and the Playwright test passes against the axum example |
| 3 | `WAAVY_P3_DIST.md` | Per-platform packages, release workflow, CI matrix (linux/macOS), install test, `Supervisor`; publish `@bundt/waavy` 0.3.0; archive standalone repos; deprecate npm `waavy` | `npm i @bundt/waavy` on a clean machine yields a working binary; release assets published |
| 4 | `WAAVY_P4_SSG.md` | `ssg` with job list on the same renderer | Fixture site output snapshot; job failure fails the command |
| later | measured | HTML caching, fragment mode, component-owned documents, named exports, loaders (separate modules from components, with defined merge rules), hot release swap | each needs a measured or user-driven reason |

Most Appendix A defects disappear by construction in Phase 1 rather than being
patched in place.

---

## 13. Decisions

| # | Decision | Recommendation |
|---|---|---|
| D1 | Warm transport | **HTTP** over unix socket or TCP port. |
| D2 | Engine/CLI runtime | **Bun-only** (compiled binary); `core` stays runtime-agnostic internally. |
| D3 | ~~Cache encryption~~ | Moot — caching deferred (§7). |
| D4 | waavy-rs location | **Move to `bundt/crates/waavy`**. |
| D5 | Standalone repos | **Archive after Phase 3**, README pointers; don't delete. |
| D6 | TanStack Query extension | **Drop**. |
| D7 | First published version | **`@bundt/waavy` 0.3.0** at end of Phase 3. |
| D8 | React in the release | **Bundle React into `server/entry.js`** (self-contained release, one React instance) rather than resolving from `node_modules` at render time. |
| D9 | Fragment mode (embed in host templates) | **Defer**, but it is the likely first addition — Rails/Django/Phoenix hosts commonly want it. |

Decisions D10–D15 (rewrite strategy, Windows, React version, CSS, crates.io,
musl) are recorded in `README.md` in this folder.

---

## Appendix A — Known defects in current code (2026-10-28 audit)

Kept for traceability; most are removed by the redesign rather than fixed.

**Render:** unquoted version in inline script → SyntaxError, and
`__$stash__` undefined (`cli/RenderAction/utils/browser/index.tsx:77,82`,
`server/models/Hydra.tsx:41,46`) · `--max-timeout` timer never cleared (passed
by value, `Action.tsx:48-50,89-91`) → process lingers for full timeout ·
`handleError` not awaited (`Action.tsx:121`) → every error exits 9 · `--pipe`
receives wrong options object (`Action.tsx:182`), bad `path.relative` against
`import.meta.url`, cache hit writes nothing · `--error-page-*` camelCase
mismatch · `--request` never JSON-parsed · `--bootstrap` string not array ·
`--fail-silently`/`--verbose` no-ops · `getServerSideProps` errors swallowed ·
post-shell stream errors exit 0 · props/selector unescaped in inline script.

**Cache:** SQLite lookup by random-IV ciphertext never hits
(`CacheSqlite3.ts:97,135-142`) · header DB grows per write · file backend aborts
scan on first decrypt failure, writes metadata before payload · header DB opened
at import (`Cache.ts:23`) · lookup ignores cache type · raw-path keys · no
invalidation (`delete()` → false) · inconsistent `--cache-type` names.

**SSG:** `getWaavyConfig("ssg")` not awaited (`SSGAction/setup.ts:23`) ·
`handleStaticRoute` / `writeStaticComponentToFile` not awaited · output written
to `outdir/<abs source path>.tsx` · HTML never references hydration bundle ·
`querySelector("document")` → null · template import path off by one dir ·
errors swallowed (`server/index.tsx:31`, `SSGAction/utils/index.ts:53-58`) ·
pages without `route(s)` emit nothing · `getStaticProps` return shape mismatch ·
`skipBundling`/`bootstrapModules`/`disableHydrationBundling` unused.

**Packaging / bin:** no `postinstall` script; `undici` undeclared; release URL
points at old repo; executables not in `files`; gzip never run; `.d.ts` keep
`@/` aliases; `out/server.js` built for Node but uses `Bun.*`;
`bin/lib/utils/index.js` ReferenceErrors (`platform`, `arch`, `chalk`); null
exit code (signal) forwarded as success; `load()` mis-handles Windows absolute
paths; `post-install.js:202` undefined `platform`.

**Library misc:** `TextDecoder` without `{stream:true}` in callback piping;
`bundleInlineCode` `minify || true`; temp-file leaks; logger discards output;
`PropDataLoaderException` uses printf `%e`.

**Docs drift:** bundt `README.md` and `docs/docs/packages/waavy.mdx` document
non-existent `renderToStream`/`hydrateApp`/`build|dev|serve`; `CLAUDE.md` waavy
notes stale; CHANGELOG has no 0.2.0; RELEASE.md references missing scripts.
