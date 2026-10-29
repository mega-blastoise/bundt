---
title: "Prev: WebSocket Interactions"
description: Real-time UI updates in Prev through WebSocket-based fragment re-rendering.
---

# WebSocket Interactions

Prev uses WebSockets for real-time communication between the server and client. This enables live UI updates without full page reloads.

## How It Works

When a client connects, Prev establishes a WebSocket connection:

```
Client                     Server
  │                          │
  │── WebSocket Connect ────>│
  │<── Connection ACK ───────│
  │                          │
  │── Subscribe fragment ───>│
  │<── Fragment HTML ────────│
  │                          │
  │<── Push update ──────────│  (server-initiated)
  │                          │
```

## Server Push

The server can push fragment updates at any time:

```typescript
const server = createPrevServer({
  fragments: { ... }
});

// Push an update to all connected clients
server.pushFragment('notifications', <NotificationBadge count={5} />);

// Push to a specific client
server.pushFragment('dashboard', <Dashboard data={newData} />, {
  clientId: 'user-123'
});
```

## Client Subscriptions

Clients can subscribe to fragment updates:

```typescript
// Prev's client runtime handles this automatically
// Fragments with data-subscribe="true" are auto-subscribed

// Manual subscription via the client API:
prev.subscribe('live-feed', (html) => {
  document.querySelector('[data-fragment="live-feed"]').innerHTML = html;
});
```

## Use Cases

### Live Dashboards

Push real-time metrics to dashboard fragments:

```typescript
setInterval(async () => {
  const metrics = await fetchMetrics();
  server.pushFragment('metrics-panel', <MetricsPanel data={metrics} />);
}, 5000);
```

### AI Agent Responses

Stream AI-generated UI as the agent produces it:

```typescript
server.on('agent-response', (agentId, output) => {
  const fragment = renderAgentOutput(output);
  server.pushFragment(`agent-${agentId}`, fragment);
});
```

### Collaborative Editing

Broadcast changes to all connected clients:

```typescript
server.on('document-change', (docId, patch) => {
  server.pushFragment(`editor-${docId}`, <Editor doc={applyPatch(patch)} />, {
    broadcast: true,
    exclude: patch.author  // Don't send back to the author
  });
});
```

## Connection Management

Prev handles connection lifecycle automatically:

- **Reconnection** — clients automatically reconnect on disconnect
- **Heartbeat** — periodic pings keep the connection alive
- **Backpressure** — message queuing when the client is slow

<Callout variant="warning">
  WebSocket support requires Bun's built-in WebSocket server (`Bun.serve` with `websocket` handler). Node.js environments need a WebSocket library adapter.
</Callout>
