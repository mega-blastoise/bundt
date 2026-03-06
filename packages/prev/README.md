# @bundt/prev

Agent-native dynamic UI framework. Server-composed, streaming React SSR with fragment-based micro-frontends.

## What is prev?

`prev` is a React SSR framework where the **server composes the UI** from registered building blocks called **Fragments**. Instead of static page routes, an AI agent (or any orchestrator) sends a structured composition request describing which fragments to show, how to lay them out, and how to wire data between them. The server assembles a **Frame**, streams it to the browser, and handles ongoing interactions via WebSocket.

The name is a direct response to "Next" — `prev` is built for the AI-native web, where the UI itself is a response.

### Core Concepts

| Concept | Description |
|---------|-------------|
| **Fragment** | A self-contained UI component with typed props, data requirements, and interaction declarations |
| **Data Source** | A server-side data fetcher with typed params and returns, optionally cacheable |
| **Frame** | A composed workspace — a set of fragment instances with layout, data bindings, and interaction wiring |
| **Session** | Persistent state across compositions — tracks frame history with back/forward navigation |
| **Binding** | A wire connecting one fragment's interaction output to another fragment's prop or data param |

## Installation

```sh
bun add @bundt/prev react react-dom zod
```

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
    // Replace with your actual data fetching
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
  data: {
    users: { source: 'users' }
  },
  interactions: {
    selectUser: { payload: z.object({ userId: z.string() }) }
  },
  render: ({ props, data }) => (
    <div style={{ padding: '16px' }}>
      <h2>{props.title ?? 'Users'}</h2>
      <ul>
        {Array.isArray(data.users) && data.users.map((user: any) => (
          <li
            key={user.id}
            data-prev-interaction="selectUser"
            data-prev-payload={JSON.stringify({ userId: user.id })}
            style={{ cursor: 'pointer', padding: '8px 0' }}
          >
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
    <div style={{ padding: '16px' }}>
      <h2>User Detail</h2>
      {props.selectedUserId
        ? <p>Selected user: {props.selectedUserId}</p>
        : <p style={{ opacity: 0.5 }}>Select a user from the list</p>
      }
    </div>
  )
});

// 3. Create and start the server
const server = createPrevServer({
  port: 3000,
  fragments: [userList, userDetail],
  dataSources: [usersSource],
  dbPath: './prev.db'  // or ':memory:' for ephemeral sessions
});

server.listen();
```

Then compose a UI by sending a POST request:

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
      {
        "fragmentId": "user-detail"
      }
    ],
    "bindings": [
      {
        "id": "list-to-detail",
        "sourceFragmentInstanceId": "<from response>",
        "sourceInteraction": "selectUser",
        "targetFragmentInstanceId": "<from response>",
        "targetType": "prop",
        "targetKey": "selectedUserId",
        "transform": "userId"
      }
    ],
    "layout": "split-horizontal"
  }'
```

The response is a streaming HTML document with the composed workspace.

## API Reference

### `defineFragment(definition)`

Creates a typed fragment definition.

```tsx
defineFragment({
  id: string;              // Unique identifier
  name: string;            // Human-readable name
  description?: string;    // What this fragment does
  tags?: string[];         // For filtering/discovery
  props: ZodType;          // Zod schema for component props
  data: Record<string, {   // Data field declarations
    source: string;        //   Data source ID
    params?: ZodType;      //   Optional params schema
  }>;
  interactions: Record<string, {  // Interaction declarations
    payload: ZodType;             //   Payload schema
  }>;
  layoutHints?: {
    minWidth?: string;
    minHeight?: string;
    resizable?: boolean;
    preferredAspectRatio?: number;
  };
  render: (ctx: {
    props: TProps;
    data: Record<string, unknown>;
    emit: (interaction: string, payload: unknown) => void;
  }) => ReactNode;
})
```

### `defineDataSource(definition)`

Creates a typed data source definition.

```tsx
defineDataSource({
  id: string;                    // Unique identifier
  name: string;                  // Human-readable name
  description?: string;
  tags?: string[];
  params: ZodType;               // Zod schema for input params
  returns: ZodType;              // Zod schema for return type
  ttl?: number;                  // Cache TTL in milliseconds
  fetch: (params: TParams) => Promise<TReturns>;
})
```

### `createPrevServer(config)`

Creates and returns a server instance.

```tsx
createPrevServer({
  port?: number;           // Default: 3000
  hostname?: string;       // Default: 'localhost'
  dbPath?: string;         // SQLite path. Default: ':memory:'
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
| `/prev/api/session?sessionId=` | GET | Debug: session state |

### Structured Composition Request

```typescript
{
  fragments: Array<{
    fragmentId: string;               // Registered fragment ID
    props?: Record<string, unknown>;  // Initial props
    data?: Record<string, {           // Data source bindings
      source: string;                 //   Data source ID
      params: Record<string, unknown>; //  Fetch params
    }>;
    position?: { row, col, rowSpan, colSpan };  // Explicit grid position
    size?: { width, height, ... };
  }>;
  bindings?: Array<{
    id: string;
    sourceFragmentInstanceId: string;
    sourceInteraction: string;
    targetFragmentInstanceId: string;
    targetType: 'prop' | 'dataParam';
    targetKey: string;
    transform?: string;  // Dot-path into interaction payload
  }>;
  layout?: 'single' | 'split-horizontal' | 'split-vertical' | 'grid' | 'primary-detail' | 'dashboard';
  intent?: string;  // Human-readable description of what this workspace is for
}
```

### Layout Types

| Type | Description | Auto-selected when |
|------|-------------|--------------------|
| `single` | One fragment, full viewport | 1 fragment |
| `split-horizontal` | Side by side, equal width | 2 fragments |
| `split-vertical` | Stacked, equal height | — |
| `grid` | Auto-grid (√n columns) | — |
| `primary-detail` | 2/3 + 1/3 split | 3 fragments |
| `dashboard` | 3-column grid | 4+ fragments |

## Fragment Interactions

Fragments declare interactions and emit them either programmatically (via the `emit` function) or declaratively via data attributes:

```tsx
// Declarative: add data attributes to clickable elements
<button
  data-prev-interaction="selectItem"
  data-prev-payload={JSON.stringify({ itemId: '123' })}
>
  Select
</button>

// Programmatic: use the emit function in render context
render: ({ emit }) => (
  <button onClick={() => emit('selectItem', { itemId: '123' })}>
    Select
  </button>
)
```

> **Note:** During SSR, `emit` is a no-op. The declarative `data-prev-*` approach works for both SSR and client-side interactions via event delegation.

## Data Flow

```
Composition Request
  → Fragment instances created with assigned IDs
  → Layout solver assigns grid positions
  → Data binder builds fetch plan
  → Independent fetches run in parallel
  → Dependent fetches run after dependencies resolve
  → Binding resolver validates interaction → prop/data wiring
  → Frame assembled and persisted to SQLite
  → React SSR streams the workspace to the browser
  → Client glue bundle connects WebSocket

User clicks interaction
  → Event delegation captures click on [data-prev-interaction]
  → WebSocket sends interaction event to server
  → Server finds affected bindings
  → Re-fetches data for target fragments
  → Re-renders target fragments via renderToString
  → Sends partial HTML update over WebSocket
  → Client patches target fragment DOM
```

## Session Persistence

Sessions and frames are persisted to SQLite (via `bun:sqlite`). This means:

- Restarting the server preserves session state
- Refreshing the browser restores the current frame
- Frame history supports back/forward navigation

Set `dbPath` to a file path for persistence, or `':memory:'` for ephemeral sessions.

## Architecture

```
packages/prev/
  src/
    index.ts                    # Public API
    types.ts                    # All type definitions

    registry/                   # Fragment + data source registries
      fragment-registry.ts
      data-source-registry.ts

    composition/                # Composition engine
      engine.ts                 #   Orchestrator
      layout-solver.ts          #   CSS Grid layout algorithms
      data-binder.ts            #   Data fetch planning + execution
      binding-resolver.ts       #   Inter-fragment wiring validation

    server/                     # HTTP + WebSocket server
      server.ts                 #   Bun.serve() with all routes
      ssr.tsx                   #   Streaming React SSR
      websocket.tsx             #   Interaction handling + partial re-renders
      session.ts                #   Session lifecycle management
      database.ts               #   SQLite schema + query helpers

    client/                     # Browser runtime
      runtime.ts                #   WebSocket + event delegation
      hydration.ts              #   React hydration
      bindings.ts               #   Client-side binding evaluation
      layout.ts                 #   CSS Grid layout manager

    build/                      # Build tooling
      composition-bundler.ts    #   Per-frame glue bundle generation
```

## Roadmap

This is **Phase 1 (Foundation)**. Future phases include:

- **Phase 2:** MCP tool integration — expose fragment/data source registries as MCP tools for AI agent discovery
- **Phase 3:** Agent chat panel — embedded conversational UI for natural language composition
- **Phase 4:** Third-party fragments — load fragments from remote manifests, sandboxed execution

## License

MIT
