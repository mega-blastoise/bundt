# Layout System

prev uses CSS Grid to arrange fragments in a workspace. The layout solver takes a list of fragment instances and produces a `LayoutDefinition` with grid positions for each fragment.

## Layout Types

### `single`

One fragment occupying the full viewport.

```
┌────────────────────────────────┐
│                                │
│         Fragment A             │
│                                │
└────────────────────────────────┘
```

Auto-selected when there is 1 fragment.

### `split-horizontal`

Two or more fragments side by side with equal width.

```
┌───────────────┬────────────────┐
│               │                │
│  Fragment A   │   Fragment B   │
│               │                │
└───────────────┴────────────────┘
```

Auto-selected when there are 2 fragments.

### `split-vertical`

Two or more fragments stacked vertically with equal height.

```
┌────────────────────────────────┐
│          Fragment A            │
├────────────────────────────────┤
│          Fragment B            │
└────────────────────────────────┘
```

### `grid`

Auto-grid with `ceil(sqrt(n))` columns. Fragments fill cells left-to-right, top-to-bottom.

```
┌───────────────┬────────────────┐
│  Fragment A   │   Fragment B   │
├───────────────┼────────────────┤
│  Fragment C   │   Fragment D   │
└───────────────┴────────────────┘
```

### `primary-detail`

First fragment gets 2/3 width. Remaining fragments share 1/3 in a column.

```
┌──────────────────────┬─────────┐
│                      │ Frag B  │
│    Fragment A        ├─────────┤
│    (primary)         │ Frag C  │
│                      │         │
└──────────────────────┴─────────┘
```

Auto-selected when there are 3 fragments.

### `dashboard`

3-column grid. Fragments fill slots in order.

```
┌──────────┬──────────┬──────────┐
│  Frag A  │  Frag B  │  Frag C  │
├──────────┼──────────┼──────────┤
│  Frag D  │  Frag E  │  Frag F  │
└──────────┴──────────┴──────────┘
```

Auto-selected when there are 4+ fragments.

## Auto-Selection

If no `layout` field is specified in the composition request, prev auto-selects:

| Fragment Count | Layout |
|---------------|--------|
| 1 | `single` |
| 2 | `split-horizontal` |
| 3 | `primary-detail` |
| 4+ | `dashboard` |

## Explicit Positions

You can override auto-positioning by specifying `position` on individual fragments:

```json
{
  "fragments": [
    {
      "fragmentId": "chart",
      "position": { "row": 1, "col": 1, "rowSpan": 2, "colSpan": 2 }
    },
    {
      "fragmentId": "sidebar",
      "position": { "row": 1, "col": 3, "rowSpan": 1, "colSpan": 1 }
    }
  ]
}
```

## Generated CSS

The layout solver produces a `LayoutDefinition` that the SSR engine converts to inline CSS:

```css
#prev-workspace {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-template-rows: repeat(2, 1fr);
  gap: 8px;
  padding: 8px;
  width: 100%;
  height: 100vh;
}
```

Each fragment container gets a `grid-area` style:

```html
<div data-prev-fragment="inst-1" style="grid-area: 1 / 1 / 3 / 3">
  <!-- fragment content -->
</div>
```
