---
title: "Prev: Fragments"
description: Fragment-based micro-frontends in Prev — independent, composable UI units.
---

# Fragments

Fragments are the core building block in Prev. Each fragment is an independent, self-contained unit of UI that can be authored, rendered, cached, and updated independently.

## Defining Fragments

A fragment is a function that returns a React element:

```typescript
import { createFragment } from '@bundt/prev';

const Header = createFragment({
  render: () => (
    <header>
      <nav>
        <a href="/">Home</a>
        <a href="/about">About</a>
      </nav>
    </header>
  )
});
```

## Fragment Composition

Fragments are composed into pages on the server:

```typescript
const server = createPrevServer({
  routes: {
    '/': {
      layout: 'default',
      fragments: {
        header: Header,
        main: HomePage,
        footer: Footer
      }
    },
    '/about': {
      layout: 'default',
      fragments: {
        header: Header,
        main: AboutPage,
        footer: Footer
      }
    }
  }
});
```

## Fragment Isolation

Each fragment is rendered in its own React tree. This means:

- **No shared state** — fragments cannot directly access each other's state
- **Independent errors** — a failing fragment doesn't crash the page
- **Parallel rendering** — fragments render concurrently
- **Independent caching** — each fragment has its own cache lifecycle

<Callout variant="tip">
  Fragment isolation is a feature, not a limitation. It enables independent deployment, A/B testing, and granular caching.
</Callout>

## Dynamic Fragments

Fragments can be created dynamically at runtime — this is the "agent-native" part of Prev:

```typescript
const agentFragment = createFragment({
  render: (data) => {
    // The AI agent determines what to render
    return renderAgentResponse(data.agentOutput);
  }
});

// Register dynamically
server.registerFragment('agent-panel', agentFragment);
```

## Fragment Lifecycle

1. **Resolution** — server determines which fragments are needed
2. **Data loading** — fragment loaders run in parallel
3. **Rendering** — React elements are rendered to HTML
4. **Streaming** — HTML is streamed to the client
5. **Hydration** — client-side React hydrates interactive elements
6. **Updates** — WebSocket messages trigger fragment re-renders

## Fragment Slots

Layouts define named slots where fragments are placed:

```html
<!-- Layout template -->
<div class="layout">
  <div data-fragment="header"></div>
  <main data-fragment="main"></main>
  <aside data-fragment="sidebar"></aside>
  <div data-fragment="footer"></div>
</div>
```

The server replaces each `data-fragment` slot with the rendered fragment HTML.
