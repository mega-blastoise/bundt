# Server Routes

The prev server exposes HTTP routes for composition, frame rendering, and session management.

## Routes

### `GET /`

Returns the empty workspace shell HTML. This is a static page with minimal CSS that displays "Waiting for composition..." until a frame is composed.

### `POST /prev/compose`

Accepts a structured composition request and returns a streaming HTML response.

**Query Parameters:**
- `sessionId` (optional) — existing session to continue

**Request Body:** `StructuredComposition` (JSON)

```json
{
  "intent": "Show user management workspace",
  "layout": "split-horizontal",
  "fragments": [
    {
      "fragmentId": "user-list",
      "props": { "title": "Users" },
      "data": {
        "users": { "source": "users-api", "params": { "limit": 20 } }
      }
    }
  ],
  "bindings": []
}
```

**Response:**
- `200` — Streaming HTML (`text/html`)
- `400` — Invalid JSON or composition error

**Response Headers:**
- `x-prev-session-id` — session ID
- `x-prev-frame-id` — frame ID

### `GET /prev/frame/:frameId`

Re-streams an existing frame. Used for session restore after page refresh.

**Response:**
- `200` — Streaming HTML
- `404` — Frame not found

### `GET /prev/frame/:frameId/glue.js`

Serves the per-frame client glue bundle. This JavaScript initializes the WebSocket connection and event delegation for the specific frame.

**Response:**
- `200` — JavaScript (`application/javascript`)
- `404` — Frame not found

### `GET /prev/client.js`

Serves the pre-built client runtime bundle. Built once at server startup via `Bun.build()`.

**Response:**
- `200` — JavaScript (`application/javascript`)

### `GET /prev/ws` (WebSocket Upgrade)

WebSocket endpoint for bidirectional communication.

**Client → Server Messages:**

```json
{ "type": "interaction", "frameId": "...", "fragmentInstanceId": "...", "interaction": "selectRow", "payload": { "rowId": "5" } }
```

```json
{ "type": "ping" }
```

**Server → Client Messages:**

```json
{ "type": "fragment-update", "fragmentInstanceId": "...", "html": "<div>...</div>", "data": { ... } }
```

```json
{ "type": "error", "message": "Frame not found" }
```

```json
{ "type": "pong" }
```

### `GET /prev/api/session`

Returns session state for debugging.

**Query Parameters:**
- `sessionId` (required)

**Response:**
- `200` — Session JSON
- `400` — Missing sessionId
- `404` — Session not found

```json
{
  "id": "abc-123",
  "agentId": null,
  "currentFrameId": "frame-456",
  "frameHistory": ["frame-123", "frame-456"],
  "historyIndex": 1,
  "metadata": {},
  "createdAt": 1709654400000,
  "lastActiveAt": 1709654500000
}
```
