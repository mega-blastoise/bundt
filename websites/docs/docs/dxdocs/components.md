---
title: "DXDocs: Built-in Components"
description: Reference for the built-in MDX components available in DXDocs.
---

# Built-in Components

DXDocs provides several components that are automatically available in all MDX files. No imports needed.

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

A clickable card with a title and description. Use `href` to make it a link.

```mdx
<Card title="Getting Started" href="/getting-started">
  Learn how to set up your project.
</Card>
```

### Props

| Prop | Type | Description |
|------|------|-------------|
| `title` | `string` | Card heading (required) |
| `href` | `string` | Link destination (optional) |
| `icon` | `ReactNode` | Icon element (optional) |
| `children` | `ReactNode` | Card body content |

Internal links (starting with `/`) render as same-page navigation. External links open in a new tab.

## CardGrid

Arranges multiple `Card` components in a responsive grid.

```mdx
<CardGrid>
  <Card title="Card A" href="/a">Description A</Card>
  <Card title="Card B" href="/b">Description B</Card>
  <Card title="Card C" href="/c">Description C</Card>
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
