---
title: "Prev: Streaming SSR"
description: How Prev uses React's streaming server rendering for progressive page delivery.
---

# Streaming SSR

Prev leverages React 19's streaming server rendering APIs to deliver pages progressively. Content appears as it becomes available, rather than waiting for the entire page to render.

## How It Works

Prev uses `renderToReadableStream` from `react-dom/server`:

```typescript
import { renderToReadableStream } from 'react-dom/server';

const stream = await renderToReadableStream(
  <PageShell>
    <Suspense fallback={<Skeleton />}>
      <SlowComponent />
    </Suspense>
  </PageShell>
);
```

The server sends the HTML shell immediately, then streams in content as Suspense boundaries resolve.

## Progressive Rendering

Fragments that depend on async data are wrapped in Suspense boundaries:

```
Time ─────────────────────────────────────────>

[HTML Shell + Header]  ← Sent immediately
  [Navigation]         ← Resolves fast
    [Main Content]     ← Streams in as data loads
      [Sidebar]        ← Arrives independently
        [Footer]       ← Sent last
```

The client sees a progressively-building page rather than a blank screen followed by a flash of content.

## Suspense Integration

Prev automatically wraps each fragment in a Suspense boundary:

```typescript
// Internal: how Prev composes the stream
function composePage(fragments: Record<string, Fragment>) {
  return (
    <html>
      <body>
        {Object.entries(fragments).map(([name, Fragment]) => (
          <Suspense key={name} fallback={<FragmentSkeleton name={name} />}>
            <div data-fragment={name}>
              <Fragment />
            </div>
          </Suspense>
        ))}
      </body>
    </html>
  );
}
```

## Client Hydration

After the stream completes, the client hydrates interactive fragments:

```typescript
import { hydrateRoot } from 'react-dom/client';

// Prev's client runtime selectively hydrates fragments
// that have interactive elements
document.querySelectorAll('[data-fragment][data-hydrate]')
  .forEach(async (el) => {
    const name = el.getAttribute('data-fragment');
    const Component = await loadFragmentClient(name);
    hydrateRoot(el, <Component />);
  });
```

<Callout variant="info">
  Not every fragment needs hydration. Static fragments (headers, footers, content blocks) are delivered as pure HTML with no client-side JavaScript.
</Callout>

## Error Boundaries

Each fragment stream has its own error boundary. If a fragment fails to render:

1. The error boundary catches the error
2. A fallback UI is streamed in place of the fragment
3. Other fragments continue rendering normally
4. The error is logged server-side

```typescript
const ResilientFragment = createFragment({
  render: () => <RiskyComponent />,
  errorFallback: (error) => (
    <div class="fragment-error">
      Something went wrong loading this section.
    </div>
  )
});
```
