# defineFragment

Creates a validated, frozen fragment definition.

## Signature

```tsx
function defineFragment<TProps, TData, TInteractions>(
  definition: FragmentDefinition<TProps, TData, TInteractions>
): FragmentDefinition<TProps, TData, TInteractions>
```

## Parameters

### `definition`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | `string` | Yes | Unique identifier |
| `name` | `string` | Yes | Human-readable name |
| `description` | `string` | No | What this fragment does |
| `tags` | `string[]` | No | Categorization tags |
| `props` | `ZodType` | Yes | Zod schema for input props |
| `data` | `Record<string, DataFieldDefinition>` | Yes | Data field declarations |
| `interactions` | `Record<string, InteractionDefinition>` | Yes | Interaction declarations |
| `layoutHints` | `LayoutHints` | No | Layout solver hints |
| `render` | `(ctx: FragmentRenderContext) => ReactNode` | Yes | Render function |

### `DataFieldDefinition`

```typescript
{
  source: string;       // Data source ID to fetch from
  params?: ZodType;     // Optional params schema
}
```

### `InteractionDefinition`

```typescript
{
  payload: ZodType;     // Zod schema for the interaction payload
}
```

### `LayoutHints`

```typescript
{
  minWidth?: string;
  minHeight?: string;
  resizable?: boolean;
  preferredAspectRatio?: number;
}
```

### `FragmentRenderContext`

The render function receives:

```typescript
{
  props: z.infer<TProps>;           // Validated props
  data: { [K in keyof TData]: unknown };  // Resolved data
  emit: (interaction: string, payload: unknown) => void;  // Interaction emitter (no-op during SSR)
}
```

## Returns

A frozen `FragmentDefinition` object. The returned object cannot be modified.

## Validation

Throws an `Error` if:
- `id` is empty or falsy
- `name` is empty or falsy
- `render` is not provided

## Example

```tsx
import { defineFragment } from '@bundt/prev';
import { z } from 'zod';

export const userCard = defineFragment({
  id: 'user-card',
  name: 'User Card',
  description: 'Displays a user profile card',
  tags: ['user', 'profile'],
  props: z.object({
    userId: z.string(),
    compact: z.boolean().optional()
  }),
  data: {
    user: { source: 'users-api' }
  },
  interactions: {
    viewProfile: { payload: z.object({ userId: z.string() }) },
    sendMessage: { payload: z.object({ userId: z.string(), message: z.string() }) }
  },
  layoutHints: {
    minWidth: '250px',
    resizable: true
  },
  render: ({ props, data, emit }) => {
    const user = data.user as { name: string; email: string } | undefined;
    if (!user) return <div>Loading...</div>;

    return (
      <div style={{ padding: '16px', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
        <h3>{user.name}</h3>
        <p>{user.email}</p>
        <button
          data-prev-interaction="viewProfile"
          data-prev-payload={JSON.stringify({ userId: props.userId })}
        >
          View Full Profile
        </button>
      </div>
    );
  }
});
```
