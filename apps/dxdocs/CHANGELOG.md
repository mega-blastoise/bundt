# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0-alpha.1] - 2026-03-01

### Added

- MDX compilation with frontmatter support via gray-matter
- Static site generation with pure HTML output (zero client-side JS)
- Dev server with live reload via chokidar file watching
- Built-in components: Callout, Card, CardGrid, Steps, Step
- Syntax highlighting with Shiki (11 languages)
- GitHub Flavored Markdown support via remark-gfm
- Light and dark theme with OS preference detection (`prefers-color-scheme`)
- Configurable accent color override
- Auto-generated table of contents from h2/h3 headings with scroll tracking
- Sidebar navigation with page and group support
- Header links with GitHub and external link icons
- TypeScript configuration file (`dxdocs.config.ts`) with Zod validation
- CLI with `dev` and `build` commands
- Responsive layout with mobile breakpoints
- 404 page generation in dev mode
- Build manifest output (`_manifest.json`)
- React 19 `prerender()` for streaming static HTML generation
