# Waavy

Render React pages from any server — Rust, Python, Go, Ruby, Java, PHP —
without running JavaScript in that server.

Waavy isn't a framework. Your backend owns routing, data, auth, and caching;
waavy turns **a registered page + JSON props** into **HTML plus the matching
hydration assets**, and gets out of the way.

> `0.3.0` is a ground-up rewrite; nothing from `0.2.x` (or the standalone
> `waavy` npm package) carries over. Design:
> [`ARCHITECTURE.md`](https://github.com/mega-blastoise/bundt/blob/main/.claude/specs/waavy/ARCHITECTURE.md).

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

## Install

```sh
npm install @bundt/waavy react react-dom     # or: bun add / pnpm add
```

The package installs a native `waavy` executable for your platform (an
optional dependency, `@bundt/waavy-<os>-<cpu>`) and a small `waavy`
launcher. Neither Node nor Bun is needed on the machine that *runs* the
renderer — only the binary and a release directory.

| Platform | npm | GitHub release asset |
|---|---|---|
| macOS arm64 | `@bundt/waavy-darwin-arm64` | `waavy-darwin-arm64.tar.gz` |
| macOS x64 | `@bundt/waavy-darwin-x64` | `waavy-darwin-x64.tar.gz` |
| Linux x64 (glibc) | `@bundt/waavy-linux-x64` | `waavy-linux-x64.tar.gz` |
| Linux arm64 (glibc) | `@bundt/waavy-linux-arm64` | `waavy-linux-arm64.tar.gz` |
| Linux x64 / arm64 (musl, Alpine) | — | `waavy-linux-{x64,arm64}-musl.tar.gz` |
| Windows x64 (**experimental**, TCP only) | `@bundt/waavy-win32-x64` | `waavy-win32-x64.zip` |

Release assets are on the
[GitHub releases page](https://github.com/mega-blastoise/bundt/releases) with
a `SHA256SUMS` file. Alpine needs `apk add libstdc++ libgcc`. Set
`WAAVY_BINARY_PATH` to make the npm launcher use a binary you downloaded.

If `waavy` reports that its platform package is missing, optional
dependencies were skipped (`--omit=optional`, `--no-optional`, or a lockfile
from another OS): reinstall with them enabled.

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

## Deployment

1. **Build in CI** (needs Node or Bun, and your frontend's dependencies):
   `npx waavy build`. The release directory is the whole artifact — it bundles
   your pages *and* React, so nothing from `node_modules` is needed at runtime.
2. **Ship** the release directory and the `waavy` binary for the target
   platform (from `node_modules/@bundt/waavy-<os>-<cpu>/bin/waavy`, or a
   GitHub release asset) next to your server.
3. **Run** `waavy serve --release <dir> --socket <path>` beside your server
   (systemd unit, container sidecar, or the Rust `Supervisor`), and render
   over HTTP. Or call `waavy render` per request if ~40 ms is acceptable.
4. **Serve** `<release>/client/` as static files at `publicPath` (or upload it
   to a CDN and set `publicPath` to its URL). Asset names are content-hashed:
   cache them forever.

Deploy a new release by starting a renderer on it and switching traffic;
each release has its own `buildId` (reported by `/health` and the
`waavy-build-id` header).

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

## `waavy serve` (warm renderer)

For production, run one long-lived renderer next to your server and talk to
it over HTTP. A render costs ~0.1 ms of overhead instead of ~40 ms of process
startup.

```sh
waavy serve --release dist/waavy --socket /run/waavy.sock   # or --port 4100
curl --unix-socket /run/waavy.sock -X POST http://localhost/render \
  -H 'content-type: application/json' -d '{"v":1,"page":"product","props":{"name":"Lamp"}}'
```

- `POST /render` → `200 text/html` (buffered by default; `"stream": true`
  streams once the shell is ready), or a JSON error with the status below.
- `GET /health` → the loaded build.
- Logs are JSON lines on stderr; SIGTERM drains in-flight requests and exits 0.
- `waavy serve --dev` builds from source, serves assets, and rebuilds on change.

The full contract — streaming failure semantics, headers, lifecycle — is in
[`docs/PROTOCOL.md`](https://github.com/mega-blastoise/bundt/blob/main/packages/waavy/docs/PROTOCOL.md).
Any language with an HTTP client can be a host.

## Rust hosts

```toml
waavy = { version = "0.3", features = ["supervisor"] }
```

```rust
use waavy::{RenderRequest, Supervisor};

let supervisor = Supervisor::builder()
    .binary("bin/waavy")
    .release("dist/waavy")
    .socket("/run/waavy.sock")
    .spawn()
    .await?;
let page = supervisor.client().render(&RenderRequest::new("product").title("Lamp")).await?;
```

The crate also has a plain `Client` (for a renderer you run yourself) and
one-shot rendering. See [`crates/waavy`](https://github.com/mega-blastoise/bundt/tree/main/crates/waavy)
and [docs.rs/waavy](https://docs.rs/waavy).

## `waavy render` (one-shot)

```sh
waavy render --release <dir> --page <id> [--props <json> | --props-file <path>]
             [--title <text>] [--lang <tag>] [--head <html>] [--stream] [--timeout <ms>]
waavy render --release <dir> --stdin   # full JSON request on stdin
```

Request shape (`--stdin`, and the HTTP body):

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

Requires Bun ≥ 1.3 (the `engines.bun` field applies to this library API
only; the CLI and binary need no JavaScript runtime).

```ts
import { createRenderer } from '@bundt/waavy/server';

const renderer = await createRenderer({ release: './dist/waavy' });
const { html, recoverableErrors } = await renderer.render({ v: 1, page: 'product', props: { name: 'Lamp', price: 40 } });
```

## Development

Full guides: the user docs site (`websites/waavy-docs`) and the maintainer
guide (`websites/waavy-maintainers`) — `bun run dev` in either directory.

```sh
bun run build          # dist/ (library bundles, declarations, protocol schema)
bun run build:binary   # dist/bin/waavy for this platform
bun run build:binaries # every distribution target → npm/<os>-<cpu>/bin, dist/release-assets
bun run test           # unit + integration + CLI contract tests (builds the binary)
bunx playwright install chromium && bun run test:e2e   # real-browser hydration tests
../../scripts/waavy-install-test.sh                     # pack + install like a user (npm, bun, bare binary)
bun ../../scripts/waavy-sync-versions.ts --version X    # bump npm, platform packages and crate together
```

Releases are cut by pushing the tag `@bundt/waavy@<version>`
(`.github/workflows/release-waavy.yml`); run that workflow manually for a dry
run.

Source layout follows the layers in ARCHITECTURE.md §3: `core/` (runtime-agnostic),
`build/`, `runtime/`, `transport/`, `cli/`, `browser/`. `src/layers.test.ts`
enforces the dependency rules.
