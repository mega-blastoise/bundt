# defineDataSource

Creates a validated, frozen data source definition.

## Signature

```tsx
function defineDataSource<TParams, TReturns>(
  definition: DataSourceDefinition<TParams, TReturns>
): DataSourceDefinition<TParams, TReturns>
```

## Parameters

### `definition`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | `string` | Yes | Unique identifier |
| `name` | `string` | Yes | Human-readable name |
| `description` | `string` | No | What this data source provides |
| `tags` | `string[]` | No | Categorization tags |
| `params` | `ZodType` | Yes | Zod schema for input parameters |
| `returns` | `ZodType` | Yes | Zod schema for return type |
| `ttl` | `number` | No | Cache TTL in milliseconds |
| `fetch` | `(params: TParams) => Promise<TReturns>` | Yes | Async fetch function |

## Returns

A frozen `DataSourceDefinition` object.

## Validation

Throws an `Error` if:
- `id` is empty or falsy
- `name` is empty or falsy
- `fetch` is not provided

## Example

```tsx
import { defineDataSource } from '@bundt/prev';
import { z } from 'zod';

export const searchSource = defineDataSource({
  id: 'search',
  name: 'Search API',
  description: 'Full-text search across all entities',
  tags: ['search', 'global'],
  params: z.object({
    query: z.string(),
    type: z.union([z.literal('users'), z.literal('products'), z.literal('orders')]).optional(),
    limit: z.number().default(20)
  }),
  returns: z.object({
    results: z.array(z.object({
      id: z.string(),
      type: z.string(),
      title: z.string(),
      snippet: z.string()
    })),
    total: z.number()
  }),
  ttl: 5000,
  fetch: async (params) => {
    const response = await fetch(`https://api.example.com/search?${new URLSearchParams({
      q: params.query,
      ...(params.type ? { type: params.type } : {}),
      limit: String(params.limit)
    })}`);
    return response.json();
  }
});
```

## Caching

When `ttl` is set, results are cached in SQLite keyed by `sourceId + hash(params)`. Subsequent requests with the same parameters return the cached result until the TTL expires.

```tsx
defineDataSource({
  id: 'categories',
  name: 'Categories',
  params: z.object({}),
  returns: z.array(z.string()),
  ttl: 300000, // 5 minutes
  fetch: async () => ['Electronics', 'Clothing', 'Home']
});
```
