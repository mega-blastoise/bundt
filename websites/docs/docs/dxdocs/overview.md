---
title: "DXDocs: Overview"
description: "@bundt/dxdocs is a static documentation site generator built on MDX with zero client JavaScript."
---

# DXDocs

**@bundt/dxdocs** generates beautiful documentation sites from Markdown and MDX. The output is pure static HTML — zero client JavaScript, zero framework overhead.

## Key Features

<CardGrid>
  <Card title="Zero Client JS" icon="zap">
    Pages are pre-rendered to static HTML using React 19's prerender() API. No framework shipped to the browser.
  </Card>
  <Card title="MDX Support" icon="file-code">
    Write documentation with embedded JSX components. Built-in components available without imports.
  </Card>
  <Card title="Theme Presets" icon="palette">
    5 built-in color themes (minimal, catppuccin, ayu, nord, gruvbox) with light and dark variants.
  </Card>
  <Card title="Coverpage" icon="layout">
    Full-viewport landing page with gradient background, CTA buttons, and responsive typography.
  </Card>
</CardGrid>

- **Syntax highlighting** — powered by Shiki with the `github-dark-default` theme
- **GitHub Flavored Markdown** — tables, strikethrough, autolinks, task lists
- **Icon system** — 70+ lucide icons available by name in cards and MDX
- **Dark mode** — automatic via `prefers-color-scheme` or forced light/dark
- **Live reload** — development server with file watching
- **Prev/next navigation** — automatic page links at the bottom of each article
- **Footer** — configurable column layout with social links
- **Logo support** — single image or light/dark pair in the header

## Quick Start

<Steps>
  <Step title="Install DXDocs">
    ```bash
    bun add -g @bundt/dxdocs
    ```
  </Step>
  <Step title="Create your docs directory">
    ```bash
    mkdir docs
    echo "# Hello World" > docs/index.md
    ```
  </Step>
  <Step title="Create a config file">
    ```typescript
    // dxdocs.config.ts
    export default {
      title: 'My Project',
      description: 'Documentation for my project',
      theme: {
        preset: 'minimal',
        darkMode: 'dark'
      }
    };
    ```
  </Step>
  <Step title="Start the dev server">
    ```bash
    dxdocs dev
    ```
  </Step>
  <Step title="Build for production">
    ```bash
    dxdocs build
    ```
  </Step>
</Steps>

## How It Works

DXDocs processes your Markdown/MDX files through this pipeline:

1. **Discovery** — scans `docs/` for `.md` and `.mdx` files
2. **Compilation** — compiles MDX using `@mdx-js/mdx` with remark/rehype plugins
3. **Highlighting** — applies Shiki syntax highlighting to code blocks
4. **Rendering** — pre-renders each page to static HTML using React 19
5. **Output** — writes HTML files with inlined CSS to `dist/`

The result is a fully static site that can be deployed to any static hosting provider (S3, Cloudflare Pages, Netlify, Vercel, etc.).
