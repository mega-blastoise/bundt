# Waavy

Render React pages from any server — Rust, Python, Go, Ruby, Java, PHP —
without running JavaScript in that server.

Waavy isn't a framework. Your backend owns routing, data, auth, and caching;
waavy turns **a registered page + JSON props** into **HTML plus the matching
hydration assets**, and gets out of the way.

> Status: `0.3.0-dev` (Phase 1 of the rewrite). One-shot rendering and
> releases work today. The warm `waavy serve` renderer, the Rust client, and
> published per-platform binaries are coming in Phases 2–3. Design:
> [`.claude/specs/waavy/ARCHITECTURE.md`](../../.claude/specs/waavy/ARCHITECTURE.md).

## How it works

```
waavy.config.ts ──waavy build──▶ dist/waavy/        (a "release")
                                   manifest.json
                                   server/entry.js  (pages + React, self-contained)
                                   client/…         (hydration JS + CSS, served by your host)

your server ──request {page, props}──▶ waavy render ──▶ HTML document
browser ──GET /assets/…──▶ your server (static files from dist/waavy/client)
```

1. **Register pages** in `waavy.config.ts`. A page is a module whose default
   export is a React component.
2. **Build a release** with `waavy build`. The release is the deployment
   artifact: ship it next to your server.
3. **Render** by asking waavy for a page ID with JSON props. You get a full
   HTML document whose `#waavy-root` hydrates in the browser with the same
   props.

## Quickstart

```ts
// waavy.config.ts
import { defineConfig } from '@bundt/waavy';

export default defineConfig({
  pages: {
    product: './pages/product.tsx'
  },
  publicPath: '/assets/', // where your server serves dist/waavy/client/
  outDir: './dist/waavy'
});
```

```tsx
// pages/product.tsx — browser-safe: no server-only imports, no data loading
import { useState } from 'react';

export default function Product({ name, price }: { name: string; price: number }) {
  const [quantity, setQuantity] = useState(1);
  return (
    <main>
      <h1>{name}</h1>
      <button onClick={() => setQuantity(quantity + 1)}>
        {quantity} × ${price}
      </button>
    </main>
  );
}
```

```sh
waavy build
waavy render --release dist/waavy --page product --props '{"name":"Lamp","price":40}' --title "Lamp"
```

Serve `dist/waavy/client/` at `publicPath` (`/assets/` above) as static files.

## Configuration

| Key | Default | Meaning |
|---|---|---|
| `pages` | — (required) | Page ID → module path, relative to the config file. IDs are lowercase `[a-z0-9_-]` segments separated by `/`. |
| `publicPath` | `/assets/` | URL prefix for client assets. An absolute path or an `https://` CDN URL, ending in `/`. |
| `outDir` | `./dist/waavy` | Release directory. |
| `render.timeoutMs` | `10000` | Default render deadline (recorded in the release). |

Pages may import CSS; it is bundled per page and linked from the document.

## The document

Waavy owns the document shell and renders your component only inside
`#waavy-root`:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8"><title>…</title>
    <!-- your trusted `head` HTML, page CSS, modulepreload links -->
  </head>
  <body>
    <div id="waavy-root"><!-- your component --></div>
    <script type="application/json" id="waavy-data">{"v":1,"page":"…","buildId":"…","props":{…}}</script>
    <script type="module" src="/assets/product-1a2b.js"></script>
  </body>
</html>
```

Props travel as escaped JSON (never executable script), so hostile strings
cannot inject markup. `document.head` is inserted verbatim: only pass HTML
you trust.

## `waavy render` (one-shot)

```sh
waavy render --release <dir> --page <id> [--props <json> | --props-file <path>]
             [--title <text>] [--lang <tag>] [--head <html>] [--stream] [--timeout <ms>]
waavy render --release <dir> --stdin   # full JSON request on stdin
```

Request shape (`--stdin`, and the future HTTP API):

```json
{ "v": 1, "page": "product", "props": {}, "document": { "title": "…" }, "stream": false, "timeoutMs": 10000 }
```

The JSON Schema ships as `@bundt/waavy/protocol.schema.json`.

Output contract:

- **stdout** — the HTML document, nothing else.
- **stderr** — JSON lines only: `{"warning":{…}}` for each recoverable error,
  and on failure exactly one `{"error":{"code","message","page?"}}`.
- **exit code** — `0` on success, otherwise the code's exit status below.
  With `--stream`, discard stdout whenever the exit code is non-zero.

Buffered rendering (the default) waits for every Suspense boundary. When the
deadline passes after the page shell is ready, pending boundaries are sent as
fallbacks and finish rendering in the browser; that counts as a warning, not
a failure.

## Error codes

| Code | Exit | HTTP | Meaning |
|---|---|---|---|
| `INVALID_REQUEST` | 10 | 400 | Request or flags failed validation |
| `PAGE_NOT_FOUND` | 11 | 404 | Page ID not in the release |
| `RENDER_FAILED` | 20 | 500 | The page shell could not render |
| `RENDER_TIMEOUT` | 21 | 504 | The shell was not ready by the deadline |
| `RELEASE_INVALID` | 30 | 503 | Release files missing or inconsistent |
| `VERSION_MISMATCH` | 31 | 503 | Release built for an incompatible waavy |
| `BUILD_FAILED` | 40 | 500 | `waavy build` could not bundle |
| `CONFIG_INVALID` | 41 | 500 | `waavy.config.*` missing or invalid |
| `INTERNAL` | 70 | 500 | Unexpected failure (a bug) |

## JavaScript hosts (Bun)

```ts
import { createRenderer } from '@bundt/waavy/server';

const renderer = await createRenderer({ release: './dist/waavy' });
const { html, recoverableErrors } = await renderer.render({ v: 1, page: 'product', props: { name: 'Lamp', price: 40 } });
```

## Development

```sh
bun run build          # dist/ (library bundles, declarations, protocol schema)
bun run build:binary   # dist/bin/waavy for this platform
bun run test           # unit + integration + CLI contract tests (builds the binary)
bunx playwright install chromium && bun run test:e2e   # real-browser hydration tests
```

Source layout follows the layers in ARCHITECTURE.md §3: `core/` (runtime-agnostic),
`build/`, `runtime/`, `transport/`, `cli/`, `browser/`. `src/layers.test.ts`
enforces the dependency rules.
