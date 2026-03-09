---
title: "Prev: Overview"
description: "@bundt/prev is an agent-native dynamic UI framework with streaming React SSR and fragment-based micro-frontends."
---

# Prev

**@bundt/prev** is an agent-native dynamic UI framework. It provides server-composed, streaming React SSR with fragment-based micro-frontends and real-time WebSocket interactions.

## Why Prev?

Traditional UI frameworks assume a human developer is writing and deploying all the code. Prev is built for a world where AI agents compose and serve UI dynamically:

- **Fragment-based architecture** — UI is composed from independent fragments that can be authored, updated, and served individually
- **Streaming SSR** — React components are rendered on the server and streamed to the client as they resolve
- **WebSocket-first** — real-time interactions without full page reloads
- **Agent-friendly** — APIs designed for programmatic composition, not just human authoring

## Quick Start

```bash
bun add @bundt/prev
```

```typescript
import { createPrevServer } from '@bundt/prev';

const server = createPrevServer({
  fragments: {
    header: () => <Header />,
    main: () => <MainContent />,
    sidebar: () => <Sidebar />
  }
});

server.listen(3000);
```

## Core Concepts

<CardGrid>
  <Card title="Architecture" href="/prev/architecture">
    How Prev composes fragments into pages and manages the rendering pipeline.
  </Card>
  <Card title="Fragments" href="/prev/fragments">
    Independent UI units that can be authored, cached, and updated individually.
  </Card>
  <Card title="Streaming SSR" href="/prev/streaming">
    React server rendering with progressive streaming and Suspense support.
  </Card>
  <Card title="WebSocket Interactions" href="/prev/websockets">
    Real-time UI updates without page reloads.
  </Card>
</CardGrid>

## Architecture at a Glance

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Fragment A  │     │  Fragment B   │     │  Fragment C   │
│   (React)     │     │  (React)      │     │  (React)      │
└──────┬───────┘     └──────┬───────┘     └──────┬───────┘
       │                     │                     │
       └─────────┬──────────┘─────────────────────┘
                 │
         ┌───────▼────────┐
         │  Prev Server   │
         │  (Bun.serve)   │
         └───────┬────────┘
                 │
         ┌───────▼────────┐
         │  Streaming SSR │
         │  (ReadableStream) │
         └───────┬────────┘
                 │
         ┌───────▼────────┐
         │    Client       │
         │  (hydration +   │
         │   WebSocket)    │
         └────────────────┘
```
