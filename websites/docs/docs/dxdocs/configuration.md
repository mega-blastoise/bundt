---
title: "DXDocs: Configuration"
description: Complete reference for the dxdocs.config.ts configuration file.
---

# Configuration

DXDocs is configured via a `dxdocs.config.ts` file in your project root.

## Full Schema

```typescript
export default {
  // Site title — appears in the header and page titles
  title: 'My Docs',

  // Site description — used in meta tags
  description: 'Documentation for my project',

  // Base path for deployment (default: '/')
  base: '/',

  // Path to logo image (optional)
  logo: '/logo.svg',

  // Path to favicon (optional)
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
    { label: 'GitHub', href: 'https://github.com/...', icon: 'github' },
    { label: 'npm', href: 'https://npmjs.com/...', icon: 'external' }
  ],

  // Theme settings
  theme: {
    accentColor: '#7c3aed',     // Custom accent color (hex)
    darkMode: 'media'           // 'media' | 'light' | 'dark'
  },

  // MDX processing options
  mdx: {
    extensions: ['.md', '.mdx'], // File extensions to process
    gfm: true                    // Enable GitHub Flavored Markdown
  },

  // Output settings
  output: {
    outDir: './dist'             // Build output directory
  }
};
```

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
