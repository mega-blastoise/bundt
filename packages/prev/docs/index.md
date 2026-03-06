# @bundt/prev

**Agent-native dynamic UI framework.** Server-composed, streaming React SSR with fragment-based micro-frontends.

## What is prev?

`prev` is a React SSR framework where the **server composes the UI** from registered building blocks called **Fragments**. Instead of static page routes, an AI agent (or any orchestrator) sends a structured composition request describing which fragments to show, how to lay them out, and how to wire data between them.

The server assembles a **Frame**, streams it to the browser via React 19 `renderToReadableStream`, and handles ongoing interactions via WebSocket.

The name is a direct response to "next.js", which was built for the last generation of the web — `prev` is built for the AI-native web, where the UI itself _is_ a response.

## Why prev?

Static UI composition is a Web 2/3 artifact. In agent-driven workflows, users pivot between tasks fluidly — the UI must pivot with them. Instead of navigating between pre-built pages, the agent composes purpose-built workspaces from a pool of registered components and data sources.

### Key Properties

- **Server-composed** — UI layout, data binding, and interaction wiring happen on the server
- **Streaming SSR** — React 19 `renderToReadableStream` with per-fragment `Suspense` boundaries
- **Fragment-based** — Self-contained UI components with typed props, data, and interactions
- **Reactive bindings** — Clicking a row in Fragment A can update Fragment B's data via WebSocket
- **Session persistence** — SQLite-backed sessions with frame history and navigation
- **Zero client JS overhead** — Interactions use data attributes + event delegation, not bundled React on the client

## Quick Example

```tsx
import { createPrevServer, defineFragment, defineDataSource } from '@bundt/prev';
import { z } from 'zod';

const userList = defineFragment({
  id: 'user-list',
  name: 'User List',
  props: z.object({}),
  data: { users: { source: 'users' } },
  interactions: {
    selectUser: { payload: z.object({ userId: z.string() }) }
  },
  render: ({ data }) => (
    <ul>
      {(data.users as any[]).map(u => (
        <li key={u.id} data-prev-interaction="selectUser"
            data-prev-payload={JSON.stringify({ userId: u.id })}>
          {u.name}
        </li>
      ))}
    </ul>
  )
});

const server = createPrevServer({
  port: 3000,
  fragments: [userList],
  dataSources: [/* ... */]
});

server.listen();
```

## Current Status

**Phase 1 (Foundation)** is complete. The framework supports:

- Fragment and data source registration
- Structured composition requests
- 6 automatic layout algorithms
- Streaming SSR with per-fragment Suspense
- WebSocket-based interactions with partial re-renders
- SQLite session persistence with frame history

Phases 2-4 will add MCP tool integration, an embedded agent chat panel, and third-party fragment loading.
