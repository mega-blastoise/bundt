# Waavy P4 — Static site generation from job lists

Status: **Blocked on P1** (can run in parallel with P2/P3 after P1) · Depends on: `ARCHITECTURE.md` r2 §6 · Ships in: 0.4.0 (or 0.3.x if ready before the P3 tag)

## Goal

`waavy ssg` renders an explicit list of `{ page, path, props, document }` jobs
through the same renderer as `render`/`serve` and writes a static site whose
pages hydrate. No route discovery, no loaders in page modules.

## Locked decisions

- Jobs come from a JSON file or a `ssg.jobs` function in `waavy.config.ts`
  (runs in Bun at SSG time, never bundled for the browser).
- Buffered rendering only; same document shell and data island.
- Output is written atomically; any failed job fails the command and writes
  nothing.

## Out of scope

Incremental builds, sitemap/robots generation, i18n, redirects, image
processing, filesystem routing.

---

## Tasks

### T1 — Schema (`core/ssg.ts`)
- [ ] `SsgJobSchema`: `page` (page ID), `path` (starts with `/`; normalized:
      collapse `//`, strip trailing `/` except root; reject `..`, `?`, `#`,
      backslashes, and non-URL-safe characters after percent-decoding),
      `props` default `{}`, `document?` (same as `RenderRequest.document`).
- [ ] `SsgJobsSchema`: array, ≥1, unique normalized `path` (duplicate →
      `INVALID_REQUEST` naming both job indices).
- [ ] Config: `ssg?: { jobs?: string | (() => SsgJob[] | Promise<SsgJob[]>); outDir = "./dist/site"; trailingSlash = true; concurrency = 4 }`.
- **Accept:** unit tests for normalization, rejection cases, duplicates.

### T2 — Path → file mapping
- [ ] `trailingSlash: true` → `/` → `index.html`, `/a/b` → `a/b/index.html`;
      `false` → `/a/b` → `a/b.html`, `/` → `index.html`.
- [ ] Reject jobs whose file path would collide with the asset directory
      (`publicPath` prefix).
- **Accept:** table-driven tests.

### T3 — Runner (`build/ssg.ts`)
- [ ] `runSsg({ release, jobs, outDir, trailingSlash, concurrency, strict })`:
      `createRenderer({ release })`; render with a bounded pool; collect all
      results; on any failure report every failed job
      (`{"error":{code,message,page,job,path}}` lines on stderr) and exit with
      the first failure's code, writing nothing.
- [ ] Recoverable errors → warning lines; `--strict` turns them into failures.
- [ ] Write to `<outDir>.tmp-<buildId>`, copy `release/client/` into
      `<tmp><publicPath>` when `publicPath` is an absolute path (if it's a URL,
      skip and log that assets must be deployed to that URL), then rename over
      `outDir`.
- **Accept:** tests for success tree, failure atomicity (previous output
  intact), concurrency bound respected, strict mode.

### T4 — `waavy ssg` command
- [ ] `waavy ssg [--release <dir> | --build] [--root <dir>] [--config <path>] [--jobs <file>] [--out <dir>] [--concurrency <n>] [--strict]`.
      `--build` runs `buildRelease` first. `--jobs` overrides config `ssg.jobs`.
      Prints a summary (`N pages, M warnings, out: <dir>`).
- **Accept:** contract tests via the compiled binary.

### T5 — Fixtures and e2e
- [ ] `fixtures/basic/ssg.jobs.json`: `counter` at `/` and `/counter/5`,
      `styled` at `/styled`.
- [ ] Snapshot test of the output tree and one page's HTML.
- [ ] Playwright: serve the output dir with a static `Bun.serve`, load
      `/counter/5/`, click → `6`; CSS applied on `/styled/`.

### T6 — Docs
- [ ] README SSG section: jobs file and config function examples, path
      mapping, `publicPath` rules for static hosting/CDN, failure semantics.
- [ ] CHANGELOG entry.

---

## Exit criteria

1. Fixture site builds via `waavy ssg --build` with the compiled binary.
2. Static Playwright hydration test passes.
3. Failure atomicity and duplicate-path tests pass.

## Implementation notes

_(fill in during implementation)_
