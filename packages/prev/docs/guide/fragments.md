# Defining Fragments

A **Fragment** is a self-contained UI component with typed props, data requirements, and interaction declarations. Fragments are the building blocks of prev workspaces.

## Basic Fragment

```tsx
import { defineFragment } from '@bundt/prev';
import { z } from 'zod';

export const myFragment = defineFragment({
  id: 'my-fragment',
  name: 'My Fragment',
  props: z.object({
    title: z.string()
  }),
  data: {},
  interactions: {},
  render: ({ props }) => (
    <div>
      <h2>{props.title}</h2>
    </div>
  )
});
```

## Fragment Definition Fields

### `id` (required)

A unique string identifier. Used in composition requests to reference this fragment.

### `name` (required)

A human-readable name for display and discovery.

### `description` (optional)

What this fragment does. Used for agent discovery in future phases.

### `tags` (optional)

String array for categorization. Enables filtering via `registry.list({ tags: ['chart'] })`.

### `props` (required)

A Zod schema defining the fragment's input props. These are passed in the composition request and validated at composition time.

```tsx
props: z.object({
  title: z.string(),
  showHeader: z.boolean().optional(),
  maxItems: z.number().default(10)
})
```

### `data` (required)

Declares the data fields this fragment needs. Each key maps to a data source reference:

```tsx
data: {
  users: { source: 'users-api' },
  stats: { source: 'analytics', params: z.object({ range: z.string() }) }
}
```

The `source` string references a registered data source ID. The optional `params` schema defines what parameters this data field expects.

At render time, `data.users` will contain the resolved result from the data source.

### `interactions` (required)

Declares the events this fragment can emit. Each interaction has a typed payload:

```tsx
interactions: {
  selectRow: { payload: z.object({ rowId: z.string() }) },
  filterChange: { payload: z.object({ query: z.string(), field: z.string() }) }
}
```

Interactions can be wired to other fragments via bindings in the composition request.

### `layoutHints` (optional)

Hints for the layout solver:

```tsx
layoutHints: {
  minWidth: '300px',
  minHeight: '200px',
  resizable: true,
  preferredAspectRatio: 1.5
}
```

### `render` (required)

The render function receives a context object with `props`, `data`, and `emit`:

```tsx
render: ({ props, data, emit }) => (
  <div>
    <h2>{props.title}</h2>
    <ul>
      {(data.items as Item[]).map(item => (
        <li key={item.id} onClick={() => emit('selectItem', { id: item.id })}>
          {item.name}
        </li>
      ))}
    </ul>
  </div>
)
```

## Emitting Interactions

There are two ways to emit interactions from a fragment:

### Declarative (Recommended)

Use `data-prev-*` attributes on interactive elements. This works during both SSR and client-side:

```tsx
<button
  data-prev-interaction="selectItem"
  data-prev-payload={JSON.stringify({ id: item.id })}
>
  Select
</button>
```

The client runtime uses event delegation to capture clicks on elements with `data-prev-interaction` and sends them to the server via WebSocket.

### Programmatic

Use the `emit` function from the render context:

```tsx
render: ({ emit }) => (
  <button onClick={() => emit('selectItem', { id: '123' })}>
    Select
  </button>
)
```

**Note:** During SSR, `emit` is a no-op. The declarative approach is preferred because it works without client-side React hydration.

## Frozen Definitions

`defineFragment` returns a frozen object. You cannot modify a fragment definition after creation. This ensures consistency across the registry.

```tsx
const frag = defineFragment({ ... });
frag.id = 'new-id'; // TypeError: Cannot assign to read only property
```
