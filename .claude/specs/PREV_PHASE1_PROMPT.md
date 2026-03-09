# Phase 1 Implementation Prompt: @bundt/prev Foundation

## Context

You are working in the `bundt` monorepo at `/home/nicks-dgx/dev/bundt/`. Read `.claude/specs/PREV.md` for the full specification of `@bundt/prev` — an agent-native dynamic UI framework that composes React UIs on the server from registered Fragments and Data Sources, streams them via SSR, and hydrates them on the client.

This prompt covers **Phase 1: Foundation (MVP)** only. Do not implement MCP tools, the agent chat panel, 3P fragment loading, or reactive subscriptions — those are Phase 2-4.

## Goal

A working `@bundt/prev` server that can:
1. Register first-party Fragments and Data Sources via `defineFragment` and `defineDataSource`
2. Accept structured composition requests (explicit fragment + data source + binding specs)
3. Compose Frames from those requests (layout solving, data binding, inter-fragment wiring)
4. Stream the composed Frame to the browser via React 19 `renderToReadableStream`
5. Hydrate the workspace on the client with per-fragment Suspense boundaries
6. Persist sessions and frames to SQLite via `bun:sqlite`
7. Handle client interactions via WebSocket (interaction events up, partial re-renders down)
8. Generate per-frame composition glue bundles via `Bun.build()`

## Workspace Setup

### Package Location

Create `packages/prev/` following existing monorepo conventions. Reference `packages/hateoas/package.json` and `packages/waavy/package.json` for patterns.

### package.json

```json
{
  "name": "@bundt/prev",
  "version": "0.1.0",
  "type": "module",
  "description": "Agent-native dynamic UI framework. Server-composed, streaming React SSR with fragment-based micro-frontends.",
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "https://github.com/mega-blastoise/bundt.git",
    "directory": "packages/prev"
  },
  "homepage": "https://github.com/mega-blastoise/bundt/tree/main/packages/prev",
  "bugs": {
    "url": "https://github.com/mega-blastoise/bundt/issues"
  },
  "publishConfig": {
    "access": "public",
    "registry": "https://registry.npmjs.org/"
  },
  "keywords": ["react", "ssr", "streaming", "agent", "ai", "fragments", "dynamic-ui", "bun"],
  "exports": {
    ".": {
      "bun": "./src/index.ts",
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts",
      "default": "./dist/index.js"
    },
    "./client": {
      "browser": "./dist/client.js",
      "bun": "./src/client/index.ts",
      "types": "./dist/client.d.ts",
      "default": "./dist/client.js"
    },
    "./build": {
      "bun": "./src/build/index.ts",
      "import": "./dist/build.js",
      "types": "./dist/build.d.ts",
      "default": "./dist/build.js"
    }
  },
  "files": ["dist", "LICENSE"],
  "engines": {
    "bun": ">=1.3"
  },
  "scripts": {
    "prebuild": "rm -rf dist",
    "build": "bun run build/index.ts",
    "typecheck": "tsc --noEmit",
    "test": "bun test",
    "clean": "rm -rf dist"
  },
  "peerDependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "zod": "^4.0.0"
  },
  "dependencies": {
    "picocolors": "^1.1.1"
  },
  "devDependencies": {
    "@bundt/internal-build-utils": "workspace:*",
    "@types/bun": "latest",
    "@types/react": "^19.1.0",
    "@types/react-dom": "^19.1.0",
    "react": "^19.1.0",
    "react-dom": "^19.1.0",
    "typescript": "^5.9.0",
    "zod": "^4.0.0"
  }
}
```

### tsconfig.json

Extend the root tsconfig:

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist", "build", "**/*.test.ts"]
}
```

## Directory Structure

Build exactly this structure. Do not add files beyond what is listed. Do not create README or documentation files.

```
packages/prev/
  package.json
  tsconfig.json
  build/
    index.ts                       # Build script using Bun.build

  src/
    index.ts                       # Public API: createPrevServer, defineFragment, defineDataSource
    types.ts                       # All core type definitions

    server/
      index.ts                     # Server barrel
      server.ts                    # createPrevServer — Bun.serve + WebSocket + routes
      ssr.ts                       # Streaming SSR: renderToReadableStream with Suspense per fragment
      websocket.ts                 # WebSocket handler: interaction events, partial re-renders
      session.ts                   # Session CRUD against SQLite
      database.ts                  # SQLite schema init + query helpers

    composition/
      index.ts                     # Composition barrel
      engine.ts                    # Orchestrates: resolve layout -> bind data -> produce Frame
      layout-solver.ts             # Fragment arrangement into CSS Grid positions
      data-binder.ts               # Builds DataFetchPlan, executes fetches, injects results
      binding-resolver.ts          # Wires inter-fragment interaction->prop/data bindings

    registry/
      index.ts                     # Registry barrel
      fragment-registry.ts         # In-memory Map of registered fragments + lookup
      data-source-registry.ts      # In-memory Map of registered data sources + lookup

    client/
      index.ts                     # Client barrel: useFragment hook, runtime init
      runtime.ts                   # Client runtime: hydration orchestration, WebSocket, binding eval
      hydration.ts                 # hydrateRoot on workspace container
      bindings.ts                  # Client-side binding wiring (evaluate binding graph on interaction)
      layout.ts                    # CSS Grid layout manager (reads layout from server, applies to DOM)

    build/
      index.ts                     # Build barrel
      composition-bundler.ts       # Generates per-frame glue bundle via Bun.build()
```

## Implementation Instructions

Work through the source files in dependency order. Each section below specifies the file, its responsibility, and key implementation details.

### 1. `src/types.ts` — Core Type Definitions

Define all core types as TypeScript interfaces and type aliases. No classes. No enums — use `as const` objects or union types.

**Types to define:**

- `FragmentDefinition<TProps, TData, TInteractions>` — the output of `defineFragment`
- `DataSourceDefinition<TParams, TReturns>` — the output of `defineDataSource`
- `FragmentRenderContext<TProps, TData, TInteractions>` — passed to render functions `{ props, data, emit }`
- `FragmentRenderProps<TProps, TData, TInteractions>` — same shape, for component references
- `Frame` — `{ id, sessionId, layout, fragments, bindings, createdAt, intent? }`
- `FragmentInstance` — `{ instanceId, fragmentId, props, dataBindings, position, size }`
- `DataBinding` — source fragment interaction field -> target fragment prop/dataParam
- `LayoutType` — union: `'single' | 'split-horizontal' | 'split-vertical' | 'grid' | 'primary-detail' | 'dashboard' | 'custom'`
- `LayoutDefinition` — `{ type, gap, padding, areas? }`
- `LayoutPosition` — `{ row, col, rowSpan, colSpan }`
- `LayoutSize` — `{ width, height, minWidth?, minHeight?, maxWidth?, maxHeight? }`
- `LayoutHints` — `{ minWidth?, minHeight?, resizable?, preferredAspectRatio? }`
- `DataFieldDefinition` — `{ source: ZodType, params: ZodType }`
- `InteractionDefinition` — `{ payload: ZodType }`
- `DataSourceBinding` — `{ source: string, params: Record<string, unknown> }`
- `DataFetchPlan` — `{ steps: DataFetchStep[] }`
- `DataFetchStep` — `{ dataSourceId, params, targetFragmentInstanceId, targetDataKey, dependsOn? }`
- `Session` — `{ id, agentId, currentFrameId, frameHistory, historyIndex, metadata, createdAt, lastActiveAt }`
- `StructuredComposition` — the structured composition request format (fragments array, bindings array, layout)
- `PrevServerConfig` — configuration for `createPrevServer`
- `InteractionEvent` — `{ frameId, fragmentInstanceId, interaction, payload }`

Use Zod types in generic positions where the spec calls for schema validation. Import `type { z }` from zod where needed for type-level references.

### 2. `src/registry/fragment-registry.ts` and `data-source-registry.ts`

Simple in-memory registries. Use `Map<string, FragmentDefinition>` and `Map<string, DataSourceDefinition>`.

Each registry exposes:
- `register(definition)` — validates and stores
- `get(id)` — returns definition or throws
- `has(id)` — boolean check
- `list(filter?)` — returns all, optionally filtered by tags
- `getSchema(id)` — returns the JSON-serializable schema for a fragment/data source (for future MCP use)

Export factory functions: `createFragmentRegistry(fragments)` and `createDataSourceRegistry(dataSources)`.

### 3. `src/server/database.ts` — SQLite Persistence

Use `bun:sqlite` (`import { Database } from 'bun:sqlite'`). Create a `createDatabase(path: string)` function that:

1. Opens (or creates) the SQLite file
2. Runs the schema creation SQL from the spec (sessions, frames, frame_history, fragment_state, data_cache tables)
3. Enables WAL mode for concurrent reads
4. Returns an object with typed query helpers:
   - `sessions.create(session)`, `sessions.get(id)`, `sessions.update(id, fields)`, `sessions.touch(id)`
   - `frames.create(frame)`, `frames.get(id)`, `frames.getBySession(sessionId)`
   - `frameHistory.push(sessionId, frameId)`, `frameHistory.get(sessionId)`
   - `fragmentState.set(frameId, instanceId, state)`, `fragmentState.get(frameId, instanceId)`
   - `dataCache.get(sourceId, paramsHash)`, `dataCache.set(sourceId, paramsHash, result, ttl)`

Use prepared statements for performance. Serialize JSON fields with `JSON.stringify`/`JSON.parse`.

### 4. `src/server/session.ts` — Session Management

Wraps the database session helpers with lifecycle logic:
- `createSession(agentId, metadata?)` — generates UUID, creates in DB, returns Session
- `getOrCreateSession(sessionId?)` — restore from DB or create new
- `touchSession(id)` — update `lastActiveAt`
- `getSessionFrame(sessionId)` — returns the current Frame for the session
- `pushFrame(sessionId, frame)` — persists frame, updates history, sets as current
- `navigateHistory(sessionId, direction, steps)` — moves through frame history

Generate IDs with `crypto.randomUUID()`.

### 5. `src/composition/layout-solver.ts` — Layout Solver

Takes a list of `FragmentInstance` objects (with their layout hints) and an optional layout type preference. Returns a `LayoutDefinition` with positions assigned to each fragment.

**Layout algorithms (implement all for Phase 1):**

- `single` — one fragment, full width/height
- `split-horizontal` — two fragments side by side, 50/50 (or respect size hints)
- `split-vertical` — two fragments stacked
- `grid` — auto-grid: `Math.ceil(Math.sqrt(n))` columns
- `primary-detail` — first fragment gets 2/3 width, rest share 1/3 in a column
- `dashboard` — 3-column grid, fragments fill slots in order

Auto-select layout type when not specified:
- 1 fragment -> `single`
- 2 fragments -> `split-horizontal`
- 3 fragments -> `primary-detail`
- 4+ fragments -> `dashboard`

Export: `solveLayout(fragments: FragmentInstance[], preferredLayout?: LayoutType): LayoutDefinition`

### 6. `src/composition/data-binder.ts` — Data Binding + Fetch

Takes a structured composition request and the data source registry. Produces a `DataFetchPlan` and executes it.

1. For each fragment in the composition, resolve its `data` field to a concrete data source
2. Build a dependency graph: if fragment B's data params reference fragment A's interaction output, B depends on A's initial data
3. Execute independent fetches in parallel (`Promise.all`)
4. Execute dependent fetches after their dependencies resolve
5. Return a map of `fragmentInstanceId -> { [dataKey]: resolvedData }`

For Phase 1, initial data bindings (the ones used during SSR) are static — they use the params provided in the composition request. Reactive re-fetching on interaction happens through the WebSocket flow (see websocket.ts).

Export: `createDataBinder(dataSourceRegistry)` returning `{ buildFetchPlan, executeFetchPlan }`

### 7. `src/composition/binding-resolver.ts` — Inter-Fragment Bindings

Takes the `DataBinding[]` from the composition and produces a wiring map that the client runtime uses to connect interactions to targets.

For each binding:
1. Validate that the source fragment has the declared interaction
2. Validate that the target fragment has the declared prop or data param
3. Produce a serializable binding descriptor that the client runtime can evaluate

Export: `resolveBindings(bindings, fragmentInstances, fragmentRegistry): ResolvedBinding[]`

### 8. `src/composition/engine.ts` — Composition Engine

The main orchestrator. Takes a `StructuredComposition` request and produces a `Frame`.

```
compose(request, sessionId) ->
  1. Validate all fragment IDs exist in registry
  2. Validate all data source references exist
  3. Create FragmentInstance objects with generated instanceIds
  4. Run layout solver
  5. Run data binder (build + execute fetch plan)
  6. Run binding resolver
  7. Assemble Frame object
  8. Return Frame + fetched data
```

Export: `createCompositionEngine(fragmentRegistry, dataSourceRegistry)` returning `{ compose }`

### 9. `src/server/ssr.ts` — Streaming SSR

Takes a Frame + fetched data and produces a `ReadableStream` via React 19's `renderToReadableStream`.

The rendered HTML structure:

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>prev workspace</title>
  <style>/* workspace grid layout CSS, generated from LayoutDefinition */</style>
</head>
<body>
  <div id="prev-root">
    <div id="prev-workspace" style="display: grid; ...layout CSS...">
      <!-- Each fragment wrapped in Suspense -->
      <div data-prev-fragment="inst_1" data-prev-fragment-id="sales-chart" style="grid-area: ...">
        <Suspense fallback={<FragmentSkeleton />}>
          <FragmentRenderer instance={...} data={...} />
        </Suspense>
      </div>
      <div data-prev-fragment="inst_2" ...>
        ...
      </div>
    </div>
  </div>
  <!-- Hydration scripts appended after content -->
  <script type="module" src="/prev/client.js"></script>
  <script type="module" src="/prev/frame/{frameId}/glue.js"></script>
</body>
</html>
```

Key implementation details:
- Use `react-dom/server`'s `renderToReadableStream`
- Each fragment is a React component that receives its resolved data as props
- Wrap each fragment in `<Suspense>` with a skeleton fallback
- The fragment's `render` function (or component) is called with `{ props, data, emit }` — during SSR, `emit` is a no-op
- Generate inline CSS for the grid layout from the `LayoutDefinition`
- Append script tags for the client runtime and composition glue bundle

Export: `renderFrame(frame, fragmentRegistry, resolvedData): ReadableStream`

### 10. `src/build/composition-bundler.ts` — Glue Bundle Generation

Generates a per-frame JavaScript bundle that initializes the client runtime with the frame's configuration.

For Phase 1, since all fragments share a React tree and are 1P (their code is already in the server bundle), the glue bundle is minimal — it contains:
- Frame metadata (fragment instance IDs, binding wiring)
- WebSocket URL
- Hydration initialization call

Use `Bun.build()` to produce the bundle. Write the entry to a temp file, build it, serve the output.

The generated entry looks like:

```typescript
import { initFrame } from '@bundt/prev/client';
initFrame({
  frameId: '...',
  fragments: [...],
  bindings: [...],
  wsUrl: '...',
});
```

Export: `buildCompositionGlue(frame, resolvedBindings): Promise<string>` — returns the built JS string or path.

### 11. `src/server/websocket.ts` — WebSocket Handler

Handles bidirectional communication after hydration:

**Client -> Server (interaction events):**
```json
{ "type": "interaction", "frameId": "...", "fragmentInstanceId": "...", "interaction": "rowSelect", "payload": { "rowId": "123" } }
```

**Server -> Client (partial updates):**
```json
{ "type": "fragment-update", "fragmentInstanceId": "...", "html": "<rendered HTML>", "data": { ... } }
```

On receiving an interaction:
1. Look up the frame and its bindings
2. Find bindings where the source matches the interaction
3. For each affected target fragment:
   a. Compute new data params from the binding
   b. Re-fetch the target's data source with new params
   c. Re-render the target fragment to HTML (using `renderToString` for partials)
   d. Send the partial update to the client
4. Update fragment state in SQLite

Export: `createWebSocketHandler(compositionEngine, sessionManager, database)`

### 12. `src/client/runtime.ts` — Client Runtime

The client runtime runs in the browser. It:
1. Receives frame configuration from the glue bundle
2. Establishes WebSocket connection
3. Registers interaction handlers on fragment DOM elements
4. On receiving a partial update from the server, patches the target fragment's DOM

For Phase 1, DOM patching for partial updates can use a simple approach:
- Server sends re-rendered HTML for a fragment
- Client replaces the fragment container's innerHTML
- React will reconcile on the next hydration pass

This is intentionally simple for Phase 1. Phase 2+ will use more sophisticated incremental updates.

### 13. `src/client/hydration.ts` — Hydration

Calls `hydrateRoot` on `#prev-root` after the page loads. Since v1 uses a shared React tree, this is a single hydration call.

The hydration component tree must match what the server rendered — the `WorkspaceLayout` component with `FragmentRenderer` children inside `Suspense` boundaries.

### 14. `src/client/bindings.ts` — Client Binding Evaluation

Evaluates the binding graph on the client side for optimistic updates:
- When a fragment emits an interaction, check if any bindings connect it to other fragments
- For simple prop bindings (no data re-fetch needed), update the target fragment immediately (optimistic)
- For data-dependent bindings, show a loading state on the target while the server re-fetches

### 15. `src/client/layout.ts` — CSS Grid Layout

Reads the layout definition from the server-rendered HTML (or from the glue bundle config) and manages the CSS Grid:
- Handles window resize
- Supports fragment resize via drag handles on fragment borders
- Updates grid-template-columns/rows when fragments resize

### 16. `src/server/server.ts` — Main Server

The `createPrevServer` function that ties everything together:

```typescript
createPrevServer(config: PrevServerConfig) -> {
  listen(): void;
  close(): void;
}
```

Uses `Bun.serve()` with routes:

| Route | Method | Purpose |
|-------|--------|---------|
| `/` | GET | Serves the initial HTML shell (empty workspace, no frame yet) |
| `/prev/compose` | POST | Accepts structured composition, returns streaming SSR response |
| `/prev/frame/:frameId` | GET | Re-streams an existing frame (session restore) |
| `/prev/frame/:frameId/glue.js` | GET | Serves the composition glue bundle |
| `/prev/client.js` | GET | Serves the pre-built client runtime bundle |
| `/prev/ws` | GET (upgrade) | WebSocket endpoint |
| `/prev/api/session` | GET | Returns current session state (for debugging/dev) |

The server:
1. Initializes the database
2. Creates registries from config
3. Creates the composition engine
4. Builds the client runtime bundle once at startup
5. Starts Bun.serve with the routes above

### 17. `src/index.ts` — Public API Barrel

Exports:
- `createPrevServer` from `./server`
- `defineFragment` — a typed factory function that validates the definition and returns a `FragmentDefinition`
- `defineDataSource` — a typed factory function that validates the definition and returns a `DataSourceDefinition`
- All core types from `./types`

`defineFragment` and `defineDataSource` are thin wrappers — they validate the schema fields are Zod types, freeze the definition object, and return it. They do not register anything; registration happens when passed to `createPrevServer`.

### 18. Build Script — `build/index.ts`

Use `Bun.build()` to produce three entry points:
- `dist/index.js` — server entry (target: bun)
- `dist/client.js` — client runtime (target: browser)
- `dist/build.js` — build tooling entry (target: bun)

Reference `@bundt/internal-build-utils` for shared build patterns if available, otherwise use `Bun.build` directly.

## Testing Strategy

Write tests in `src/**/*.test.ts` files colocated with the modules they test. Use `bun test`.

**Priority test targets for Phase 1:**

1. `defineFragment` — validates props/data/interactions are Zod schemas, rejects invalid definitions
2. `defineDataSource` — validates params/returns are Zod schemas
3. Fragment registry — register, get, list, has, duplicate ID rejection
4. Data source registry — same
5. Layout solver — each layout type produces correct grid positions for N fragments
6. Data binder — builds correct fetch plans, executes parallel/sequential fetches
7. Binding resolver — validates bindings against fragment schemas, rejects invalid references
8. Composition engine — end-to-end: structured composition -> Frame with correct layout + data + bindings
9. Database — session and frame CRUD round-trips through SQLite
10. SSR — `renderFrame` produces valid HTML with correct grid layout and fragment containers

Do NOT test the WebSocket handler or client runtime in unit tests — those require integration/e2e testing that is out of scope for Phase 1 unit tests.

## Conventions Checklist

Before writing any code, internalize these from the project's CLAUDE.md:

- [ ] Strict TypeScript: `noImplicitAny`, `noUncheckedIndexedAccess`, `verbatimModuleSyntax`
- [ ] `import type` for type-only imports
- [ ] No `any` — use `unknown` with type guards
- [ ] No `enum` — use `as const` or union types
- [ ] No default exports (except build/index.ts if needed)
- [ ] No `.js` extensions in imports
- [ ] No classes for data structures — use plain objects + factory functions
- [ ] Named exports only
- [ ] No comments unless logic is non-obvious
- [ ] No docstrings unless public API
- [ ] Prefer `const` over `let`
- [ ] `jsx: react-jsx` — no `import React`
- [ ] `bun:sqlite` for persistence, not an npm SQLite package
- [ ] `Bun.build()` for bundling, not webpack/esbuild/rollup
- [ ] `Bun.serve()` for HTTP, not express/fastify
- [ ] `crypto.randomUUID()` for ID generation

## Exit Criteria

Phase 1 is complete when:

1. `bun install` from monorepo root links `@bundt/prev`
2. `bun run build --filter=@bundt/prev` succeeds
3. `bun run typecheck --filter=@bundt/prev` passes with zero errors
4. `bun run test --filter=@bundt/prev` passes all unit tests
5. A minimal test app can:
   - Define 2-3 fragments with `defineFragment`
   - Define 1-2 data sources with `defineDataSource`
   - Create a server with `createPrevServer`
   - POST a structured composition to `/prev/compose`
   - Receive a streaming HTML response with correctly laid-out fragments
   - Open in a browser with working hydration
   - Click a fragment interaction and see the bound target fragment update via WebSocket
6. Session persistence works — restart the server, refresh the browser, workspace restores from SQLite
