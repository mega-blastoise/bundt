# @dxforge/docs

Beautiful documentation sites from MDX. Zero client JavaScript, pure static HTML.

## Features

- **Zero runtime JS** — Pre-rendered static HTML, no framework shipped to users
- **MDX-first** — Markdown with embedded React components
- **Built-in components** — Callouts, cards, steps, and more
- **Syntax highlighting** — Shiki with 11 languages out of the box
- **Light & dark themes** — Automatic OS preference detection or forced mode
- **Table of contents** — Auto-generated from h2/h3 headings with scroll tracking
- **Live reload** — Dev server with instant refresh on file changes
- **Fast builds** — Powered by Bun for sub-second static generation

## Quickstart

```bash
bun add @dxforge/docs
```

Create a docs directory and your first page:

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

Create `dxdocs.config.ts` in your project root:

```typescript
export default {
  title: 'My Docs',
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

Output lands in `./dist/` — deploy to any static host.

## Configuration

```typescript
// dxdocs.config.ts
export default {
  title: 'My Project',
  description: 'Project documentation',
  base: '/',

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

  headerLinks: [
    { label: 'GitHub', href: 'https://github.com/you/repo', icon: 'github' }
  ],

  theme: {
    accentColor: '#7c3aed',
    darkMode: 'media' // 'media' | 'light' | 'dark'
  },

  output: {
    outDir: './dist'
  }
};
```

## Built-in Components

### Callout

```mdx
<Callout variant="info">Important information here.</Callout>
<Callout variant="tip">A helpful suggestion.</Callout>
<Callout variant="warning">Proceed with caution.</Callout>
<Callout variant="error">Something went wrong.</Callout>
```

### Card & CardGrid

```mdx
<CardGrid>
  <Card title="First" href="/first">Description text</Card>
  <Card title="Second" href="/second">Description text</Card>
</CardGrid>
```

### Steps

```mdx
<Steps>
  <Step title="Install">Run `bun add @dxforge/docs`</Step>
  <Step title="Configure">Create `dxdocs.config.ts`</Step>
  <Step title="Write">Add MDX files to `docs/`</Step>
</Steps>
```

## Project Structure

```text
my-project/
├── docs/
│   ├── index.mdx
│   ├── getting-started.mdx
│   └── api-reference.mdx
├── dxdocs.config.ts
└── package.json
```

## Requirements

- [Bun](https://bun.sh) v1.3+

### Runtime Limitation

dxdocs requires Bun as its runtime. The CLI, dev server, and build pipeline use Bun-specific APIs (`Bun.serve()`, `Bun.file()`, `Bun.Glob`) that have no Node.js equivalents without a full rewrite.

If you install dxdocs via npm/yarn and run it with Node, the CLI shim will detect that Bun is missing and offer to install it for you interactively. Once Bun is available, the shim delegates to it automatically.

Node.js runtime support is tracked as a future goal.

## License

MIT
