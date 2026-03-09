---
title: "DXDocs: Writing Content"
description: Guide to writing documentation pages with Markdown and MDX.
---

# Writing Content

DXDocs supports standard Markdown, GitHub Flavored Markdown (GFM), and MDX.

## Markdown Basics

All standard Markdown syntax works:

```markdown
# Heading 1
## Heading 2
### Heading 3

**Bold text** and *italic text*

- Unordered list
- Another item

1. Ordered list
2. Another item

[Link text](https://example.com)

![Alt text](/image.png)
```

## GitHub Flavored Markdown

GFM is enabled by default. This adds:

### Tables

```markdown
| Feature | Status |
|---------|--------|
| Tables  | Yes    |
| Autolinks | Yes |
```

### Task Lists

```markdown
- [x] Completed task
- [ ] Pending task
```

### Strikethrough

```markdown
~~deleted text~~
```

## Code Blocks

Fenced code blocks are highlighted with Shiki. Specify the language after the opening backticks:

````markdown
```typescript
function greet(name: string): string {
  return `Hello, ${name}!`;
}
```
````

### Supported Languages

TypeScript, JavaScript, TSX, JSX, Bash, JSON, HTML, CSS, YAML, Markdown, and Rust are loaded by default.

## MDX

MDX lets you use JSX components inside your Markdown. DXDocs provides several [built-in components](/dxdocs/components) that you can use without importing:

```mdx
<Callout variant="tip">
  This is a tip callout.
</Callout>

<CardGrid>
  <Card title="Feature A" href="/features/a">
    Description of feature A.
  </Card>
  <Card title="Feature B" href="/features/b">
    Description of feature B.
  </Card>
</CardGrid>
```

## Headings and Table of Contents

H2 (`##`) and H3 (`###`) headings automatically generate a table of contents in the right sidebar. Heading IDs are derived from the text (slugified).

The active heading is highlighted as you scroll, using an IntersectionObserver.

## Frontmatter

Use YAML frontmatter at the top of each file:

```markdown
---
title: Page Title
description: Page description for meta tags
---
```

Both fields are optional. If `title` is omitted, the filename is used (converted from kebab-case to Title Case).
