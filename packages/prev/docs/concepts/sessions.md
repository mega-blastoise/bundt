# Sessions & Persistence

prev maintains server-side sessions backed by SQLite. Sessions track the current workspace, frame history, and fragment state.

## Session Lifecycle

1. **Creation** — A new session is created automatically on the first composition request (or when no `sessionId` query parameter is provided)
2. **Usage** — Each composition pushes a new frame to the session's history
3. **Restore** — Passing a `sessionId` on subsequent requests restores the session
4. **Touch** — Every interaction or request updates `lastActiveAt`

## Session ID

The session ID is returned in the `x-prev-session-id` response header:

```sh
curl -i -X POST http://localhost:3000/prev/compose \
  -H "Content-Type: application/json" \
  -d '{ "fragments": [...] }'

# Response headers:
# x-prev-session-id: a1b2c3d4-e5f6-...
# x-prev-frame-id: f7g8h9i0-j1k2-...
```

Pass it on subsequent requests:

```sh
curl -X POST "http://localhost:3000/prev/compose?sessionId=a1b2c3d4-e5f6-..." \
  -H "Content-Type: application/json" \
  -d '{ "fragments": [...] }'
```

## Frame History

Each session maintains an ordered history of frames. The `historyIndex` points to the current frame:

```
Frame History: [frame-1, frame-2, frame-3]
                                    ^
                              historyIndex = 2
```

When a new composition is created while not at the end of history, frames after the current index are discarded (like browser navigation).

## SQLite Schema

Sessions and frames are stored in five tables:

| Table | Purpose |
|-------|---------|
| `sessions` | Session metadata, current frame, history |
| `frames` | Frame definitions (layout, fragments, bindings) |
| `frame_history` | Ordered list of frames per session |
| `fragment_state` | Per-fragment state within a frame |
| `data_cache` | Cached data source results with TTL |

## Database Configuration

```tsx
const server = createPrevServer({
  dbPath: './my-app.db',   // File-based persistence
  // dbPath: ':memory:',   // In-memory (default, lost on restart)
  ...
});
```

The database is created automatically with WAL mode enabled for concurrent reads.

## Debugging Sessions

Query the session API endpoint:

```sh
curl "http://localhost:3000/prev/api/session?sessionId=YOUR_SESSION_ID"
```

Returns:

```json
{
  "id": "a1b2c3d4-...",
  "agentId": null,
  "currentFrameId": "f7g8h9i0-...",
  "frameHistory": ["frame-1", "frame-2"],
  "historyIndex": 1,
  "metadata": {},
  "createdAt": 1709654400000,
  "lastActiveAt": 1709654500000
}
```
