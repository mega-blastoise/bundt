# P1 spike results

Machine: macOS (Darwin arm64), Bun 1.3.14, React 19.2.4. Date: 2026-10-28.
Throwaway scripts lived in `packages/waavy/spikes/` and were deleted after
recording these results.

## S1 — `Bun.build` inside a compiled binary · **PASS**

A `bun build --compile` executable that calls `Bun.build` on a TSX entry
importing React (run from a directory with `node_modules`) produced correct
client and server bundles. `waavy build` ships inside the binary; no
`bunx` fallback is needed.

### S1b — runtime `import()` from a compiled binary · **FAIL by default → fixed with flags**

Found during T13 (not covered by the original S1): the compiled binary could
not `import()` the user's `waavy.config.ts`, because it imports
`@bundt/waavy` and resolution failed with `Cannot find module`.

Root cause, isolated with probe binaries: **compiled Bun executables do not
read `package.json` at runtime unless built with
`--compile-autoload-package-json`.** Without it, bare specifiers only
resolve through the `index.js` fallback, so `main`/`exports` are ignored
(packages like `react` that happen to ship `index.js` work, which hid the
problem).

Decision: `build/binary.ts` compiles with
`--compile-autoload-package-json --compile-autoload-tsconfig` (so user files
resolve exactly as under `bun`), leaving `.env`/`bunfig.toml` autoload off.
Regression test: `test/cli.test.ts` runs `waavy build` through the compiled
binary against the fixture. **P3 must use the same flags for every target**
(`COMPILE_FLAGS` is exported from `build/binary.ts` for reuse).

## S2 — CSS and metafile shape · **PASS**

- Browser build with `metafile: true`: each JS entry output has
  `entryPoint` and `cssBundle`; static chunk dependencies are in
  `imports[]` with `kind: "import-statement"`.
- Output keys, `cssBundle`, and `imports[].path` are relative to `outdir`
  and may contain redundant `./` segments (`"././home-abc.js"` with
  `[dir]` naming) → normalized with `posix.normalize`.
- `entryPoint` is relative to `process.cwd()` → resolved against it.
- A two-line `onLoad({ filter: /\.css$/ })` plugin returning empty JS stubs
  CSS in the server build.
- `Bun.build` failures reject with `AggregateError` (`errors` are build
  messages); `success: false` is also handled.
- `[name]` for chunks takes the first entry's name (`chunks/counter-*.js`),
  which is misleading for shared code → chunks are named `chunk-[hash]`.

## S3 — compiled binary imports a release that bundles React · **PASS**

The binary imported `server/entry.js` (React + react-dom/server bundled,
`target: "bun"`) by absolute path and rendered a component with hooks. No
"Invalid hook call"; no bare `react` imports remain in the bundle. Bun selects
react-dom's `bun` export condition (`react-dom-server.bun`).

## S4 — fixture workspace resolution · **fallback applied**

The repo uses Bun's isolated installs (`configVersion: 1`); a nested
directory cannot resolve `@bundt/waavy` without being a workspace.
`packages/waavy/fixtures/*` was added to the root `workspaces`. The fixture
depends on `@bundt/waavy: workspace:*`, so integration tests require the
package's `dist/` (turbo's `test` depends on `build`).

## S5 — cold one-shot baseline

`waavy render --release … --page counter` (20 sequential runs, fixture
release, production build):

| Executable | p50 | p95 | min |
|---|---|---|---|
| compiled binary (`dist/bin/waavy`) | 40.9 ms | 48.2 ms | 38.5 ms |
| `bun dist/cli.js` | 54.0 ms | 61.4 ms | 49.9 ms |

Sizes: binary 60.8 MB; fixture `server/entry.js` 192 KB; `client/` 1.0 MB
(with sourcemaps). P2 compares `serve` against these numbers.
