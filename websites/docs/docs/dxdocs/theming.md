---
title: "DXDocs: Theming"
description: Customize the look and feel of your DXDocs site with theme presets, accent colors, and CSS custom properties.
---

# Theming

DXDocs uses CSS custom properties for theming. Choose from 5 built-in presets, customize the accent color, and override individual tokens.

## Theme Presets

Set a preset in your config:

```typescript
export default {
  theme: {
    preset: 'minimal',
    darkMode: 'dark'
  }
};
```

### Available Presets

| Preset | Description | Accent (Light) | Accent (Dark) |
|--------|-------------|-----------------|----------------|
| `minimal` | Mintlify-inspired black/gray/white with purple accent | `#6d28d9` | `#a78bfa` |
| `catppuccin` | Latte (light) / Mocha (dark) — pastel palette | `#8839ef` | `#cba6f7` |
| `ayu` | Ayu Light / Dark (Mirage) — warm amber tones | `#f2ae49` | `#e6b450` |
| `nord` | Snow Storm (light) / Polar Night (dark) — frost blues | `#5e81ac` | `#88c0d0` |
| `gruvbox` | Gruvbox Light / Dark — retro warm palette | `#d65d0e` | `#fe8019` |

Each preset includes a complete set of light and dark tokens — background, text, border, callout, card, and accent colors.

## Accent Color Override

Override the preset's accent color:

```typescript
export default {
  theme: {
    preset: 'minimal',
    accentColor: '#059669'
  }
};
```

The accent color is applied to links, active navigation items, sidebar highlights, prev/next titles, card hover borders, and the header gradient.

## Dark Mode

Three modes are available:

| Mode | Behavior |
|------|----------|
| `'media'` | Follows system preference via `prefers-color-scheme` (default) |
| `'light'` | Always light theme |
| `'dark'` | Always dark theme |

## Token Overrides

Override individual tokens per variant:

```typescript
export default {
  theme: {
    preset: 'minimal',
    darkMode: 'dark',
    overrides: {
      dark: {
        bg: '#0a0a0f',
        bgSidebar: '#0a0a0f'
      }
    }
  }
};
```

All token names correspond to the `ThemeTokens` type — `bg`, `bgSecondary`, `bgTertiary`, `bgCode`, `bgSidebar`, `bgHover`, `bgActive`, `text`, `textSecondary`, `textTertiary`, `textLink`, `textCode`, `textActive`, `border`, `borderActive`, `accent`, `accentLight`, and all callout variants.

## CSS Custom Properties

DXDocs generates CSS custom properties prefixed with `--void-` that you can reference in custom styles:

### Colors

| Variable | Description |
|----------|-------------|
| `--void-bg` | Primary background |
| `--void-bg-secondary` | Secondary background |
| `--void-bg-tertiary` | Tertiary background |
| `--void-bg-code` | Code block background |
| `--void-bg-sidebar` | Sidebar background |
| `--void-text` | Primary text color |
| `--void-text-secondary` | Secondary text color |
| `--void-text-link` | Link color |
| `--void-accent` | Accent color |
| `--void-accent-light` | Light accent (used for active backgrounds) |

### Layout

| Variable | Default | Description |
|----------|---------|-------------|
| `--void-sidebar-width` | `260px` | Left sidebar width |
| `--void-toc-width` | `220px` | Right table of contents width |
| `--void-header-height` | `60px` | Header height |
| `--void-content-max-width` | `740px` | Max content width |
| `--void-radius` | `8px` | Default border radius |
| `--void-radius-lg` | `12px` | Large border radius |

### Typography

| Variable | Default |
|----------|---------|
| `--void-font-sans` | `'DM Sans', -apple-system, sans-serif` |
| `--void-font-mono` | `'JetBrains Mono', ui-monospace, monospace` |

## Font Loading

DXDocs loads DM Sans and JetBrains Mono from Google Fonts. Font weights included:

- **DM Sans**: 400 (regular), 500 (medium), 600 (semibold), 700 (bold)
- **JetBrains Mono**: 400 (regular), 500 (medium)
