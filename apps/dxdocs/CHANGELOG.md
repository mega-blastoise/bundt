# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## Unreleased

## [0.2.0] - 2026-03-09

### Added

- **Theme presets** — 5 built-in color themes: `minimal`, `catppuccin`, `ayu`, `nord`, `gruvbox`
  - Each preset includes complete light and dark token sets
  - `theme.preset` config field with `'minimal'` as default
- **Coverpage** — full-viewport hero section rendered on the index page
  - Configurable title, tagline, description, and action buttons
  - Three background modes: `gradient`, `solid`, `none`
  - Responsive typography with `clamp()` sizing
- **Footer** — configurable site footer with column links and social icons
  - Supports `github`, `twitter`, `discord`, and `external` icon types
  - External links auto-display arrow icons
- **Icon system** — 70+ lucide icons available by name
  - `<Icon name="terminal" />` standalone MDX component
  - `<Card icon="rocket">` accepts icon names as strings
  - New `src/mdx/icons.tsx` registry mapping names to components
- **Logo support** — render an image in the header
  - Simple string path: `logo: '/logo.svg'`
  - Theme-aware pair: `logo: { light: '...', dark: '...', height: 32 }`
  - CSS handles light/dark toggling via `prefers-color-scheme`
- **Prev/next navigation** — automatic page links at the bottom of each article
  - Flattens navigation tree to determine ordering
  - Styled as bordered cards with accent hover
- **Token overrides** — `theme.overrides.light` and `theme.overrides.dark` for per-token customization
- **`LogoConfig`, `FooterConfig`, `CoverpageConfig`** types exported from schema

### Changed

- **Font** — replaced Fira Sans with DM Sans (400/500/600/700)
- **`generateCssVariables`** now accepts an options object instead of positional args
  - `{ preset, darkMode, accentColor, overrides }`
- **Minimal theme** now uses a subtle purple accent (`#6d28d9` light, `#a78bfa` dark) instead of pure monochrome
- **Card component** `icon` prop now accepts a string name in addition to ReactNode
- Gradient hero CSS variable derives from the preset's accent color

## [0.1.0] - 2026-03-01

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
