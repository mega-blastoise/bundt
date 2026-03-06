# Architecture

## System Overview

```
                         Composition Request (JSON)
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────┐
│                        prev server                          │
│                                                             │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────────────┐  │
│  │  Fragment    │  │  Data Source  │  │   Composition     │  │
│  │  Registry    │  │  Registry    │  │   Engine          │  │
│  │             │  │              │  │                   │  │
│  │  Map<id,    │  │  Map<id,     │  │  Layout Solver    │  │
│  │   FragDef>  │  │   DSDef>     │  │  Data Binder      │  │
│  │             │  │              │  │  Binding Resolver  │  │
│  └─────────────┘  └──────────────┘  └───────────────────┘  │
│                                             │               │
│                                     ┌───────┴───────┐      │
│                                     │    Frame      │      │
│                                     │  (composed)   │      │
│                                     └───────┬───────┘      │
│                                             │               │
│  ┌──────────────────┐              ┌────────┴────────┐     │
│  │   SQLite          │◄────────────│   SSR Engine    │     │
│  │   sessions        │             │   renderTo      │     │
│  │   frames          │             │   ReadableStream│     │
│  │   fragment_state  │             └────────┬────────┘     │
│  │   data_cache      │                      │              │
│  └──────────────────┘                       ▼              │
│                                    Streaming HTML          │
│                                    + client.js             │
│                                    + glue.js               │
└─────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────┐
│                        Browser                              │
│                                                             │
│  ┌────────────────────────────────────────────────────┐     │
│  │  #prev-workspace (CSS Grid)                        │     │
│  │  ┌──────────────┐  ┌──────────────┐               │     │
│  │  │  Fragment A   │  │  Fragment B   │               │     │
│  │  │  (SSR HTML)   │  │  (SSR HTML)   │               │     │
│  │  └──────────────┘  └──────────────┘               │     │
│  └────────────────────────────────────────────────────┘     │
│                                                             │
│  client.js: Event delegation + WebSocket                    │
│  glue.js:   Frame config + binding wiring                   │
│                                                             │
│  Click → WebSocket → Server → Re-render → WebSocket → DOM  │
└─────────────────────────────────────────────────────────────┘
```

## Module Dependency Graph

```
index.ts (public API)
  ├── server/server.ts
  │     ├── composition/engine.ts
  │     │     ├── composition/layout-solver.ts
  │     │     ├── composition/data-binder.ts
  │     │     └── composition/binding-resolver.ts
  │     ├── registry/fragment-registry.ts
  │     ├── registry/data-source-registry.ts
  │     ├── server/ssr.tsx
  │     ├── server/websocket.tsx
  │     ├── server/session.ts
  │     │     └── server/database.ts
  │     └── server/database.ts
  └── types.ts

client/index.ts (browser entry)
  ├── client/runtime.ts
  ├── client/hydration.ts
  ├── client/bindings.ts
  └── client/layout.ts
```

## Key Design Decisions

### Server-Side Composition

The server owns the composition logic. The client receives pre-rendered HTML and a minimal glue bundle. This means:

- **No component code on the client** — fragments run only on the server
- **No client-side React bundle** — interactions use data attributes + event delegation
- **Partial updates via WebSocket** — the server re-renders individual fragments and sends HTML patches

### CSS Grid Layout

All layouts are implemented as CSS Grid. The layout solver assigns `grid-area` positions to each fragment. This approach:

- Works with SSR (styles are inlined)
- Requires no client-side JavaScript for layout
- Supports all common arrangements (split, grid, primary-detail, dashboard)

### SQLite Persistence

Sessions, frames, fragment state, and data cache are persisted to SQLite via `bun:sqlite`. WAL mode enables concurrent reads. This provides:

- Session restore after server restart
- Frame history with back/forward navigation
- Data caching with configurable TTL

### Fragment Isolation

Each fragment is rendered independently inside a `<Suspense>` boundary. This means:

- One fragment's error doesn't crash the workspace
- Fragments can load data at different speeds
- Partial updates replace only the target fragment's DOM
