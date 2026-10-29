---
title: "DXDocs: Built-in Components"
description: Reference for the built-in MDX components available in DXDocs.
---

# Built-in Components

DXDocs provides several components that are automatically available in all MDX files. No imports needed.

## Icon

Renders a lucide icon by name. Over 70 icons are available.

```mdx
<Icon name="terminal" />
<Icon name="zap" size={24} color="#6d28d9" />
```

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `name` | `string` | — | Icon name (required) |
| `size` | `number` | `18` | Icon size in pixels |
| `color` | `string` | — | CSS color override |

### Available Icons

`alert-circle`, `alert-triangle`, `arrow-right`, `arrow-up-right`, `book`, `book-open`, `box`, `braces`, `check`, `chevron-right`, `circle`, `cloud`, `code`, `cog`, `command`, `copy`, `database`, `download`, `external-link`, `eye`, `file`, `file-code`, `file-text`, `folder`, `folder-open`, `gauge`, `github`, `globe`, `hash`, `heart`, `help-circle`, `home`, `image`, `info`, `key`, `laptop`, `layers`, `layout`, `library`, `lightbulb`, `link`, `list`, `lock`, `mail`, `map`, `message-square`, `monitor`, `moon`, `package`, `paintbrush`, `palette`, `pencil`, `play`, `plug`, `plus`, `puzzle`, `rocket`, `search`, `send`, `server`, `settings`, `shield`, `sparkles`, `star`, `sun`, `terminal`, `trash`, `upload`, `user`, `wand`, `wrench`, `zap`

## Callout

Highlighted blocks for tips, warnings, errors, and informational notes.

```mdx
<Callout variant="info">
  This is an informational callout.
</Callout>

<Callout variant="tip">
  A helpful tip for the reader.
</Callout>

<Callout variant="warning">
  Something to be careful about.
</Callout>

<Callout variant="error">
  A critical warning or known issue.
</Callout>
```

### Variants

| Variant | Icon | Use Case |
|---------|------|----------|
| `info` | Info circle | General information |
| `tip` | Lightbulb | Helpful suggestions |
| `warning` | Triangle | Caution or gotchas |
| `error` | Circle X | Critical issues |

## Card

A clickable card with a title, optional icon, and description. Use `href` to make it a link.

```mdx
<Card title="Getting Started" icon="rocket" href="/getting-started">
  Learn how to set up your project.
</Card>
```

### Props

| Prop | Type | Description |
|------|------|-------------|
| `title` | `string` | Card heading (required) |
| `href` | `string` | Link destination (optional) |
| `icon` | `string` | Lucide icon name (optional) |
| `children` | `ReactNode` | Card body content |

The `icon` prop accepts any icon name from the [available icons list](#available-icons). Internal links (starting with `/`) render as same-page navigation. External links open in a new tab.

## CardGrid

Arranges multiple `Card` components in a responsive grid.

```mdx
<CardGrid>
  <Card title="Card A" icon="code" href="/a">Description A</Card>
  <Card title="Card B" icon="database" href="/b">Description B</Card>
  <Card title="Card C" icon="globe" href="/c">Description C</Card>
</CardGrid>
```

## Steps

An ordered list of steps with titles.

```mdx
<Steps>
  <Step title="Install the package">
    Run `bun add @bundt/dxdocs` in your terminal.
  </Step>
  <Step title="Create configuration">
    Add a `dxdocs.config.ts` file to your project root.
  </Step>
  <Step title="Write your docs">
    Create `.md` or `.mdx` files in the `docs/` directory.
  </Step>
</Steps>
```

### Step Props

| Prop | Type | Description |
|------|------|-------------|
| `title` | `string` | Step heading (required) |
| `children` | `ReactNode` | Step content |
