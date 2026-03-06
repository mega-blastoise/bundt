# Getting Started

## Installation

```sh
bun add @bundt/prev react react-dom zod
```

`react`, `react-dom`, and `zod` are peer dependencies — you bring your own versions.

## Minimal Server

A prev server needs at least one fragment and starts with `createPrevServer`:

```tsx
// server.ts
import { createPrevServer, defineFragment } from '@bundt/prev';
import { z } from 'zod';

const hello = defineFragment({
  id: 'hello',
  name: 'Hello World',
  props: z.object({ name: z.string().optional() }),
  data: {},
  interactions: {},
  render: ({ props }) => (
    <div style={{ padding: '24px', fontFamily: 'system-ui' }}>
      <h1>Hello, {props.name ?? 'World'}!</h1>
    </div>
  )
});

const server = createPrevServer({
  port: 3000,
  fragments: [hello],
  dataSources: []
});

server.listen();
```

Run it:

```sh
bun run server.ts
```

Open `http://localhost:3000` — you'll see the empty workspace shell.

## Composing Your First Frame

Send a composition request to create a workspace:

```sh
curl -X POST http://localhost:3000/prev/compose \
  -H "Content-Type: application/json" \
  -d '{
    "fragments": [
      { "fragmentId": "hello", "props": { "name": "prev" } }
    ]
  }'
```

The response is a streaming HTML document with your fragment rendered inside a CSS Grid workspace.

## Adding Data

Define a data source and wire it to a fragment:

```tsx
const greetingsSource = defineDataSource({
  id: 'greetings',
  name: 'Greetings',
  params: z.object({ locale: z.string().optional() }),
  returns: z.array(z.string()),
  fetch: async (params) => {
    if (params.locale === 'es') return ['Hola', 'Buenos dias'];
    return ['Hello', 'Good morning', 'Hey there'];
  }
});

const greetingList = defineFragment({
  id: 'greeting-list',
  name: 'Greeting List',
  props: z.object({}),
  data: { greetings: { source: 'greetings' } },
  interactions: {},
  render: ({ data }) => (
    <ul>
      {(data.greetings as string[]).map((g, i) => (
        <li key={i}>{g}</li>
      ))}
    </ul>
  )
});
```

Compose with data:

```json
{
  "fragments": [
    {
      "fragmentId": "greeting-list",
      "data": {
        "greetings": { "source": "greetings", "params": { "locale": "es" } }
      }
    }
  ]
}
```

## Session Persistence

By default, the server uses in-memory SQLite. For persistence across restarts, set `dbPath`:

```tsx
const server = createPrevServer({
  port: 3000,
  dbPath: './my-app.db',
  fragments: [hello],
  dataSources: []
});
```

The session ID is returned in the `x-prev-session-id` response header. Pass it on subsequent requests to maintain state:

```sh
curl -X POST "http://localhost:3000/prev/compose?sessionId=YOUR_SESSION_ID" \
  -H "Content-Type: application/json" \
  -d '{ ... }'
```

## Next Steps

- [Defining Fragments](/guide/fragments) — props, data, interactions, and layout hints
- [Data Sources](/guide/data-sources) — typed server-side data fetchers
- [Composing Workspaces](/guide/composition) — layout types and structured requests
- [Interactions & Bindings](/guide/interactions) — wiring fragments together
