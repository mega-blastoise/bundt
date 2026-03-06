# Composing Workspaces

A **composition** is a structured request that tells the server which fragments to show, how to lay them out, what data to fetch, and how to wire interactions between fragments. The server composes a **Frame** and streams it as HTML.

## Composition Request

Send a POST to `/prev/compose`:

```sh
curl -X POST http://localhost:3000/prev/compose \
  -H "Content-Type: application/json" \
  -d '{
    "intent": "Show customer dashboard",
    "layout": "primary-detail",
    "fragments": [
      {
        "fragmentId": "customer-list",
        "props": { "title": "Customers" },
        "data": {
          "customers": { "source": "customers-api", "params": { "limit": 20 } }
        }
      },
      {
        "fragmentId": "customer-detail",
        "data": {
          "detail": { "source": "customer-detail-api", "params": { "customerId": "1" } }
        }
      }
    ]
  }'
```

## Request Schema

```typescript
interface StructuredComposition {
  // Human-readable description (stored with the frame)
  intent?: string;

  // Layout algorithm. Auto-selected if omitted.
  layout?: 'single' | 'split-horizontal' | 'split-vertical'
         | 'grid' | 'primary-detail' | 'dashboard';

  // Fragments to compose
  fragments: Array<{
    fragmentId: string;                // Registered fragment ID
    props?: Record<string, unknown>;   // Initial prop values
    data?: Record<string, {            // Data source bindings
      source: string;                  //   Data source ID
      params: Record<string, unknown>; //   Fetch parameters
    }>;
    position?: { row, col, rowSpan, colSpan };  // Explicit grid position
    size?: { width, height, ... };               // Explicit size
  }>;

  // Inter-fragment bindings
  bindings?: Array<DataBinding>;
}
```

## Response

The response is a streaming HTML document with:

- CSS Grid layout matching the composition
- Each fragment wrapped in a `<Suspense>` boundary
- Server-rendered fragment content with resolved data
- Script tags for the client runtime and per-frame glue bundle

Response headers include:
- `x-prev-session-id` — session ID for subsequent requests
- `x-prev-frame-id` — unique frame ID

## Layout Auto-Selection

If you omit the `layout` field, prev auto-selects based on fragment count:

| Fragment Count | Auto Layout |
|---------------|-------------|
| 1 | `single` |
| 2 | `split-horizontal` |
| 3 | `primary-detail` |
| 4+ | `dashboard` |

You can override this by specifying `layout` explicitly.

## Session Continuity

Pass a session ID to maintain state across compositions:

```sh
curl -X POST "http://localhost:3000/prev/compose?sessionId=abc-123" \
  -H "Content-Type: application/json" \
  -d '{ ... }'
```

Each composition creates a new frame in the session's history. The server persists the frame to SQLite and updates the session's current frame.

## Frame Restoration

To re-render an existing frame (e.g., after a page refresh):

```sh
curl http://localhost:3000/prev/frame/FRAME_ID
```

This streams the same HTML without re-fetching data or re-composing.

## Multiple Compositions

A session maintains a history of frames. Each new composition pushes a frame to the history stack. The session API exposes the history for debugging:

```sh
curl "http://localhost:3000/prev/api/session?sessionId=abc-123"
```
