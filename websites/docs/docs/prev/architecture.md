---
title: "Prev: Architecture"
description: Understanding Prev's server-composed fragment architecture and rendering pipeline.
---

# Architecture

Prev uses a server-composed architecture where the server owns the rendering pipeline and clients receive pre-rendered HTML with optional hydration.

## Server Composition

Unlike traditional SPAs where the client assembles the page, Prev assembles pages on the server:

1. **Request arrives** — the server receives an HTTP request or WebSocket message
2. **Fragment resolution** — the server determines which fragments to render based on the route and context
3. **Parallel rendering** — independent fragments are rendered concurrently
4. **Stream assembly** — rendered fragments are assembled into a single HTML stream
5. **Delivery** — the stream is sent to the client progressively

## The Rendering Pipeline

```typescript
// Each fragment is a function that returns a React element
type Fragment = (context: FragmentContext) => React.ReactElement;

// The server composes fragments into a page layout
type PageComposition = {
  layout: string;         // Layout template name
  fragments: Record<string, Fragment>;
  metadata: PageMetadata;
};
```

### Fragment Context

Every fragment receives a context object:

```typescript
type FragmentContext = {
  params: Record<string, string>;  // URL parameters
  query: Record<string, string>;   // Query string
  headers: Headers;                 // Request headers
  data: unknown;                    // Pre-fetched data
};
```

## Data Flow

Prev supports two data loading patterns:

### Co-located Data Loading

Fragments can declare their data requirements:

```typescript
const UserProfile = createFragment({
  loader: async (ctx) => {
    return await fetchUser(ctx.params.id);
  },
  render: (data) => <ProfileCard user={data} />
});
```

### Shared Data

When multiple fragments need the same data, use a shared data layer to avoid duplicate fetches:

```typescript
const server = createPrevServer({
  data: {
    currentUser: async (ctx) => fetchUser(ctx.headers.get('authorization'))
  },
  fragments: {
    header: (ctx) => <Header user={ctx.data.currentUser} />,
    sidebar: (ctx) => <Sidebar user={ctx.data.currentUser} />
  }
});
```

## Caching

Fragments can be cached independently:

```typescript
const StaticHeader = createFragment({
  cache: { ttl: 3600, scope: 'global' },
  render: () => <Header />
});

const UserDashboard = createFragment({
  cache: { ttl: 60, scope: 'user' },
  loader: async (ctx) => fetchDashboard(ctx.params.userId),
  render: (data) => <Dashboard data={data} />
});
```

Cache scopes:
- `global` — shared across all users
- `user` — per-user cache
- `none` — never cached (default)
