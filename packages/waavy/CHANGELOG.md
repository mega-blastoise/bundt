# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- AbstractWaavyServer
- WaavyServer
- Hydra (Hydration)

### Fixed

### Removed

### Deprecated

### Security

## [0.1.6] 07/08/2025

### Added 

- Implements render caching with `--cache` flag. Introduces dependency on Sqlite3 for `CacheManagerHeaderCache` internal database management.
- Adds `--cache-key` for secure encryption of cached render output
- Adds `--cache-type`, options: bunfs, bunsqlite3
- Adds gzip compression for built executables
- Adds pipeline decompression to `post-install.js`
- Error page fallback implementation for opt-out pattern if an error is thrown during render

### Fixed

### Removed

- `prehydrate` command

### Deprecated

### Security

## [0.1.5] 06/15/2025

### Added

### Fixed

- Sets up .npmrc in `npm publish` Github Action Workflow

### Removed

### Deprecated

### Security

## [0.1.4] 06/15/2025

### Added

- Adds `debug` job to Github Actions workflows.

### Fixed

- Sets up conditional to exit early from post-install.js in CI environments

### Removed

### Deprecated

### Security

## [0.1.3] 06/15/2025

### Added

- Support for `--bootstrap` flag, which will pass a list of scripts to the `bootstrapModules` field of the `ReactDOM.renderToReadableStream` options object.
- Support for `--hydrate` flag, which will bundle into the rendered output a client side hydration script (self-contained).
- Support for `--selector` flag, which will use a custom selector to find the root element to hydrate into.
- Github Actions CI/CD: Adds `npm publish` to release job

### Fixed

- Moves `react`, `react-dom` to peerDependencies
- Updates `build.ts` to be more flexible, as a commander subprogram.

### Removed

### Deprecated

### Security

## [0.1.2] 06/07/2025

### Added

- Github Actions CI/CD: Test, Release Jobs
- Initial `commander` program setup
- `render` action will render a React component into a stdout stream
- build.ts: Bun Output, (MacOS, Linux, Window)(x64, arm64) executable build targets

### Fixed

- None

### Removed

- None

### Deprecated

- None

### Security

- None
