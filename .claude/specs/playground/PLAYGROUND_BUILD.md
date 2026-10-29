# Prev Playground — Build Context

## Goal
A Docker-deployable Bun server showcasing prev's agent-composed UI. Visitors type natural language or click presets, and a workspace materializes via prev's composition engine, SSR, and WebSocket interactions.

## Build Order & Status

- [x] **Phase 1**: Enhance `@bundt/prev` — new `./server` export with building blocks
- [x] **Phase 2**: Fragments (10) + Data Sources (7)
- [x] **Phase 3**: Presets (4 pre-built compositions)
- [x] **Phase 4**: Server (`server.ts` — custom Bun.serve using `@bundt/prev/server`)
- [x] **Phase 5**: Playground HTML page
- [x] **Phase 6**: Compose endpoint logic (intent resolver bridge)
- [x] **Phase 7**: Config files (package.json, tsconfig, Dockerfile, .dockerignore)
- [x] **Phase 8**: Local testing
- [ ] **Phase 9**: Publish prev (0.2.0 — new export surface)
- [x] **Phase 10**: Docker build + test

## Architecture
- Single Bun.serve() on port 3000
- Imports prev building blocks from `@bundt/prev/server` (public API)
- Routes: GET / (playground HTML), POST /api/compose, GET /frame/:id, WS /ws, GET /api/registry
- Intent resolver is default composition method (works without API key)
- Claude integration deferred to V2

## Key Decisions
- Custom server (not createPrevServer) — need custom routes, middleware, rate limiting
- Prev enhanced with `./server` export so building blocks are public API
- All fragments use dark theme inline styles
- Presets compose instantly without Claude
- In-memory SQLite (:memory:) — no persistent sessions
- Docker copies only prev + internal/shared + playground from monorepo

## Current State
**Phases 1-8, 10 complete.** Playground server runs locally, typechecks clean, Docker builds and runs. All 4 presets compose successfully, intent resolver works, all endpoints return 200.

### What's Left
- [ ] **Phase 9**: Publish prev 0.2.0 (new export surface + .d.ts generation)
- [ ] **Deploy**: EC2 instance + DNS setup (see EC2_PLAYGROUND_DEPLOY.md)

### Known Issue
prev's dist bundle is compiled with dev JSX (`jsxDEV`). Docker cannot run with `NODE_ENV=production` because React's production export doesn't include `jsxDEV`. Fix: either rebuild prev with production JSX transform, or run Docker without NODE_ENV=production (current approach).

### Phase 1 Changes
- Created `packages/prev/src/server/glue.ts` — extracted generateGlueScript from server.ts
- Created `packages/prev/src/server/client-bundle.ts` — extracted buildClientBundle from server.ts
- Created `packages/prev/src/server-exports.ts` — barrel export for all building blocks
- Modified `packages/prev/src/server/server.ts` — imports from extracted modules instead of inlining
- Modified `packages/prev/package.json` — added `./server` export entry
- Modified `packages/prev/build/index.ts` — added server-exports build target

### Public API: `@bundt/prev/server`
```ts
// Registries
createFragmentRegistry, createDataSourceRegistry
// Composition
createCompositionEngine, resolveIntent
// Server infra
createDatabase, createSessionManager, createWebSocketHandler,
createSubscriptionManager, createMcpHandler
// Rendering
renderFrame, WorkspaceLayout, FragmentRenderer, FragmentSkeleton,
generateGlueScript, buildClientBundle
```

## Files to Create
```
websites/playground/
├── package.json
├── tsconfig.json
├── Dockerfile
├── .dockerignore
└── src/
    ├── server.ts
    ├── fragments.tsx
    ├── data-sources.ts
    ├── compose.ts
    ├── playground-html.ts
    └── presets.ts
```

## Files to Modify in Prev
- `packages/prev/package.json` — add `./server` export
- `packages/prev/src/server-exports.ts` — new barrel export file
- `packages/prev/src/server/server.ts` — extract generateGlueScript + buildClientBundle
- `packages/prev/build/index.ts` — add server entry to build config
