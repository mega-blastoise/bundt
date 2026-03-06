# Interactions & Bindings

Interactions let fragments communicate with each other. A fragment declares what interactions it can emit, and **bindings** in the composition request wire those interactions to other fragments' props or data parameters.

## Declaring Interactions

Interactions are declared in the fragment definition with typed payloads:

```tsx
const productList = defineFragment({
  id: 'product-list',
  name: 'Product List',
  props: z.object({}),
  data: { products: { source: 'products' } },
  interactions: {
    selectProduct: { payload: z.object({ productId: z.string() }) },
    filterChange: { payload: z.object({ category: z.string() }) }
  },
  render: ({ data }) => (
    <ul>
      {(data.products as any[]).map(p => (
        <li
          key={p.id}
          data-prev-interaction="selectProduct"
          data-prev-payload={JSON.stringify({ productId: p.id })}
        >
          {p.name}
        </li>
      ))}
    </ul>
  )
});
```

## Emitting Interactions

### Data Attributes (Recommended)

Add `data-prev-interaction` and `data-prev-payload` to clickable elements:

```tsx
<button
  data-prev-interaction="selectProduct"
  data-prev-payload={JSON.stringify({ productId: '123' })}
>
  View Details
</button>
```

The client runtime captures clicks via event delegation and sends them to the server over WebSocket.

### Programmatic

Use the `emit` function from the render context:

```tsx
render: ({ emit }) => (
  <button onClick={() => emit('selectProduct', { productId: '123' })}>
    View Details
  </button>
)
```

The data attribute approach is preferred because it works without client-side React and survives partial DOM updates.

## Defining Bindings

Bindings wire a source fragment's interaction to a target fragment's prop or data parameter. They are defined in the composition request:

```json
{
  "fragments": [
    { "fragmentId": "product-list", ... },
    { "fragmentId": "product-detail", ... }
  ],
  "bindings": [
    {
      "id": "list-select-to-detail",
      "sourceFragmentInstanceId": "<instance-id-of-product-list>",
      "sourceInteraction": "selectProduct",
      "targetFragmentInstanceId": "<instance-id-of-product-detail>",
      "targetType": "dataParam",
      "targetKey": "detail",
      "transform": "productId"
    }
  ]
}
```

### Binding Fields

| Field | Description |
|-------|-------------|
| `id` | Unique binding identifier |
| `sourceFragmentInstanceId` | Instance ID of the emitting fragment |
| `sourceInteraction` | Interaction name on the source |
| `targetFragmentInstanceId` | Instance ID of the receiving fragment |
| `targetType` | `"prop"` (update a prop) or `"dataParam"` (re-fetch data) |
| `targetKey` | The prop name or data key to update |
| `transform` | Dot-path into the interaction payload to extract the value |

### Binding Types

**Prop binding** (`targetType: "prop"`): Updates a target fragment's prop directly. The target fragment is re-rendered with the new prop value.

**Data param binding** (`targetType: "dataParam"`): Triggers a re-fetch of the target fragment's data source with new parameters derived from the interaction payload. The target fragment is re-rendered with fresh data.

## Interaction Flow

When a user triggers an interaction:

```
1. User clicks element with data-prev-interaction="selectProduct"
2. Client glue captures click, extracts payload from data-prev-payload
3. WebSocket sends: { type: "interaction", interaction: "selectProduct", payload: { productId: "5" } }
4. Server finds bindings where source matches this interaction
5. For each affected binding:
   a. If prop binding: update target's prop, re-render
   b. If dataParam binding: re-fetch target's data source with new params, re-render
6. Server sends partial update: { type: "fragment-update", html: "<new HTML>", data: {...} }
7. Client replaces target fragment's DOM content
```

## Transform Paths

The `transform` field extracts a value from the interaction payload using a dot path:

```
Payload: { productId: "5", metadata: { source: "search" } }
Transform: "productId"        → "5"
Transform: "metadata.source"  → "search"
```

If no transform is specified, the entire payload object is passed to the target.
