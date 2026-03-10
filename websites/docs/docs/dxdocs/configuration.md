---
title: "DXDocs: Configuration"
description: Complete reference for the dxdocs.config.ts configuration file.
---

# Configuration

DXDocs is configured via a `dxdocs.config.ts` file in your project root.

## Full Schema

```typescript
export default {
  // Site metadata
  title: 'My Docs',
  description: 'Project docs',
  base: '/',

  // Logo — string path/URL or { light, dark, height } object
  logo: '/logo.svg',
  // logo: { light: '/logo-light.svg', dark: '/logo-dark.svg', height: 32 },

  // Favicon
  favicon: '/favicon.svg',

  // Navigation structure (auto-generated if omitted)
  navigation: [
    {
      type: 'group',
      title: 'Getting Started',
      items: [
        { type: 'page', path: '/', title: 'Introduction' },
        { type: 'page', path: '/installation', title: 'Installation' }
      ]
    }
  ],

  // Links shown in the header
  headerLinks: [
    { label: 'GitHub', href: 'https://github.com/you/repo', icon: 'github' },
    { label: 'API', href: 'https://api.example.com', icon: 'external' }
  ],

  // Coverpage (renders on the index page)
  coverpage: {
    title: 'My Project',
    tagline: 'A short tagline',
    description: 'A longer description of the project.',
    actions: [
      { label: 'Get Started', href: '/install', primary: true },
      { label: 'GitHub', href: 'https://github.com/...' }
    ],
    background: 'gradient'  // 'gradient' | 'solid' | 'none'
  },

  // Footer
  footer: {
    columns: [
      {
        title: 'Docs',
        links: [
          { label: 'Getting Started', href: '/install' },
          { label: 'API Reference', href: '/api' }
        ]
      }
    ],
    copyright: '© 2026 My Project',
    socials: [
      { icon: 'github', href: 'https://github.com/...', label: 'GitHub' }
    ]
  },

  // Theme settings
  theme: {
    preset: 'minimal',         // 'minimal' | 'catppuccin' | 'ayu' | 'nord' | 'gruvbox'
    accentColor: '#6d28d9',    // Override accent color (optional)
    darkMode: 'media',         // 'media' | 'light' | 'dark'
    overrides: {               // Per-token overrides (optional)
      light: { bg: '#fefefe' },
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

## Navigation

### Auto-generated Navigation

If you omit the `navigation` field, DXDocs automatically generates navigation from all discovered pages. Page titles are derived from filenames (kebab-case to Title Case).

### Manual Navigation

For full control, define navigation as an array of groups and pages:

```typescript
navigation: [
  {
    type: 'group',
    title: 'Guide',
    items: [
      { type: 'page', path: '/', title: 'Introduction' },
      { type: 'page', path: '/setup', title: 'Setup' }
    ]
  },
  {
    type: 'group',
    title: 'API',
    items: [
      { type: 'page', path: '/api/core', title: 'Core' },
      { type: 'page', path: '/api/helpers', title: 'Helpers' }
    ]
  }
]
```

Groups can be nested for deeper hierarchies.

## Logo

The `logo` property supports two formats:

```typescript
// Simple — one image for both themes
logo: '/logo.svg'

// Theme-aware — different images for light and dark mode
logo: {
  light: '/logo-light.svg',
  dark: '/logo-dark.svg',
  height: 32  // optional, defaults to 28px
}
```

The logo renders in the header alongside the site title.

## Coverpage

The coverpage renders a full-viewport hero section on the index page only:

```typescript
coverpage: {
  title: 'My Project',
  tagline: 'A concise tagline',
  description: 'A longer description paragraph.',
  actions: [
    { label: 'Get Started', href: '/install', primary: true },
    { label: 'View Source', href: 'https://github.com/...' }
  ],
  background: 'gradient'
}
```

| Background | Description |
|------------|-------------|
| `'gradient'` | Blends from bg to accent-light (default) |
| `'solid'` | Uses the theme background color |
| `'none'` | Transparent background |

## Footer

```typescript
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
    { icon: 'github', href: 'https://github.com/...' },
    { icon: 'twitter', href: 'https://x.com/...' },
    { icon: 'discord', href: 'https://discord.gg/...' }
  ]
}
```

External links in footer columns automatically show an arrow icon.

## File to URL Mapping

DXDocs maps file paths to URLs:

| File Path | URL |
|-----------|-----|
| `docs/index.md` | `/` |
| `docs/setup.md` | `/setup` |
| `docs/guide/intro.md` | `/guide/intro` |
| `docs/guide/index.md` | `/guide` |

## Frontmatter

Each page can include YAML frontmatter:

```markdown
---
title: My Page Title
description: A description for meta tags
---

# Content starts here
```

The `title` field overrides the auto-generated title. The `description` is used in the HTML meta description tag.
