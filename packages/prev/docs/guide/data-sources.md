# Data Sources

A **Data Source** is a server-side data fetcher with typed params and returns. Data sources are registered with the server and referenced by fragments in their `data` declarations.

## Defining a Data Source

```tsx
import { defineDataSource } from '@bundt/prev';
import { z } from 'zod';

export const usersSource = defineDataSource({
  id: 'users',
  name: 'Users API',
  params: z.object({
    limit: z.number().optional(),
    offset: z.number().optional(),
    search: z.string().optional()
  }),
  returns: z.array(z.object({
    id: z.string(),
    name: z.string(),
    email: z.string()
  })),
  fetch: async (params) => {
    const res = await fetch(`https://api.example.com/users?${new URLSearchParams({
      limit: String(params.limit ?? 20),
      offset: String(params.offset ?? 0),
      ...(params.search ? { q: params.search } : {})
    })}`);
    return res.json();
  }
});
```

## Definition Fields

### `id` (required)

Unique string identifier. Referenced by fragments in their `data` declarations and by composition requests.

### `name` (required)

Human-readable name.

### `params` (required)

Zod schema defining the input parameters. These are provided in the composition request:

```json
{
  "data": {
    "users": { "source": "users", "params": { "limit": 10, "search": "alice" } }
  }
}
```

### `returns` (required)

Zod schema defining the return type. Currently used for documentation and future validation.

### `ttl` (optional)

Cache time-to-live in milliseconds. When set, results are cached in SQLite keyed by source ID + parameter hash:

```tsx
ttl: 30000  // Cache for 30 seconds
```

### `fetch` (required)

Async function that receives validated params and returns data:

```tsx
fetch: async (params) => {
  // Fetch from database, API, file system, etc.
  return result;
}
```

## Data Fetch Execution

When a composition request is processed, the data binder:

1. Inspects each fragment's data bindings in the composition
2. Builds a **fetch plan** with dependency ordering
3. Runs independent fetches in **parallel** via `Promise.all`
4. Runs dependent fetches after their dependencies resolve
5. Returns a map of `fragmentInstanceId -> { dataKey: result }`

The resolved data is passed to each fragment's `render` function via `context.data`.

## Common Patterns

### Database Query

```tsx
const ordersSource = defineDataSource({
  id: 'orders',
  name: 'Orders',
  params: z.object({ customerId: z.string() }),
  returns: z.array(z.object({ id: z.string(), total: z.number() })),
  fetch: async (params) => {
    const db = getDatabase();
    return db.query('SELECT id, total FROM orders WHERE customer_id = ?')
      .all(params.customerId);
  }
});
```

### Aggregation

```tsx
const dashboardMetrics = defineDataSource({
  id: 'dashboard-metrics',
  name: 'Dashboard Metrics',
  params: z.object({ range: z.string().default('7d') }),
  returns: z.object({
    revenue: z.number(),
    orders: z.number(),
    customers: z.number()
  }),
  ttl: 60000,
  fetch: async (params) => {
    const [revenue, orders, customers] = await Promise.all([
      fetchRevenue(params.range),
      fetchOrderCount(params.range),
      fetchCustomerCount(params.range)
    ]);
    return { revenue, orders, customers };
  }
});
```

### Static Data

```tsx
const categoriesSource = defineDataSource({
  id: 'categories',
  name: 'Product Categories',
  params: z.object({}),
  returns: z.array(z.object({ id: z.string(), label: z.string() })),
  ttl: 300000, // 5 minutes
  fetch: async () => [
    { id: 'electronics', label: 'Electronics' },
    { id: 'clothing', label: 'Clothing' },
    { id: 'home', label: 'Home & Garden' }
  ]
});
```
