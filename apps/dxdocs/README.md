# @bundt/dxdocs

Beautiful documentation sites from MDX. Zero client JavaScript, pure static HTML.

> **Status:** Pre-release (0.1.0). Core build pipeline, dev server, theme system, coverpage, footer, icon system, and all built-in components are implemented.

## Install

```bash
bun add @bundt/dxdocs
```

## Quickstart

Create a docs directory and config:

```bash
mkdir docs
```

```mdx
---
title: Welcome
---

# Hello World

Your first documentation page.
```

```typescript
// dxdocs.config.ts
export default {
  title: 'My Docs',
  theme: {
    preset: 'minimal',
    darkMode: 'dark'
  },
  navigation: [
    { type: 'page', path: '/', title: 'Home' }
  ]
};
```

Start the dev server:

```bash
bunx dxdocs dev
```

Build for production:

```bash
bunx dxdocs build
```

Output lands in `./dist/` — deploy to any static host (S3, CloudFront, Vercel, Netlify, GitHub Pages).

## Features

- **Zero runtime JS** — Pre-rendered static HTML with no framework shipped to the browser
- **MDX-first** — Markdown with embedded React components, processed at build time
- **5 theme presets** — Minimal, Catppuccin, Ayu, Nord, Gruvbox (each with light + dark variants)
- **Coverpage** — Full-viewport hero section with gradient background and CTA buttons
- **Footer** — Configurable column layout with social icon links
- **Icon system** — 70+ lucide icons available by name in `<Card>` and `<Icon>` components
- **Logo support** — Single image or light/dark pair in the header
- **Prev/next navigation** — Automatic page links at the bottom of each article
- **Syntax highlighting** — Shiki with 11 language grammars out of the box
- **Light & dark themes** — Automatic OS preference detection (`prefers-color-scheme`) or forced mode
- **Table of contents** — Auto-generated from h2/h3 headings with scroll-spy tracking
- **Live reload** — Dev server (via chokidar) with instant refresh on file changes
- **Fast builds** — Powered by Bun for sub-second static generation
- **Built-in components** — Callout, Card, CardGrid, Steps, Step, Icon
- **Nested navigation** — Pages and groups with arbitrary nesting depth
- **Header links** — GitHub and external links with icon support
- **Token overrides** — Per-token color customization on top of presets
- **GFM support** — GitHub Flavored Markdown (tables, strikethrough, task lists) enabled by default
- **Configurable extensions** — `.md` and `.mdx` by default, extensible

## Configuration

```typescript
// dxdocs.config.ts
export default {
  // Site metadata
  title: 'My Project',
  description: 'Project docs',
  base: '/',
  logo: '/logo.svg',              // or { light, dark, height }
  favicon: '/favicon.svg',

  // Navigation structure (pages and nested groups)
  navigation: [
    { type: 'page', path: '/', title: 'Home' },
    {
      type: 'group',
      title: 'Guides',
      items: [
        { type: 'page', path: '/install', title: 'Installation' },
        { type: 'page', path: '/usage', title: 'Usage' }
      ]
    }
  ],

  // Header links (top-right)
  headerLinks: [
    { label: 'GitHub', href: 'https://github.com/you/repo', icon: 'github' },
    { label: 'API', href: 'https://api.example.com', icon: 'external' }
  ],

  // Coverpage (index page hero)
  coverpage: {
    title: 'My Project',
    tagline: 'A concise tagline',
    description: 'Longer description here.',
    actions: [
      { label: 'Get Started', href: '/install', primary: true },
      { label: 'GitHub', href: 'https://github.com/...' }
    ],
    background: 'gradient'
  },

  // Footer
  footer: {
    columns: [
      {
        title: 'Resources',
        links: [
          { label: 'Docs', href: '/docs' },
          { label: 'Blog', href: 'https://blog.example.com' }
        ]
      }
    ],
    copyright: '© 2026 My Project',
    socials: [
      { icon: 'github', href: 'https://github.com/...' }
    ]
  },

  // Theme
  theme: {
    preset: 'minimal',         // 'minimal' | 'catppuccin' | 'ayu' | 'nord' | 'gruvbox'
    accentColor: '#6d28d9',    // Optional accent override
    darkMode: 'media',         // 'media' | 'light' | 'dark'
    overrides: {               // Optional per-token overrides
      dark: { bg: '#0a0a0a' }
    }
  },

  // MDX processing
  mdx: {
    extensions: ['.md', '.mdx'],
    gfm: true
  },

  // Output
  output: {
    outDir: './dist'
  }
};
```

The configuration schema is validated with Zod 4 at load time — invalid configs produce clear error messages.

## Built-in Components

All components are available automatically in MDX files without imports.

### Icon

Render any of 70+ lucide icons by name:

```mdx
<Icon name="terminal" size={24} color="#6d28d9" />
```

### Callout

Four variants with icons (via Lucide):

```mdx
<Callout variant="info">Important information here.</Callout>
<Callout variant="tip">A helpful suggestion.</Callout>
<Callout variant="warning">Proceed with caution.</Callout>
<Callout variant="error">Something went wrong.</Callout>
```

### Card & CardGrid

Link cards with named icons, arranged in a responsive grid:

```mdx
<CardGrid>
  <Card title="Getting Started" icon="rocket" href="/getting-started">
    Quick setup guide for new users
  </Card>
  <Card title="API Reference" icon="book-open" href="/api">
    Complete API documentation
  </Card>
</CardGrid>
```

Cards support internal links (`/path`), external links (`https://...`), or no link (static card).

### Steps

Ordered step-by-step instructions:

```mdx
<Steps>
  <Step title="Install">Run `bun add @bundt/dxdocs`</Step>
  <Step title="Configure">Create `dxdocs.config.ts`</Step>
  <Step title="Write">Add MDX files to `docs/`</Step>
</Steps>
```

## Theme Presets

| Preset | Description |
|--------|-------------|
| `minimal` | Black/gray/white with purple accent — Mintlify-inspired |
| `catppuccin` | Latte (light) / Mocha (dark) — pastel palette |
| `ayu` | Ayu Light / Dark (Mirage) — warm amber tones |
| `nord` | Snow Storm / Polar Night — frost blues |
| `gruvbox` | Gruvbox Light / Dark — retro warm palette |

## CLI

```bash
dxdocs dev              # Start dev server with live reload
dxdocs build            # Build static site to output directory
```

## Project Structure

```text
my-project/
├── docs/
│   ├── index.mdx              # Homepage
│   ├── getting-started.mdx
│   └── api/
│       ├── overview.mdx
│       └── reference.mdx
├── dxdocs.config.ts            # Site configuration
└── package.json
```

## Architecture

```
apps/dxdocs/
  src/
    cli.ts                CLI entry (dev, build commands via cac)
    index.ts              Library entry

    config/
      loader.ts           Config file discovery and loading
      schema.ts           Zod 4 config schema with defaults

    mdx/
      compiler.ts         MDX -> React element compilation (via @mdx-js/mdx)
      components.tsx      Built-in component definitions (Callout, Card, Steps, Icon, etc.)
      icons.tsx            Lucide icon name-to-component registry

    build/
      builder.ts          Static site builder (MDX compile -> React SSR -> HTML)
      dev.ts              Dev server with chokidar file watching
      shared.ts           Shared utilities (page resolution, HTML generation)

    theme/
      layout.tsx          Page layout component (sidebar, TOC, header, footer, coverpage)
      tokens.ts           Theme preset registry and CSS custom property generation
      styles.css          Complete theme stylesheet (coverpage, footer, prev/next, responsive)
```

## Styling

dxdocs uses BEM-style CSS classes prefixed with `void-` (the internal theme name). The theme supports light and dark modes via CSS custom properties and `prefers-color-scheme` media queries.

To customize colors, pick a preset and optionally set `theme.accentColor` or `theme.overrides` in your config. For deeper customization, the generated HTML uses semantic class names that you can override with your own CSS.

## Requirements

- [Bun](https://bun.sh) v1.3+

### Runtime Limitation

dxdocs requires Bun as its runtime. The CLI, dev server, and build pipeline use Bun-specific APIs (`Bun.serve()`, `Bun.file()`, `Bun.Glob`) that have no Node.js equivalents.

If you install via npm/yarn and run with Node, the CLI shim will detect Bun is missing and offer to install it interactively. Once available, the shim delegates to Bun automatically.

## Peer Dependencies

dxdocs declares its heavy dependencies as peer deps to allow version deduplication:

- `@mdx-js/mdx` ^3.1.0
- `react` / `react-dom` ^19.1.0
- `shiki` ^3.0.0
- `zod` ^4.0.0
- `gray-matter`, `remark-gfm`, `lucide-react`, `unist-util-visit`

## License

MIT
