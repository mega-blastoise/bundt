---
title: "DXDocs: Theming"
description: Customize the look and feel of your DXDocs site with theme tokens and accent colors.
---

# Theming

DXDocs uses CSS custom properties for theming. You can customize the accent color and dark mode behavior through the configuration file.

## Accent Color

Set a custom accent color in your config:

```typescript
export default {
  theme: {
    accentColor: '#7c3aed'
  }
};
```

The accent color is applied to links, active navigation items, and interactive elements. DXDocs automatically generates appropriate light and dark variants.

## Dark Mode

Three modes are available:

| Mode | Behavior |
|------|----------|
| `'media'` | Follows system preference via `prefers-color-scheme` (default) |
| `'light'` | Always light theme |
| `'dark'` | Always dark theme |

```typescript
export default {
  theme: {
    darkMode: 'dark'
  }
};
```

## CSS Custom Properties

DXDocs generates the following CSS custom properties that you can reference in custom styles:

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
| `--void-font-sans` | `'Fira Sans', -apple-system, sans-serif` |
| `--void-font-mono` | `'JetBrains Mono', ui-monospace, monospace` |

## Font Loading

DXDocs loads Fira Sans and JetBrains Mono from Google Fonts. Font weights included:

- **Fira Sans**: 400 (regular), 500 (medium), 600 (semibold), 700 (bold)
- **JetBrains Mono**: 400 (regular), 500 (medium)
