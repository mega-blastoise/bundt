# Waavy Alpha Readiness Checklist

## Mission: Runtime-agnostic React server rendering engine

### Tier 1 — Blocks alpha / core architecture issues

1. Separate library from CLI — The ./server and ./browser exports are the library. The CLI (src/index.ts, src/cli/) is a consumer of the library that happens to be bundled together. Today they're entangled: the CLI's render action imports from @/server and @/errors directly. For a library alpha, the server export surface (renderToReadableStream wrappers, pipeComponent*, writeStaticComponentToFile, Hydra) needs to work standalone without the CLI. Currently it does, but the package.json exports only expose ./server and ./browser — no root . export for the library. Consumers can't import { pipeComponentToCollectedString } from '@bundt/waavy'.
2. Bun API coupling in library code — The stated goal is "runtime agnostic," but Hydra.createBundle() calls Bun.build() directly, server/hydration.ts uses Bun.build(), Bun.write(), Bun.file(), Bun.randomUUIDv7(). writeStaticComponentToFile uses Bun.file() and Bun.write(). The core rendering functions in server/index.tsx (pipeComponent*, transformComponentToReadableStream) are actually runtime-agnostic (they use react-dom/server web APIs). The Bun-specific code is all in the hydration bundling / SSG layer, not in the core rendering path. This distinction needs to be explicit — either gate Bun APIs behind feature detection, or split exports into ./server (agnostic) and ./hydration (Bun-required).
3. Duplicate bundleInlineCode implementations — server/models/Hydra.tsx and server/hydration.ts both export bundleInlineCode with different signatures. The Hydra version is the one used by the render CLI action; the hydration.ts version is used by SSG. This is confusing and one should be canonical.
4. process.exit(1) in Hydra.createBundle() — Library code should never call process.exit. If the build result is undefined, throw instead.

### Tier 2 — Quality / correctness for alpha consumers

5. Two enums remain — ErrorCodes in errors/index.ts and OutputStrategy in cli/RenderAction/utils/index.ts, plus HydrationErrorEnum in errors/Hydration.ts and WorkerMessageDataAction in types/worker.ts. These violate the as const convention. Quick fix.
6. Empty catch blocks — 10+ locations silently swallow errors. The cache implementations (CacheBunFs, CacheSqlite3) swallow all errors in find() and cache() — this means cache failures are invisible. At minimum, add console.warn in these.
7. window as any in browser/index.tsx — The browser hydration client uses any casts to access window.waavy. Type-narrow with a declared interface instead.
8. debug/printf deps still in runtime — BundleAction/Action.ts, BundleAction/utils/handleBunBuildOutput.ts, SSGAction/setup.ts (now removed — was using debug), utils/log/index.ts all use debug. The printf dep is only used by the logger. Can replace with console.log/picocolors since debug adds 200KB and printf is unnecessary.
9. files field in package.json — Currently includes out/bun/ and out/lib/ but types are now at out/src/. The out/lib/ entry is stale. Also missing out/src/ for type declarations.

Tier 3 — Polish for beta

10. Default exports everywhere — ~30 files use export default. Not blocking for alpha but creates inconsistency with bundt conventions.
11. Path aliases (@/*) — Makes the codebase harder to navigate and creates bundler coupling. All imports need resolution config.
12. Unfinished features — PreRenderAction is a no-op. telemetry module is a stub. waavy-hydration-bundle.ts template is empty. ProcessManager.cleanup swallows errors. Feature flags in config gate actions but aren't documented.
13. Type declarations include build/config/scripts — tsc emits .d.ts for build/, config/, scripts/ dirs. Need a tsconfig.build.json that only includes src/.

---
  
My recommended order for maximum alpha-readiness impact:

1. #1 + #9 — Fix exports and files field (consumers can actually import the library)
2. #4 + #5 — process.exit fix + enum cleanup (5 min)
3. #2 — Document/gate Bun coupling (clarify what's agnostic vs Bun-only)
4. #3 — Deduplicate bundleInlineCode
5. #13 — tsconfig.build.json to emit clean types
6. #6 — Empty catch blocks
7. #8 — Remove debug/printf