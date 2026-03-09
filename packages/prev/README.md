# @bundt/prev

Agent-native dynamic UI framework. Server-composed, streaming React SSR with fragment-based micro-frontends.

> **Status:** Pre-release (0.1.0). Core composition engine, streaming SSR, WebSocket interactions, session persistence, client runtime, and build tooling are implemented and tested (89 tests, 184 assertions across 13 test files). API surface may change before 1.0.

## What is prev?

`prev` is a React SSR framework where the **server composes the UI** from registered building blocks called **Fragments**. Instead of static page routes, an AI agent (or any orchestrator) sends a structured composition request describing which fragments to show, how to lay them out, and how to wire data between them. The server assembles a **Frame**, streams it to the browser, and handles ongoing interactions via WebSocket.

## Install

```sh
bun add @bundt/prev react react-dom zod
```

## Core Concepts

| Concept | Description |
|---------|-------------|
| **Fragment** | A self-contained UI component with typed props, data requirements, interaction declarations, and layout hints |
| **Data Source** | A server-side data fetcher with typed params and returns, optional TTL caching |
| **Frame** | A composed workspace — a set of fragment instances with layout positions, data bindings, and interaction wiring |
| **Session** | Persistent state across compositions — tracks frame history with back/forward navigation |
| **Binding** | A wire connecting one fragment's interaction output to another fragment's prop or data param, with optional path transforms |
| **Mutation** | Runtime modifications to a live frame — add, remove, replace, resize fragments, or bind/unbind interactions |

## Quick Start

```tsx
import { createPrevServer, defineFragment, defineDataSource } from '@bundt/prev';
import { z } from 'zod';

// 1. Define data sources
const usersSource = defineDataSource({
  id: 'users',
  name: 'Users API',
  params: z.object({ limit: z.number().optional() }),
  returns: z.array(z.object({ id: z.string(), name: z.string(), email: z.string() })),
  fetch: async (params) => {
    return Array.from({ length: params.limit ?? 10 }, (_, i) => ({
      id: `${i + 1}`,
      name: `User ${i + 1}`,
      email: `user${i + 1}@example.com`
    }));
  }
});

// 2. Define fragments
const userList = defineFragment({
  id: 'user-list',
  name: 'User List',
  tags: ['users'],
  props: z.object({ title: z.string().optional() }),
  data: { users: { source: 'users' } },
  interactions: {
    selectUser: { payload: z.object({ userId: z.string() }) }
  },
  render: ({ props, data }) => (
    <div>
      <h2>{props.title ?? 'Users'}</h2>
      <ul>
        {Array.isArray(data.users) && data.users.map((user: any) => (
          <li key={user.id} data-prev-interaction="selectUser"
              data-prev-payload={JSON.stringify({ userId: user.id })}>
            {user.name} — {user.email}
          </li>
        ))}
      </ul>
    </div>
  )
});

const userDetail = defineFragment({
  id: 'user-detail',
  name: 'User Detail',
  props: z.object({ selectedUserId: z.string().optional() }),
  data: {},
  interactions: {},
  render: ({ props }) => (
    <div>
      <h2>User Detail</h2>
      {props.selectedUserId
        ? <p>Selected user: {props.selectedUserId}</p>
        : <p style={{ opacity: 0.5 }}>Select a user from the list</p>}
    </div>
  )
});

// 3. Create and start the server
const server = createPrevServer({
  port: 3000,
  fragments: [userList, userDetail],
  dataSources: [usersSource],
  dbPath: './prev.db'
});

server.listen();
```

Compose a UI:

```sh
curl -X POST http://localhost:3000/prev/compose \
  -H "Content-Type: application/json" \
  -d '{
    "intent": "Show user management workspace",
    "fragments": [
      {
        "fragmentId": "user-list",
        "props": { "title": "Team Members" },
        "data": { "users": { "source": "users", "params": { "limit": 5 } } }
      },
      { "fragmentId": "user-detail" }
    ],
    "bindings": [{
      "id": "list-to-detail",
      "sourceFragmentInstanceId": "<from-compose-response>",
      "sourceInteraction": "selectUser",
      "targetFragmentInstanceId": "<from-compose-response>",
      "targetType": "prop",
      "targetKey": "selectedUserId",
      "transform": "userId"
    }],
    "layout": "split-horizontal"
  }'
```

## API Reference

### `defineFragment(definition)`

Creates a typed, frozen fragment definition.

```typescript
defineFragment({
  id: string;                    // Unique identifier (required)
  name: string;                  // Human-readable name (required)
  description?: string;          // What this fragment does
  tags?: string[];               // For filtering/discovery
  props: ZodType;                // Zod schema for component props
  data: Record<string, {         // Data field declarations
    source: string;              //   Data source ID to bind
    params?: ZodType;            //   Optional params schema
  }>;
  interactions: Record<string, { // Interaction event declarations
    payload: ZodType;            //   Payload schema
  }>;
  layoutHints?: {                // Layout solver hints
    minWidth?: string;
    minHeight?: string;
    resizable?: boolean;
    preferredAspectRatio?: number;
  };
  render: (ctx: {               // SSR render function (required)
    props: TProps;
    data: Record<string, unknown>;
    emit: EmitFn;
  }) => ReactNode;
})
```

### `defineDataSource(definition)`

Creates a typed, frozen data source definition.

```typescript
defineDataSource({
  id: string;                      // Unique identifier (required)
  name: string;                    // Human-readable name (required)
  description?: string;
  tags?: string[];
  params: ZodType;                 // Zod schema for input params
  returns: ZodType;                // Zod schema for return type
  ttl?: number;                    // Cache TTL in milliseconds
  fetch: (params: TParams) => Promise<TReturns>;  // (required)
})
```

### `createPrevServer(config)`

Creates and returns a server instance.

```typescript
createPrevServer({
  port?: number;                   // Default: 3000
  hostname?: string;               // Default: 'localhost'
  dbPath?: string;                 // SQLite path. ':memory:' for ephemeral
  fragments: FragmentDefinition[];
  dataSources: DataSourceDefinition[];
})
// Returns: { listen(): void; close(): void }
```

### Server Routes

| Route | Method | Description |
|-------|--------|-------------|
| `/` | GET | Empty workspace shell |
| `/prev/compose` | POST | Accept composition request, return streaming HTML |
| `/prev/frame/:id` | GET | Re-stream an existing frame (session restore) |
| `/prev/frame/:id/glue.js` | GET | Per-frame client glue bundle |
| `/prev/client.js` | GET | Client runtime bundle |
| `/prev/ws` | WS | WebSocket for interactions + partial updates |
| `/prev/api/session?sessionId=` | GET | Session state (debug) |

### Composition Request

```typescript
{
  fragments: Array<{
    fragmentId: string;               // Registered fragment ID
    props?: Record<string, unknown>;  // Initial props
    data?: Record<string, {           // Data source bindings
      source: string;
      params: Record<string, unknown>;
    }>;
    position?: { row, col, rowSpan, colSpan };  // Explicit grid position
    size?: { width, height };
  }>;
  bindings?: Array<{
    id: string;
    sourceFragmentInstanceId: string;
    sourceInteraction: string;
    targetFragmentInstanceId: string;
    targetType: 'prop' | 'dataParam';
    targetKey: string;
    transform?: string;               // Dot-path into interaction payload
  }>;
  layout?: LayoutType;
  intent?: string;                     // Human-readable workspace description
}
```

### Layout Types

| Type | Description | Auto-selected when |
|------|-------------|--------------------|
| `single` | One fragment, full viewport | 1 fragment |
| `split-horizontal` | Side by side, equal width | 2 fragments |
| `split-vertical` | Stacked, equal height | — |
| `grid` | Auto-grid (sqrt(n) columns) | — |
| `primary-detail` | 2/3 + 1/3 split | 3 fragments |
| `dashboard` | 3-column grid | 4+ fragments |

### Frame Mutations

Mutate a live frame without full recomposition:

```typescript
{
  type: 'add' | 'remove' | 'replace' | 'resize' | 'bind' | 'unbind';
  // Fields vary by type — see FrameMutation type
}
```

## Fragment Interactions

Fragments declare interactions and emit them either declaratively (SSR-safe) or programmatically:

```tsx
// Declarative: data attributes (works during SSR + client)
<button
  data-prev-interaction="selectItem"
  data-prev-payload={JSON.stringify({ itemId: '123' })}
>
  Select
</button>

// Programmatic: emit function (client-only, no-op during SSR)
render: ({ emit }) => (
  <button onClick={() => emit('selectItem', { itemId: '123' })}>
    Select
  </button>
)
```

The client runtime uses event delegation on `[data-prev-interaction]` elements — no per-element event listeners.

## Data Flow

```
Composition Request
  → Fragment instances created with assigned IDs
  → Layout solver assigns CSS Grid positions
  → Data binder builds fetch plan (parallel where independent, sequential for deps)
  → Binding resolver validates interaction → prop/data wiring
  → Frame assembled and persisted to SQLite
  → React SSR streams HTML to browser via renderToReadableStream
  → Client runtime connects WebSocket

User Interaction
  → Event delegation captures click on [data-prev-interaction]
  → WebSocket sends interaction event to server
  → Server finds affected bindings
  → Re-fetches data for target fragments
  → Re-renders target fragments via renderToString
  → Sends partial HTML update over WebSocket
  → Client patches target fragment DOM
```

## Session Persistence

Sessions and frames are persisted to SQLite via `bun:sqlite`:

- Server restarts preserve all session state
- Browser refreshes restore the current frame
- Frame history supports back/forward navigation
- Set `dbPath` to a file path for persistence, or `':memory:'` for ephemeral sessions

## Client Runtime

The `@bundt/prev/client` export provides the browser runtime:

- **WebSocket connection** — Auto-connects to `/prev/ws` for real-time updates
- **Event delegation** — Captures interactions on `[data-prev-interaction]` elements
- **DOM patching** — Applies partial HTML updates from server re-renders
- **React hydration** — Hydrates server-rendered HTML for client interactivity
- **CSS Grid layout** — Client-side layout management

## Build Tooling

The `@bundt/prev/build` export provides build-time utilities:

- **Composition bundler** — Generates per-frame client glue bundles that wire up specific fragment instances

## Architecture

```
packages/prev/
  src/
    index.ts                    Public API (defineFragment, defineDataSource, createPrevServer)
    types.ts                    All type definitions (50+ exported types)

    registry/                   Fragment + data source registries
      fragment-registry.ts      Register/lookup/list/filter fragments
      data-source-registry.ts   Register/lookup data sources

    composition/                Composition engine
      engine.ts                 Orchestrator (coordinate layout, data, bindings)
      layout-solver.ts          CSS Grid layout algorithms (6 layout types)
      data-binder.ts            Data fetch planning + parallel execution
      binding-resolver.ts       Inter-fragment wiring validation
      mutation.ts               Runtime frame mutations (add/remove/replace/resize/bind/unbind)

    server/                     HTTP + WebSocket server
      server.ts                 Bun.serve() with all routes
      ssr.tsx                   Streaming React SSR (renderToReadableStream)
      websocket.tsx             Interaction handling + partial re-renders
      session.ts                Session lifecycle management
      database.ts               SQLite schema + query helpers

    client/                     Browser runtime
      runtime.ts                WebSocket + event delegation
      hydration.ts              React hydration
      bindings.ts               Client-side binding evaluation
      layout.ts                 CSS Grid layout manager

    build/                      Build tooling
      composition-bundler.ts    Per-frame glue bundle generation
```

## Roadmap

- **Phase 2:** MCP tool integration — expose fragment/data source registries as MCP tools for AI agent discovery
- **Phase 3:** Agent chat panel — embedded conversational UI for natural language composition
- **Phase 4:** Third-party fragments — load fragments from remote manifests, sandboxed execution

## License

MIT
