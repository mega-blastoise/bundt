# createPrevServer

Creates a prev server instance that manages fragment composition, SSR, and WebSocket interactions.

## Signature

```tsx
function createPrevServer(config: PrevServerConfig): PrevServer
```

## Parameters

### `config: PrevServerConfig`

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `port` | `number` | `3000` | HTTP server port |
| `hostname` | `string` | `'localhost'` | HTTP server hostname |
| `dbPath` | `string` | `':memory:'` | SQLite database path |
| `fragments` | `FragmentDefinition[]` | — | Fragments to register (required) |
| `dataSources` | `DataSourceDefinition[]` | — | Data sources to register (required) |

## Returns

### `PrevServer`

```typescript
{
  listen(): void;   // Start the HTTP server
  close(): void;    // Stop the server and close the database
}
```

## Behavior

When `listen()` is called:

1. The client runtime bundle is built via `Bun.build()` (one-time, at startup)
2. The SQLite database is initialized with the schema
3. Fragment and data source registries are populated
4. `Bun.serve()` starts with HTTP routes and WebSocket support

When `close()` is called:

1. The HTTP server is stopped
2. The SQLite database connection is closed

## Example

```tsx
import { createPrevServer, defineFragment, defineDataSource } from '@bundt/prev';
import { z } from 'zod';

const hello = defineFragment({
  id: 'hello',
  name: 'Hello',
  props: z.object({ name: z.string() }),
  data: {},
  interactions: {},
  render: ({ props }) => <h1>Hello, {props.name}!</h1>
});

const server = createPrevServer({
  port: 8080,
  hostname: '0.0.0.0',
  dbPath: './app.db',
  fragments: [hello],
  dataSources: []
});

server.listen();
// prev server listening on http://0.0.0.0:8080

// Graceful shutdown
process.on('SIGINT', () => {
  server.close();
  process.exit(0);
});
```

## Database Persistence

- `':memory:'` (default) — data is lost on server restart
- `'./path/to/db.sqlite'` — data persists across restarts
- WAL mode is enabled automatically for concurrent read performance
- The database schema is created automatically on first run
