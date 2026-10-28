# Waavy P3 — Distribution and 0.3.0 release

Status: **Blocked on P2** · Depends on: `ARCHITECTURE.md` r2, P1, P2 · Branch: `waavy/r2` → merged to `develop` at the end

## Goal

`npm i @bundt/waavy` on a clean macOS or Linux machine produces a working
`waavy` binary; Rust hosts can `cargo add waavy`; binaries are downloadable
from GitHub releases; `@bundt/waavy@0.3.0` and `waavy` (crate) 0.3.0 are
published; the standalone repos are sunset.

## Locked decisions

- Per-platform npm packages via `optionalDependencies` (ARCH §8).
- Targets: `darwin-arm64`, `darwin-x64`, `linux-x64`, `linux-arm64`
  (supported, CI-tested); `win32-x64` (**experimental**, TCP only, smoke
  test allowed to fail).
- musl (Alpine) binaries ship as **GitHub release assets only** (no npm
  package — npm's `os`/`cpu` cannot select libc reliably).
- Crate published to crates.io as `waavy`, version in lockstep with the npm
  package for 0.x.
- Standalone repos archived **after** both packages are published (ARCH D5).

## Out of scope

Code signing/notarization, Homebrew/apt packages, a binary-downloading
feature in the crate, SSG.

---

## Tasks

### T1 — Cross-compile script
- [ ] `packages/waavy/build/binaries.ts`: for each target run
      `bun build --compile --minify --target=<t> src/cli/index.ts --outfile npm/<pkg>/bin/waavy[.exe]`.
      Targets: `bun-darwin-arm64`, `bun-darwin-x64`, `bun-linux-x64-baseline`
      (baseline = no AVX2 requirement), `bun-linux-arm64`, `bun-windows-x64`,
      plus release-asset-only `bun-linux-x64-musl`, `bun-linux-arm64-musl`
      into `dist/release-assets/`.
- [ ] Flags: `--target <name>` (repeatable), `--host-only`.
- **Accept:** all targets cross-compile from a linux runner; `file` reports the
  expected format/arch for each.

### T2 — Platform packages
- [ ] `packages/waavy/npm/<platform>/package.json` (committed), e.g.
      `@bundt/waavy-darwin-arm64`: `os: ["darwin"]`, `cpu: ["arm64"]`,
      `files: ["bin/"]`, `license`, `repository`, `publishConfig.access: public`,
      `preferUnplugged: true`. Not workspaces (exclude from root `workspaces`).
- [ ] `scripts/waavy-sync-versions.ts`: sets every platform package's version
      and the main package's `optionalDependencies` to the exact same version.
- **Accept:** a test fails if versions drift.

### T3 — Launcher `bin/waavy.js`
- [ ] Plain Node-compatible ESM (no deps, also runs under Bun). Resolution
      order: `WAAVY_BINARY_PATH` env → `@bundt/waavy-${platform}-${arch}/bin/waavy[.exe]`
      via `createRequire(import.meta.url).resolve` → error.
- [ ] Spawn with `stdio: "inherit"`; forward SIGINT/SIGTERM/SIGHUP to the child;
      exit with the child's code, or `128 + signal number` if killed by signal.
- [ ] Not-found error lists supported platforms and mentions
      `--omit=optional` / `--no-optional` as a likely cause.
- [ ] `package.json` `bin: { "waavy": "./bin/waavy.js" }`; delete the P1
      interim `bin/waavy.ts`.
- **Accept:** unit tests for resolution and exit-code/signal mapping (spawn a
  fake binary script).

### T4 — Final `package.json` for `@bundt/waavy`
- [ ] `version: 0.3.0`; `files: ["dist/", "bin/", "README.md", "CHANGELOG.md", "LICENSE"]`
      (no binaries in the main package); `optionalDependencies` for the five
      platform packages; peers `react@^19`, `react-dom@^19` (needed by
      `waavy build`); `engines.bun >= 1.3` documented as required only for the
      `@bundt/waavy/server` library API.
- **Accept:** `npm pack --dry-run` lists only intended files; size recorded.

### T5 — Install tests
- [ ] `scripts/waavy-install-test.sh`: `npm pack` the main package and the
      host's platform package into a temp dir; create a temp project with
      `react`, `react-dom`, the two tarballs (main via `npm i`, with the
      platform tarball installed explicitly), copy `fixtures/basic` pages and
      config; run `npx waavy build`, `npx waavy render --page counter ...`;
      assert HTML. Repeat with `bun add`.
- [ ] A variant with no Node at all: run the extracted binary directly
      (`bin/waavy render ...`) to prove hosts need neither Node nor Bun for
      `render`/`serve`.
- **Accept:** passes on ubuntu and macOS runners.

### T6 — CI matrix
- [ ] `ci.yml` job `waavy-matrix`: `os: [ubuntu-latest, ubuntu-24.04-arm, macos-14, macos-13]`
      → build, `build:binary` (host), contract tests (P1 T12, P2 T3), install test.
      `windows-latest`: build + `waavy --version` + port-mode serve smoke,
      `continue-on-error: true`.
- [ ] Playwright and Rust jobs stay ubuntu-only (P1/P2).

### T7 — Release workflow
- [ ] Exclude waavy from the generic `release.yml`: `tags: ["@bundt/*@*", "!@bundt/waavy@*"]`.
- [ ] New `.github/workflows/release-waavy.yml` on tag `@bundt/waavy@*`:
  1. `build` (ubuntu): install, test, `binaries.ts` all targets, upload
     artifacts.
  2. `smoke` (matrix of native runners incl. arm64 and macOS): download the
     matching binary, run `--version` + one-shot render of a prebuilt fixture
     release; windows `continue-on-error`.
  3. `publish-npm` (needs smoke): verify versions synced; publish each
     platform package, then `@bundt/waavy` (`npm publish --access public`,
     `NODE_AUTH_TOKEN`); `--tag next` if the version has a prerelease part.
  4. `publish-crate` (needs smoke): `cargo publish -p waavy`
     (`CARGO_REGISTRY_TOKEN`).
  5. `github-release`: create release with `waavy-<target>.tar.gz` (`.zip`
     for windows) for every binary incl. musl, plus `SHA256SUMS`.
- [ ] Dry-run path: `workflow_dispatch` with `dry_run: true` runs everything
      but publish steps use `--dry-run`.
- **Accept:** a dry run on a `0.3.0-rc.0` tag succeeds end to end.

### T8 — `Supervisor` (crate feature `supervisor`)
- [ ] `Supervisor::builder().binary(path).release(dir).socket(path).spawn().await -> Supervisor`
      spawns `waavy serve --socket`, waits for `/health` (timeout), restarts on
      unexpected exit with exponential backoff (capped, max restarts per
      minute), forwards child stderr lines to a `tracing`-free callback or
      `log` hook, `client() -> Client`, `shutdown().await` (SIGTERM, then kill
      after grace period); `kill_on_drop`.
- [ ] Integration tests: start, render, kill child externally → restarted and
      healthy, shutdown removes socket.
- **Accept:** tests pass in the `waavy-rs` CI job.

### T9 — Crate publishing prep
- [ ] `Cargo.toml`: `version = "0.3.0"`, `readme`, `keywords`, `categories`,
      `rust-version`, `documentation`; `include` limits package contents.
- [ ] `cargo publish -p waavy --dry-run` passes; `cargo doc` has no warnings;
      README shows `waavy = "0.3"`.

### T10 — Docs
- [ ] `packages/waavy/README.md` final (install, quickstart for JS and Rust
      hosts, deployment: build in CI → ship release dir + binary → host serves
      `client/`; platform table incl. experimental Windows and musl assets).
- [ ] `docs/docs/packages/waavy.mdx` rewritten to match real APIs; bundt root
      `README.md` waavy section; `websites/landing/src/components/Packages.tsx`
      drop "coming soon" for waavy.
- [ ] `CHANGELOG.md` `0.3.0` entry; `PROTOCOL.md` final review.

### T11 — Release and sunset (each step needs explicit approval at execution time)
- [ ] Merge `waavy/r2` → `develop` (PR), then whatever the repo's flow to
      `main` is.
- [ ] Tag `@bundt/waavy@0.3.0`; confirm npm + crates.io + GitHub release.
- [ ] Standalone repos `nicholasgalante1997/{waavy,waavy-rs,create-waavy-app}`:
      README pointer to bundt, close PRs #15/#16 (and the waavy-rs Dependabot
      PR) with a comment, archive.
- [ ] `npm deprecate waavy "Moved to @bundt/waavy"`.
- [ ] Update root `CLAUDE.md` and ARCHITECTURE status.

---

## Exit criteria

1. Release dry run green (T7).
2. Install tests pass on all four supported runners (T5, T6).
3. `@bundt/waavy@0.3.0`, the platform packages, and crate `waavy` 0.3.0
   published; GitHub release has all assets and checksums.
4. Standalone repos archived with pointers.

## Prerequisites from the owner

- `CARGO_REGISTRY_TOKEN` secret in the `release` environment.
- npm token with publish rights for `@bundt/waavy-*` names (new packages).
- Optional now: reserve the crate name by publishing a `0.0.0` placeholder
  (outward-facing; only on explicit request).

## Implementation notes

_(fill in during implementation)_
