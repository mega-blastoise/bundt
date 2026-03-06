# prev — Agent-Native Dynamic UI Framework

## Overview

`@bundt/prev` is a React SSR framework for building agent-native web applications. It replaces static component trees with **dynamic, server-composed UIs** driven by AI agent intents. The server maintains a registry of **Fragments** (self-contained UI micro-applications) and **Data Sources**, composes them into **Frames** on demand, streams them via React SSR, and generates minimal hydration bundles for client-side interactivity.

The name is a direct response to the "Next" generation of web frameworks. Next.js was built for Web 2/3. `prev` is built for the AI-native web, where the UI itself is a response — composed, arranged, and data-bound by an agent in real time.

### Core Thesis

Static UI composition is a Web 2/3 artifact. In agent-driven workflows, users pivot between tasks fluidly — the UI must pivot with them. Instead of navigating between pre-built pages, the agent composes purpose-built workspaces from a pool of registered components and data sources, rendered on the server and streamed to the client.

### Architecture at a Glance

```
+---------------------------------------------------------------+
|                        prev server                            |
|                                                               |
|  +---------------+  +---------------+  +-------------------+  |
|  | Fragment      |  | Data Source   |  | Composition       |  |
|  | Registry      |  | Registry      |  | Engine            |  |
|  |               |  |               |  |                   |  |
|  | 1P fragments  |  | DB, API,      |  | Intent Resolution |  |
|  | 3P fragments  |  | file, stream  |  | Layout Solver     |  |
|  | manifests     |  | schemas       |  | Data Binding      |  |
|  +-------+-------+  +-------+-------+  | SSR + Streaming   |  |
|          |                   |          +--------+----------+  |
|  +-------+-------------------+-------------------+----------+  |
|  |                    MCP Tool Server                        |  |
|  |  compose_frame / mutate_frame / list_fragments / ...      |  |
|  +----------------------------+-----------------------------+  |
|                               |                               |
|  +----------------------------+-----------------------------+  |
|  |              Session Store (bun:sqlite)                   |  |
|  +----------------------------------------------------------+  |
+-------------------------------+-------------------------------+
                                |
                  +-------------+-------------+
                  |       Browser Client       |
                  |                            |
                  |  +-----------+ +---------+ |
                  |  | Workspace | | Agent   | |
                  |  | (hydrated | | Chat    | |
                  |  |  fragments| | Panel   | |
                  |  |  80-90%)  | | 10-20%) | |
                  |  +-----------+ +---------+ |
                  |                            |
                  |  prev client runtime       |
                  |  (hydration, layout,       |
                  |   fragment messaging,      |
                  |   reactive bindings)       |
                  +----------------------------+
```

---

## Design Decisions

| Decision | Resolution | Rationale |
|----------|-----------|-----------|
| Package name | `@bundt/prev` | Short, memorable, antonym of "next" |
| Location | `packages/prev` | Library/framework, not a deployable app |
| Component model | Microfrontend Fragments | Self-contained, independently distributable UI units |
| Composition granularity | Fine-grained JSX AST | Agent intents resolve to fragment trees via server |
| Agent protocol | MCP tools | Capability negotiation; agent discovers what server can render |
| Hydration strategy | Pre-built fragment bundles + dynamic composition glue | Static chunks cached; thin per-frame glue generated on demand |
| SSR | Streaming with per-fragment Suspense | Progressive rendering; fast fragments don't wait for slow data |
| State ownership | Server-owned, SQLite-persisted | Survives page reloads, browser restarts, session resumption |
| Fragment isolation (v1) | Shared React tree | Single `renderToReadableStream` call; simpler, faster |
| Fragment isolation (v2) | Independent render + stitch | True microfrontend isolation; fault-tolerant |
| 3P fragments | First-class, npm-distributed | Fragment ecosystem from day one |
| Data subscriptions | Reactive via signals/rxjs | Real-time data updates push to fragments |
| Inter-fragment comm | Declarative data bindings | Bindings declared in Frame composition, wired by runtime |
| Chat panel | Built into prev, heavily extensible | Ships with agent chat; theming and integration hooks for customization |
| Validation | Zod 4 | Props schemas, data source schemas, interaction schemas |

---

## Core Concepts

### Fragment

A Fragment is the atomic unit of UI composition. It is a self-contained micro-application with:

- **A server render function** — produces HTML via React SSR
- **A client hydration bundle** — makes the rendered HTML interactive
- **A props schema** — Zod-validated, declares what the fragment accepts
- **Data bindings** — declares what data sources it needs and their schemas
- **An interaction schema** — declares what user actions it emits (clicks, selections, form submissions)
- **Layout hints** — preferred size, min/max constraints, resize behavior

Fragments are registered with the server at startup (1P) or loaded from npm packages (3P). Each fragment is versioned, independently buildable, and has a declared contract that the composition engine validates at assembly time.

```typescript
import { defineFragment } from '@bundt/prev';
import { z } from 'zod';

export const SalesChart = defineFragment({
  id: 'sales-chart',
  version: '1.0.0',

  props: z.object({
    metric: z.union([z.literal('revenue'), z.literal('units'), z.literal('margin')]),
    period: z.union([z.literal('day'), z.literal('week'), z.literal('month'), z.literal('quarter')]),
    groupBy: z.string().optional(),
  }),

  data: {
    series: {
      source: z.string(),
      params: z.object({
        metric: z.string(),
        period: z.string(),
        groupBy: z.string().optional(),
      }),
    },
  },

  interactions: {
    pointSelect: {
      payload: z.object({
        timestamp: z.string(),
        value: z.number(),
        group: z.string().optional(),
      }),
    },
    regionZoom: {
      payload: z.object({
        start: z.string(),
        end: z.string(),
      }),
    },
  },

  layout: {
    minWidth: 400,
    minHeight: 300,
    resizable: true,
    preferredAspectRatio: 16 / 9,
  },

  // Inline render function
  render: ({ props, data, emit }) => (
    <ChartContainer metric={props.metric} period={props.period}>
      <TimeSeriesChart
        data={data.series}
        onPointClick={(point) => emit('pointSelect', {
          timestamp: point.x,
          value: point.y,
          group: point.group,
        })}
        onBrushEnd={(range) => emit('regionZoom', {
          start: range.start,
          end: range.end,
        })}
      />
    </ChartContainer>
  ),
});
```

#### Fragment render from external component

For teams with existing component libraries, `render` can reference an external component module:

```typescript
import { defineFragment } from '@bundt/prev';
import { z } from 'zod';
import { DataTableView } from './components/DataTableView';

export const DataTable = defineFragment({
  id: 'data-table',
  version: '1.0.0',

  props: z.object({
    columns: z.array(z.object({
      key: z.string(),
      label: z.string(),
      sortable: z.boolean().default(true),
      width: z.number().optional(),
    })),
    filterable: z.boolean().default(true),
    pageSize: z.number().default(50),
  }),

  data: {
    rows: {
      source: z.string(),
      params: z.record(z.unknown()),
    },
  },

  interactions: {
    rowSelect: {
      payload: z.object({ rowId: z.string() }),
    },
    filterChange: {
      payload: z.object({ filters: z.record(z.string()) }),
    },
    sort: {
      payload: z.object({ column: z.string(), direction: z.union([z.literal('asc'), z.literal('desc')]) }),
    },
  },

  layout: {
    minWidth: 600,
    minHeight: 400,
    resizable: true,
  },

  // Reference to external component — prev wraps it with data/emit bindings
  render: DataTableView,
});
```

When `render` is a component reference rather than an inline function, prev wraps it with the same `{ props, data, emit }` injection. The component receives these as props:

```typescript
// components/DataTableView.tsx
import type { FragmentRenderProps } from '@bundt/prev';

export const DataTableView = ({ props, data, emit }: FragmentRenderProps<typeof DataTable>) => {
  // existing component code, now with typed props/data/emit
};
```

### Frame

A Frame is a complete workspace composition — an arrangement of Fragments with data bindings between them. The Frame is the unit that gets streamed to the client.

```typescript
interface Frame {
  id: string;
  sessionId: string;
  layout: LayoutDefinition;
  fragments: FragmentInstance[];
  bindings: DataBinding[];
  createdAt: number;
  intent?: string; // The original agent intent that produced this frame
}

interface FragmentInstance {
  instanceId: string;          // Unique per-instance (same fragment type can appear multiple times)
  fragmentId: string;          // References registered fragment definition
  props: Record<string, unknown>;
  dataBindings: Record<string, DataSourceBinding>;
  position: LayoutPosition;
  size: LayoutSize;
}

interface DataBinding {
  source: {
    fragmentInstanceId: string;
    interaction: string;        // e.g., 'rowSelect'
    field: string;              // e.g., 'payload.rowId'
  };
  target: {
    fragmentInstanceId: string;
    prop?: string;              // Bind to a prop
    dataParam?: string;         // Bind to a data source parameter
  };
  transform?: string;           // Optional transform expression
}
```

A Frame is:
- **Serializable** — JSON representation, persistable to SQLite
- **Diffable** — frame mutations produce diffs, enabling incremental updates
- **Inspectable** — the agent can read back the current frame to reason about state
- **Navigable** — frame history enables back/forward workspace navigation

### Data Source

A Data Source is a registered provider of data that fragments can bind to. Data sources declare their schema (what parameters they accept, what shape they return) and provide both fetch (one-shot) and optionally subscribe (real-time) methods.

```typescript
import { defineDataSource } from '@bundt/prev';
import { z } from 'zod';

export const salesByRegion = defineDataSource({
  id: 'sales-by-region',
  version: '1.0.0',

  params: z.object({
    period: z.union([z.literal('day'), z.literal('week'), z.literal('month')]),
    region: z.string().optional(),
    metric: z.union([z.literal('revenue'), z.literal('units')]).default('revenue'),
  }),

  returns: z.object({
    series: z.array(z.object({
      timestamp: z.string(),
      value: z.number(),
      region: z.string(),
    })),
    summary: z.object({
      total: z.number(),
      average: z.number(),
      trend: z.union([z.literal('up'), z.literal('down'), z.literal('flat')]),
    }),
  }),

  // One-shot fetch
  fetch: async ({ params, context }) => {
    const rows = await db.query(
      'SELECT * FROM sales WHERE period = ? AND (region = ? OR ? IS NULL)',
      [params.period, params.region, params.region]
    );
    return transformToSeries(rows);
  },

  // Optional: real-time subscription
  subscribe: ({ params, context, emit }) => {
    const channel = pubsub.subscribe(`sales:${params.period}`);
    channel.on('update', (data) => {
      emit(transformToSeries(data));
    });
    return () => channel.unsubscribe();
  },
});
```

#### Data Source Registry

The server maintains a registry of all available data sources:

```typescript
const server = createPrevServer({
  dataSources: [
    salesByRegion,
    salesRecords,
    customerDetails,
    inventoryLevels,
    // 3P data sources loaded from packages
    ...loadThirdPartyDataSources(),
  ],
});
```

Data sources are discoverable via MCP — the agent can query what data is available, what parameters each source accepts, and what shape the data takes. This enables the agent to make informed composition decisions.

### Session

A Session represents a single user's workspace over time. Sessions are server-owned and persisted to SQLite.

```typescript
interface Session {
  id: string;
  agentId: string;             // Which agent/MCP connection owns this session
  currentFrameId: string;
  frameHistory: string[];      // Ordered list of frame IDs for back/forward
  historyIndex: number;
  metadata: Record<string, unknown>;
  createdAt: number;
  lastActiveAt: number;
}
```

Session persistence means:
- User closes browser, returns tomorrow — workspace is restored exactly
- Agent can query session history to understand user's workflow trajectory
- Frame history enables undo/redo of workspace compositions
- Session metadata can store user preferences, agent conversation context, etc.

---

## Composition Engine

The Composition Engine is the core of prev. It receives agent intents, resolves them against the fragment and data source registries, and produces Frames.

### Intent Resolution

The agent communicates via MCP tools (see MCP Protocol section). The primary flow:

```
Agent sends intent
  -> Composition Engine receives intent + context
  -> Intent Resolver maps intent to fragment selection
  -> Layout Solver arranges fragments
  -> Data Binder connects fragments to data sources
  -> Binding Resolver wires inter-fragment interactions
  -> Frame is produced
  -> SSR streams the Frame to the client
  -> Hydration bundles are shipped
```

#### Intent Resolver

The Intent Resolver maps high-level agent intents to concrete fragment compositions. It operates in two modes:

**Structured mode** — the agent provides explicit fragment references and arrangement:

```json
{
  "type": "structured",
  "fragments": [
    {
      "fragmentId": "sales-chart",
      "props": { "metric": "revenue", "period": "month" },
      "data": { "series": { "source": "sales-by-region" } }
    },
    {
      "fragmentId": "data-table",
      "props": { "columns": [...], "filterable": true },
      "data": { "rows": { "source": "sales-records" } }
    }
  ],
  "bindings": [
    {
      "source": { "fragment": 0, "interaction": "pointSelect", "field": "payload.group" },
      "target": { "fragment": 1, "dataParam": "rows.params.region" }
    }
  ],
  "layout": "split-horizontal"
}
```

**Intent mode** — the agent provides a natural language intent with optional constraints:

```json
{
  "type": "intent",
  "description": "Show sales performance by region with ability to drill into individual transactions",
  "constraints": {
    "dataSources": ["sales-by-region", "sales-records"],
    "preferredFragments": ["sales-chart", "data-table"],
    "interactivity": "high"
  }
}
```

In intent mode, the server uses its knowledge of registered fragments and data sources to produce the best composition. This is a deterministic resolution — the server matches intent keywords, data source compatibility, and fragment capability declarations. It does NOT require an LLM on the server side (though a future version could optionally use one).

The v1 intent resolver uses a scoring algorithm:
1. Parse intent for keywords and entity references
2. Score each registered fragment by relevance (keyword match, data source compatibility, interaction richness)
3. Select top-N fragments that satisfy the intent
4. Determine layout based on fragment count and layout hints
5. Auto-generate data bindings based on compatible interaction/data schemas

#### Layout Solver

The Layout Solver arranges fragments within the workspace area. It respects fragment layout hints (min/max sizes, preferred aspect ratios) and produces a grid-based layout.

**Layout types:**

```typescript
type LayoutType =
  | 'single'             // One fragment fills the workspace
  | 'split-horizontal'   // Two fragments side by side
  | 'split-vertical'     // Two fragments stacked
  | 'grid'               // N fragments in auto-arranged grid
  | 'primary-detail'     // Large primary fragment + smaller detail panel
  | 'dashboard'          // Multiple fragments in a dashboard arrangement
  | 'custom';            // Explicit positions provided by agent

interface LayoutDefinition {
  type: LayoutType;
  gap: number;
  padding: number;
  areas?: LayoutArea[];   // For custom layouts
}

interface LayoutPosition {
  row: number;
  col: number;
  rowSpan: number;
  colSpan: number;
}

interface LayoutSize {
  width: string;         // CSS value or 'auto'
  height: string;
  minWidth?: number;
  minHeight?: number;
  maxWidth?: number;
  maxHeight?: number;
}
```

The Layout Solver chooses a layout type based on:
- Number of fragments in the composition
- Fragment layout hints
- Agent-specified layout preference (if any)
- Available viewport dimensions (communicated by client)

#### Data Binder

The Data Binder resolves fragment data bindings to concrete data source invocations. When a frame is composed:

1. Each fragment declares its data requirements (the `data` field in the fragment definition)
2. The composition specifies which data source fulfills each requirement
3. The Data Binder validates that the data source's `returns` schema satisfies the fragment's expected data shape
4. The Data Binder produces a `DataFetchPlan` — an ordered set of data source invocations, some of which may depend on others

```typescript
interface DataFetchPlan {
  steps: DataFetchStep[];
}

interface DataFetchStep {
  dataSourceId: string;
  params: Record<string, unknown>;
  targetFragmentInstanceId: string;
  targetDataKey: string;
  dependsOn?: string[];  // Other step IDs this depends on
}
```

The Data Binder executes the fetch plan, resolving independent fetches in parallel and dependent fetches in sequence. Results are injected into fragments during SSR.

### Inter-Fragment Data Bindings

Bindings declared in the Frame composition wire fragment interactions to other fragments' props or data parameters. The binding system operates on both server and client:

**Server-side** — When a frame is first composed, bindings are resolved statically. If fragment A's initial data determines fragment B's data source params, the Data Binder handles this during the fetch plan.

**Client-side** — After hydration, bindings become reactive. When a user interacts with fragment A (e.g., selects a table row), the binding system:

1. Captures the interaction event + payload
2. Evaluates binding transform (if any)
3. Determines affected target fragments
4. Option A (v1): Sends the interaction to the server, which re-renders affected fragments and streams the update
5. Option B (future): Client-side re-render with cached data + new binding values

The v1 approach keeps the server as the source of truth for all rendering. Client interactions trigger server round-trips. This is simpler and ensures the server's session state stays consistent. The client runtime optimistically updates UI state while the server confirms.

```
User clicks table row
  -> Client runtime captures rowSelect interaction
  -> Sends to server: { frameId, fragmentInstanceId, interaction: 'rowSelect', payload }
  -> Server evaluates bindings: rowSelect.payload.rowId -> detailPanel.data.params.id
  -> Server re-fetches detail data source with new params
  -> Server re-renders affected fragment(s)
  -> Server streams partial update to client
  -> Client patches DOM (React reconciliation on affected fragments)
```

### Reactive Data Subscriptions

When a data source provides a `subscribe` method, the server maintains a live subscription for the duration of the session. Updates flow through the binding system:

```
Data source emits update
  -> Server receives new data
  -> Server identifies which fragment instances are bound to this source
  -> Server re-renders affected fragments with new data
  -> Server streams partial updates to client via SSR stream or WebSocket
  -> Client patches DOM
```

The subscription lifecycle is tied to the session and frame. When a frame is replaced (new composition), subscriptions for the old frame are torn down and new ones established.

For the subscription transport, prev uses a hybrid approach:
- **Initial frame**: HTTP streaming via `renderToReadableStream` (standard React SSR)
- **Subsequent updates**: WebSocket connection for bidirectional communication (interactions up, updates down)

The WebSocket is established after initial hydration and carries:
- Client -> Server: interaction events, viewport resize, navigation actions
- Server -> Client: partial re-renders, subscription updates, frame mutations

---

## MCP Protocol

prev exposes its capabilities as an MCP tool server. Any MCP-compatible agent can discover and invoke these tools to compose UIs.

### Tool Definitions

#### `compose_frame`

Composes a new Frame from an intent or explicit fragment specification.

```typescript
{
  name: 'compose_frame',
  description: 'Compose a new UI workspace from fragments and data sources. Supports intent-based (natural language description) or structured (explicit fragment specification) composition.',
  inputSchema: z.object({
    sessionId: z.string().describe('Session to compose the frame in'),
    composition: z.discriminatedUnion('type', [
      z.object({
        type: z.literal('intent'),
        description: z.string().describe('Natural language description of desired UI'),
        constraints: z.object({
          dataSources: z.array(z.string()).optional(),
          preferredFragments: z.array(z.string()).optional(),
          layout: z.string().optional(),
          interactivity: z.union([z.literal('low'), z.literal('medium'), z.literal('high')]).optional(),
        }).optional(),
      }),
      z.object({
        type: z.literal('structured'),
        fragments: z.array(z.object({
          fragmentId: z.string(),
          props: z.record(z.unknown()).optional(),
          data: z.record(z.object({
            source: z.string(),
            params: z.record(z.unknown()).optional(),
          })).optional(),
        })),
        bindings: z.array(z.object({
          source: z.object({
            fragment: z.number(),
            interaction: z.string(),
            field: z.string(),
          }),
          target: z.object({
            fragment: z.number(),
            prop: z.string().optional(),
            dataParam: z.string().optional(),
          }),
          transform: z.string().optional(),
        })).optional(),
        layout: z.string().optional(),
      }),
    ]),
    replaceCurrentFrame: z.boolean().default(true).describe('Whether to replace the current frame or push to history'),
  }),
  outputSchema: z.object({
    frameId: z.string(),
    fragmentCount: z.number(),
    layout: z.string(),
    streamUrl: z.string().describe('URL to stream the rendered frame'),
  }),
}
```

#### `mutate_frame`

Modifies an existing Frame — add, remove, replace, or resize fragments.

```typescript
{
  name: 'mutate_frame',
  description: 'Modify the current workspace frame. Add, remove, replace, or resize fragments without full recomposition.',
  inputSchema: z.object({
    sessionId: z.string(),
    frameId: z.string(),
    mutations: z.array(z.discriminatedUnion('action', [
      z.object({
        action: z.literal('add'),
        fragmentId: z.string(),
        props: z.record(z.unknown()).optional(),
        data: z.record(z.object({
          source: z.string(),
          params: z.record(z.unknown()).optional(),
        })).optional(),
        position: z.object({
          row: z.number(),
          col: z.number(),
          rowSpan: z.number().optional(),
          colSpan: z.number().optional(),
        }).optional(),
      }),
      z.object({
        action: z.literal('remove'),
        instanceId: z.string(),
      }),
      z.object({
        action: z.literal('replace'),
        instanceId: z.string(),
        newFragmentId: z.string(),
        props: z.record(z.unknown()).optional(),
        data: z.record(z.object({
          source: z.string(),
          params: z.record(z.unknown()).optional(),
        })).optional(),
      }),
      z.object({
        action: z.literal('resize'),
        instanceId: z.string(),
        size: z.object({
          rowSpan: z.number().optional(),
          colSpan: z.number().optional(),
        }),
      }),
      z.object({
        action: z.literal('bind'),
        source: z.object({
          fragmentInstanceId: z.string(),
          interaction: z.string(),
          field: z.string(),
        }),
        target: z.object({
          fragmentInstanceId: z.string(),
          prop: z.string().optional(),
          dataParam: z.string().optional(),
        }),
      }),
      z.object({
        action: z.literal('unbind'),
        bindingId: z.string(),
      }),
    ])),
  }),
  outputSchema: z.object({
    frameId: z.string(),
    applied: z.number(),
    failed: z.array(z.object({
      index: z.number(),
      error: z.string(),
    })),
  }),
}
```

#### `list_fragments`

Returns all registered fragments with their schemas.

```typescript
{
  name: 'list_fragments',
  description: 'List all available UI fragments with their props schemas, data requirements, and interaction capabilities.',
  inputSchema: z.object({
    filter: z.object({
      tags: z.array(z.string()).optional(),
      dataSourceCompatible: z.string().optional(),
      search: z.string().optional(),
    }).optional(),
  }),
  outputSchema: z.object({
    fragments: z.array(z.object({
      id: z.string(),
      version: z.string(),
      description: z.string().optional(),
      tags: z.array(z.string()),
      props: z.record(z.unknown()),         // JSON Schema representation of Zod schema
      dataRequirements: z.record(z.object({
        paramsSchema: z.record(z.unknown()),
        returnsSchema: z.record(z.unknown()),
      })),
      interactions: z.record(z.object({
        payloadSchema: z.record(z.unknown()),
      })),
      layout: z.object({
        minWidth: z.number().optional(),
        minHeight: z.number().optional(),
        resizable: z.boolean(),
        preferredAspectRatio: z.number().optional(),
      }),
      source: z.union([z.literal('first-party'), z.literal('third-party')]),
      packageName: z.string().optional(),
    })),
  }),
}
```

#### `list_data_sources`

Returns all registered data sources with their schemas.

```typescript
{
  name: 'list_data_sources',
  description: 'List all available data sources with their parameter and return schemas.',
  inputSchema: z.object({
    filter: z.object({
      tags: z.array(z.string()).optional(),
      hasSubscription: z.boolean().optional(),
      search: z.string().optional(),
    }).optional(),
  }),
  outputSchema: z.object({
    dataSources: z.array(z.object({
      id: z.string(),
      version: z.string(),
      description: z.string().optional(),
      tags: z.array(z.string()),
      params: z.record(z.unknown()),
      returns: z.record(z.unknown()),
      supportsSubscription: z.boolean(),
      source: z.union([z.literal('first-party'), z.literal('third-party')]),
    })),
  }),
}
```

#### `get_frame_state`

Returns the current frame composition and fragment states — allows the agent to inspect what the user is currently seeing.

```typescript
{
  name: 'get_frame_state',
  description: 'Get the current workspace state including frame composition, fragment states, and active data bindings.',
  inputSchema: z.object({
    sessionId: z.string(),
    includeFragmentState: z.boolean().default(false),
    includeDataCache: z.boolean().default(false),
  }),
  outputSchema: z.object({
    frame: z.object({
      id: z.string(),
      layout: z.string(),
      fragments: z.array(z.object({
        instanceId: z.string(),
        fragmentId: z.string(),
        props: z.record(z.unknown()),
        position: z.record(z.unknown()),
        state: z.record(z.unknown()).optional(),
      })),
      bindings: z.array(z.record(z.unknown())),
    }),
    session: z.object({
      historyLength: z.number(),
      historyIndex: z.number(),
    }),
  }),
}
```

#### `query_data`

Fetches data from a registered data source — allows the agent to inspect data before composing a frame.

```typescript
{
  name: 'query_data',
  description: 'Query a registered data source. Useful for the agent to preview data before deciding on a composition.',
  inputSchema: z.object({
    sourceId: z.string(),
    params: z.record(z.unknown()),
    limit: z.number().optional(),
  }),
  outputSchema: z.object({
    data: z.unknown(),
    schema: z.record(z.unknown()),
    rowCount: z.number().optional(),
    truncated: z.boolean(),
  }),
}
```

#### `navigate_history`

Navigate the frame history (back/forward).

```typescript
{
  name: 'navigate_history',
  description: 'Navigate the workspace frame history. Move back to previous compositions or forward to restored ones.',
  inputSchema: z.object({
    sessionId: z.string(),
    direction: z.union([z.literal('back'), z.literal('forward')]),
    steps: z.number().default(1),
  }),
  outputSchema: z.object({
    frameId: z.string(),
    historyIndex: z.number(),
    historyLength: z.number(),
  }),
}
```

### MCP Capability Negotiation

When an agent connects, it calls `list_fragments` and `list_data_sources` to discover the server's capabilities. This is the **capability negotiation** — the agent learns what UI components are available, what data can be accessed, and how they can be combined.

This means different prev deployments advertise different capabilities:
- An e-commerce app's prev server exposes product catalog fragments + order data sources
- An analytics platform's prev server exposes chart fragments + warehouse data sources
- A developer tools app's prev server exposes code viewer fragments + git data sources

The agent adapts its composition strategies to whatever the server offers.

---

## Third-Party Fragment System

### Fragment Package Format

3P fragments are distributed as npm packages. A fragment package contains:

```
@vendor/prev-fragments-analytics/
  package.json              # Standard npm package + prev manifest
  fragments/
    chart-pane/
      index.ts              # Fragment definition (defineFragment)
      server.tsx            # Server render component (if separate)
      client.tsx            # Client hydration component (if separate)
    heatmap/
      index.ts
      server.tsx
      client.tsx
  data-sources/             # Optional — package can also provide data sources
    analytics-api.ts
  dist/                     # Pre-built bundles (produced by prev build)
    fragments/
      chart-pane/
        server.js           # Server-renderable bundle
        client.js           # Client hydration bundle
        manifest.json       # Extracted schema + metadata
      heatmap/
        server.js
        client.js
        manifest.json
    data-sources/
      analytics-api.js
  prev.config.ts            # Package-level prev configuration
```

#### `package.json` prev field

```json
{
  "name": "@vendor/prev-fragments-analytics",
  "version": "1.0.0",
  "prev": {
    "fragments": [
      "fragments/chart-pane/index.ts",
      "fragments/heatmap/index.ts"
    ],
    "dataSources": [
      "data-sources/analytics-api.ts"
    ],
    "permissions": {
      "network": ["api.analytics.example.com"],
      "storage": false,
      "env": ["ANALYTICS_API_KEY"]
    }
  }
}
```

### Fragment Loading

When the prev server starts, it loads 3P fragments:

1. Scans `node_modules` for packages with a `prev` field in `package.json`
2. Reads the manifest for each declared fragment
3. Validates the fragment's schemas (props, data, interactions) against Zod
4. Loads the pre-built server bundle into the fragment registry
5. Indexes the pre-built client bundle for hydration delivery
6. Validates declared permissions against server policy

```typescript
const server = createPrevServer({
  // Explicit 1P fragment registration
  fragments: [SalesChart, DataTable, DetailPanel],
  dataSources: [salesByRegion, salesRecords],

  // 3P fragment loading
  thirdParty: {
    // Auto-discover from node_modules
    autoDiscover: true,

    // Or explicit package list
    packages: [
      '@vendor/prev-fragments-analytics',
      '@vendor/prev-fragments-forms',
    ],

    // Permission policy
    policy: {
      allowNetwork: ['*.example.com'],
      allowEnv: ['ANALYTICS_API_KEY'],
      denyStorage: true,
      maxBundleSize: '500kb',
    },
  },
});
```

### Fragment Build Pipeline

Fragment packages use a prev build plugin to produce their distributable bundles:

```typescript
// prev.config.ts in a 3P fragment package
import { definePrevConfig } from '@bundt/prev/build';

export default definePrevConfig({
  fragments: ['fragments/chart-pane/index.ts', 'fragments/heatmap/index.ts'],
  dataSources: ['data-sources/analytics-api.ts'],

  build: {
    // Server bundles — stripped of client-only code
    server: {
      target: 'bun',
      external: ['react', 'react-dom', '@bundt/prev'],
    },
    // Client bundles — stripped of server-only code, tree-shaken
    client: {
      target: 'browser',
      external: ['react', 'react-dom'],
      splitting: true,
      minify: true,
    },
  },
});
```

The build produces:
- **Server bundles**: One per fragment, importable by the prev server for SSR
- **Client bundles**: One per fragment, served as static assets for hydration
- **Manifests**: JSON files with extracted schemas, used for registry indexing without loading the full bundle

### Security Model

3P fragment code runs in the server process (v1). The security boundary is **declared permissions + runtime validation**:

1. **Manifest permissions**: Each package declares what it needs (network hosts, env vars, storage)
2. **Server policy**: The prev server operator defines what's allowed
3. **Load-time validation**: Permissions are checked before the fragment is loaded. Mismatches are rejected with clear error messages.
4. **Runtime monitoring** (v1.1): Track actual resource usage per fragment; flag anomalies.
5. **Isolation** (v2): Move 3P fragment server execution to `worker_threads` with restricted globals.

For v1, the trust model is: **you trust the npm packages you install**, same as any Node/Bun application. The permission manifest exists to make the trust explicit and auditable, and to prepare for stricter enforcement in v2.

---

## Client Runtime

### Workspace Layout

The browser client renders a two-panel layout:

```
+--------------------------------------------------+----------+
|                                                  |          |
|                                                  |  Agent   |
|              Workspace                           |  Chat    |
|              (dynamic fragments)                 |  Panel   |
|                                                  |          |
|                                                  |          |
|              80-90% width                        | 10-20%   |
|                                                  |          |
+--------------------------------------------------+----------+
```

The workspace panel is a CSS Grid container. Fragment positions map to grid areas. The layout is responsive — fragments declare min/max sizes, and the grid adapts.

The chat panel is resizable (drag the divider). It can be collapsed to give the workspace full width, or expanded for focused agent conversation.

### Hydration Strategy

When a frame is streamed to the client:

1. **HTML arrives via streaming SSR** — fragments render progressively as data resolves
2. **Fragment client bundles are loaded** — each fragment's pre-built hydration bundle is loaded via `<script>` tags. These are static, fingerprinted, CDN-cacheable assets.
3. **Composition glue bundle is loaded** — a small, per-frame bundle that:
   - Wires up inter-fragment bindings
   - Establishes the WebSocket connection
   - Initializes the reactive binding system
   - Manages the fragment lifecycle
4. **React hydrates** — `hydrateRoot` on the workspace container. Because all fragments share a single React tree (v1), this is a single hydration pass.
5. **WebSocket established** — bidirectional channel for interactions and updates

The composition glue bundle is small (typically < 5KB) because it only contains binding wiring and fragment references (the actual fragment code is in the pre-built static bundles). It's generated per-frame by `Bun.build()` with the fragment bundles as externals.

### Fragment Lifecycle (Client)

```
Fragment mounted (hydration complete)
  -> Register with client runtime
  -> Bind interaction handlers
  -> Subscribe to incoming bindings
  -> Ready

User interacts with fragment
  -> Interaction handler fires
  -> Client runtime evaluates bindings
  -> Optimistic UI update (optional)
  -> Send interaction to server via WebSocket
  -> Server processes, re-renders affected fragments
  -> Client receives partial update
  -> React reconciliation patches DOM

Frame replaced (new composition)
  -> Teardown current fragments
  -> Unsubscribe all bindings
  -> New HTML streamed
  -> New hydration bundles loaded
  -> New composition glue loaded
  -> Hydration
```

### Client API

The client runtime exposes a minimal API for fragment code:

```typescript
// Available inside hydrated fragment components
import { useFragment } from '@bundt/prev/client';

const MyFragment = ({ props, data }) => {
  const { emit, subscribe, getFrameState } = useFragment();

  // Emit an interaction
  const handleClick = (id: string) => emit('rowSelect', { rowId: id });

  // Subscribe to incoming binding updates
  subscribe('filterChange', (newFilters) => {
    // React to changes from other fragments
  });

  return <div>...</div>;
};
```

---

## Agent Chat Panel

The chat panel is a built-in component of prev that provides the agent conversation interface. It is designed to be heavily extensible through theming and integration hooks.

### Default Chat UI

The default chat panel provides:
- Message history with streaming response display
- Markdown rendering for agent responses
- Tool call visualization (shows when the agent is composing/mutating frames)
- Session indicator (which agent, connection status)
- Input area with send button

### Theming

The chat panel uses CSS custom properties for comprehensive theming:

```css
:root {
  /* Chat panel colors */
  --prev-chat-bg: #1a1a2e;
  --prev-chat-text: #e0e0e0;
  --prev-chat-user-bg: #16213e;
  --prev-chat-agent-bg: #0f3460;
  --prev-chat-input-bg: #1a1a2e;
  --prev-chat-border: #2a2a4a;

  /* Typography */
  --prev-chat-font-family: system-ui, sans-serif;
  --prev-chat-font-size: 14px;
  --prev-chat-line-height: 1.5;

  /* Workspace colors */
  --prev-workspace-bg: #0a0a1a;
  --prev-fragment-bg: #12122a;
  --prev-fragment-border: #2a2a4a;
  --prev-fragment-header-bg: #1a1a3e;

  /* Layout */
  --prev-chat-width: 320px;
  --prev-chat-min-width: 240px;
  --prev-chat-max-width: 600px;
  --prev-divider-width: 4px;
  --prev-divider-color: #2a2a4a;
}
```

### Integration Hooks

For custom agent integrations:

```typescript
const server = createPrevServer({
  chat: {
    // Custom message rendering
    renderMessage: (message) => <CustomMessageComponent message={message} />,

    // Custom input area
    renderInput: (props) => <CustomInputWithVoice {...props} />,

    // Custom tool call display
    renderToolCall: (toolCall) => <CustomToolCallCard toolCall={toolCall} />,

    // Middleware for message processing
    onBeforeSend: async (message, session) => {
      // Augment message with workspace context
      return { ...message, context: await getWorkspaceContext(session) };
    },

    // Agent connection factory
    createAgentConnection: (session) => {
      // Return an MCP client connection to your agent
      return connectToAgent({
        url: process.env.AGENT_URL,
        sessionId: session.id,
      });
    },
  },
});
```

---

## SQLite Persistence Schema

All server state is persisted to an embedded SQLite database via `bun:sqlite`.

```sql
-- Sessions
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL,
  current_frame_id TEXT,
  history_index INTEGER DEFAULT 0,
  metadata TEXT DEFAULT '{}',     -- JSON
  created_at INTEGER NOT NULL,
  last_active_at INTEGER NOT NULL
);

CREATE INDEX idx_sessions_agent ON sessions(agent_id);
CREATE INDEX idx_sessions_active ON sessions(last_active_at);

-- Frames
CREATE TABLE frames (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  composition TEXT NOT NULL,       -- JSON: full Frame serialization
  intent TEXT,                     -- Original agent intent
  layout_type TEXT NOT NULL,
  fragment_count INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE INDEX idx_frames_session ON frames(session_id);

-- Frame History (ordered navigation stack per session)
CREATE TABLE frame_history (
  session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  frame_id TEXT NOT NULL REFERENCES frames(id) ON DELETE CASCADE,
  PRIMARY KEY (session_id, position)
);

-- Fragment State (per-instance state within a frame)
CREATE TABLE fragment_state (
  frame_id TEXT NOT NULL REFERENCES frames(id) ON DELETE CASCADE,
  instance_id TEXT NOT NULL,
  state TEXT NOT NULL DEFAULT '{}',  -- JSON
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (frame_id, instance_id)
);

-- Data Cache
CREATE TABLE data_cache (
  source_id TEXT NOT NULL,
  params_hash TEXT NOT NULL,
  result TEXT NOT NULL,              -- JSON
  fetched_at INTEGER NOT NULL,
  ttl INTEGER,                       -- Seconds, NULL = no expiry
  PRIMARY KEY (source_id, params_hash)
);

CREATE INDEX idx_data_cache_expiry ON data_cache(fetched_at, ttl);

-- Fragment Registry (3P fragments, cached from npm manifests)
CREATE TABLE fragment_registry (
  id TEXT NOT NULL,
  version TEXT NOT NULL,
  package_name TEXT NOT NULL,
  manifest TEXT NOT NULL,            -- JSON: full manifest
  server_bundle_path TEXT NOT NULL,
  client_bundle_path TEXT NOT NULL,
  permissions TEXT NOT NULL,         -- JSON
  loaded_at INTEGER NOT NULL,
  PRIMARY KEY (id, version)
);
```

### Session Lifecycle

```
New WebSocket connection
  -> Check for existing session (cookie / token)
  -> If exists: restore session, load current frame, resume subscriptions
  -> If not: create new session, compose initial frame (empty or default)

Session active
  -> Each interaction updates last_active_at
  -> Frame compositions are persisted
  -> Fragment state changes are debounce-persisted

Session idle (configurable timeout, default 30 min)
  -> Tear down subscriptions
  -> Session remains in DB (resumable)

Session expired (configurable, default 7 days)
  -> Cleanup: delete session, frames, fragment states, stale data cache
```

---

## Server API

### `createPrevServer`

The main entry point for creating a prev server:

```typescript
import { createPrevServer } from '@bundt/prev';

const server = createPrevServer({
  // Fragment registration
  fragments: [SalesChart, DataTable, DetailPanel, CustomerCard],

  // Data source registration
  dataSources: [salesByRegion, salesRecords, customerDetails],

  // 3P fragment configuration
  thirdParty: {
    autoDiscover: true,
    packages: ['@vendor/prev-fragments-analytics'],
    policy: {
      allowNetwork: ['*.example.com'],
      maxBundleSize: '500kb',
    },
  },

  // Persistence
  database: {
    path: './data/prev.db',     // SQLite file path
    sessionTimeout: 30 * 60,    // 30 minutes idle timeout
    sessionExpiry: 7 * 24 * 60 * 60, // 7 days
  },

  // MCP server configuration
  mcp: {
    transport: 'stdio',         // or 'sse', 'ws'
  },

  // Chat panel configuration
  chat: {
    createAgentConnection: (session) => connectToAgent(session),
    theme: 'dark',               // or custom theme object
  },

  // Server configuration
  server: {
    port: 3000,
    hostname: '0.0.0.0',
    staticDir: './public',       // Static assets
  },

  // Build configuration (for composition glue generation)
  build: {
    cacheDir: '.prev/cache',
    clientBundleDir: '.prev/bundles',
  },
});

// Start the server
server.listen();
```

### `defineFragment`

```typescript
import { defineFragment } from '@bundt/prev';

type DefineFragmentOptions<
  TProps extends z.ZodType,
  TData extends Record<string, DataFieldDefinition>,
  TInteractions extends Record<string, InteractionDefinition>,
> = {
  id: string;
  version: string;
  description?: string;
  tags?: string[];

  props: TProps;
  data: TData;
  interactions: TInteractions;
  layout?: LayoutHints;

  // Render function or component reference
  render:
    | ((context: FragmentRenderContext<TProps, TData, TInteractions>) => React.ReactElement)
    | React.ComponentType<FragmentRenderProps<TProps, TData, TInteractions>>;
};

interface FragmentRenderContext<TProps, TData, TInteractions> {
  props: z.infer<TProps>;
  data: ResolvedData<TData>;
  emit: <K extends keyof TInteractions>(
    interaction: K,
    payload: z.infer<TInteractions[K]['payload']>
  ) => void;
  session: { id: string; metadata: Record<string, unknown> };
}

// When render is a component reference, it receives the same shape as props
type FragmentRenderProps<TProps, TData, TInteractions> = FragmentRenderContext<TProps, TData, TInteractions>;
```

### `defineDataSource`

```typescript
import { defineDataSource } from '@bundt/prev';

type DefineDataSourceOptions<
  TParams extends z.ZodType,
  TReturns extends z.ZodType,
> = {
  id: string;
  version: string;
  description?: string;
  tags?: string[];

  params: TParams;
  returns: TReturns;

  // One-shot fetch
  fetch: (context: DataSourceFetchContext<TParams>) => Promise<z.infer<TReturns>>;

  // Optional real-time subscription
  subscribe?: (context: DataSourceSubscribeContext<TParams, TReturns>) => () => void;

  // Cache configuration
  cache?: {
    ttl?: number;               // Seconds
    staleWhileRevalidate?: boolean;
  };
};

interface DataSourceFetchContext<TParams> {
  params: z.infer<TParams>;
  session: { id: string; metadata: Record<string, unknown> };
  signal: AbortSignal;
}

interface DataSourceSubscribeContext<TParams, TReturns> {
  params: z.infer<TParams>;
  session: { id: string; metadata: Record<string, unknown> };
  emit: (data: z.infer<TReturns>) => void;
}
```

---

## Package Structure

```
packages/prev/
  package.json
  tsconfig.json
  prev.config.ts                   # Dogfood: prev's own build config

  src/
    index.ts                       # Public API barrel: createPrevServer, defineFragment, defineDataSource
    types.ts                       # Core type definitions (Frame, Fragment, Session, etc.)

    server/
      index.ts                     # Server barrel
      server.ts                    # createPrevServer implementation
      mcp.ts                       # MCP tool server (tool definitions + handlers)
      ssr.ts                       # Streaming SSR renderer
      websocket.ts                 # WebSocket handler (interactions, updates)
      session.ts                   # Session management
      database.ts                  # SQLite persistence layer

    composition/
      index.ts                     # Composition engine barrel
      engine.ts                    # Main composition orchestrator
      intent-resolver.ts           # Intent -> fragment selection
      layout-solver.ts             # Fragment arrangement -> grid layout
      data-binder.ts               # Data source binding + fetch plan execution
      binding-resolver.ts          # Inter-fragment binding wiring

    registry/
      index.ts                     # Registry barrel
      fragment-registry.ts         # Fragment registration + lookup
      data-source-registry.ts      # Data source registration + lookup
      third-party-loader.ts        # 3P package discovery + loading
      manifest.ts                  # Fragment manifest parsing + validation

    client/
      index.ts                     # Client barrel: useFragment, ClientRuntime
      runtime.ts                   # Client runtime (hydration, bindings, WebSocket)
      hydration.ts                 # Fragment hydration orchestrator
      bindings.ts                  # Client-side binding evaluation
      layout.ts                    # CSS Grid layout manager

    chat/
      index.ts                     # Chat panel barrel
      ChatPanel.tsx                # Main chat panel component
      MessageList.tsx              # Message display
      ChatInput.tsx                # Input area
      ToolCallCard.tsx             # Tool call visualization
      theme.ts                     # Theme system (CSS custom properties)

    build/
      index.ts                     # Build barrel
      plugin.ts                    # Bun.build plugin for fragment bundles
      composition-bundler.ts       # Per-frame composition glue builder
      manifest-extractor.ts        # Extract schemas to JSON manifests

  dist/                            # Build output
    index.js                       # Server entry
    client.js                      # Client runtime (browser target)
    build.js                       # Build tooling entry
```

### Package.json Exports

```json
{
  "name": "@bundt/prev",
  "type": "module",
  "exports": {
    ".": {
      "bun": "./src/index.ts",
      "default": "./dist/index.js"
    },
    "./client": {
      "browser": "./dist/client.js",
      "bun": "./src/client/index.ts",
      "default": "./dist/client.js"
    },
    "./build": {
      "bun": "./src/build/index.ts",
      "default": "./dist/build.js"
    }
  },
  "peerDependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "zod": "^4.0.0"
  },
  "dependencies": {
    "picocolors": "^1.x",
    "@modelcontextprotocol/sdk": "^1.x"
  }
}
```

---

## Build System

### Fragment Build (for 3P packages)

Fragment packages use `prev build` to produce distributable bundles:

```bash
prev build              # Build all fragments + data sources
prev build --watch      # Watch mode for development
prev build --analyze    # Bundle size analysis
```

The build step:

1. Reads `prev.config.ts` (or `prev` field in `package.json`)
2. For each fragment:
   a. Extracts the Zod schema to a JSON manifest (no runtime Zod dependency for consumers)
   b. Builds the server bundle (Bun target, externals: react, react-dom, @bundt/prev)
   c. Builds the client bundle (browser target, tree-shaken, minified, code-split)
   d. Writes to `dist/fragments/<id>/`
3. For each data source:
   a. Builds the server bundle
   b. Writes to `dist/data-sources/<id>.js`

### Composition Glue Build (runtime, per-frame)

When a new frame is composed, the server generates a thin glue bundle:

```typescript
// Generated per-frame — this is what Bun.build produces on the fly
import { initFrame } from '@bundt/prev/client';

initFrame({
  frameId: 'frame_abc123',
  fragments: [
    { instanceId: 'inst_1', bundlePath: '/bundles/sales-chart/client.js' },
    { instanceId: 'inst_2', bundlePath: '/bundles/data-table/client.js' },
    { instanceId: 'inst_3', bundlePath: '/bundles/detail-panel/client.js' },
  ],
  bindings: [
    {
      source: { instanceId: 'inst_2', interaction: 'rowSelect', field: 'payload.rowId' },
      target: { instanceId: 'inst_3', dataParam: 'record.params.id' },
    },
  ],
  wsUrl: '/ws?session=sess_xyz&frame=frame_abc123',
});
```

This is ~2-5KB and builds in <50ms with `Bun.build()`. The fragment bundles themselves are pre-built and cached.

---

## Implementation Phases

### Phase 1: Foundation (MVP)

**Goal**: A working prev server that can compose frames from registered fragments, SSR them, and hydrate on the client.

**Deliverables**:
- `defineFragment` API with Zod schema validation
- `defineDataSource` API with fetch support
- Fragment registry (1P only)
- Data source registry
- Composition engine with structured mode only (no intent resolution)
- Layout solver (single, split-horizontal, split-vertical, grid)
- Streaming SSR via `renderToReadableStream`
- Shared React tree hydration
- SQLite session persistence
- Basic WebSocket for client-server interaction transport
- Composition glue bundler

**Acceptance**: A developer can define fragments and data sources, create a prev server, and an agent (or test harness) can call `compose_frame` with structured composition to produce a streamed, hydrated workspace.

### Phase 2: MCP + Agent Integration

**Goal**: Full MCP tool server with capability negotiation. Agent chat panel.

**Deliverables**:
- MCP tool server with all 6 tools (compose_frame, mutate_frame, list_fragments, list_data_sources, get_frame_state, query_data, navigate_history)
- Intent resolution engine (keyword/scoring-based)
- Agent chat panel (default UI with theming)
- Chat integration hooks (createAgentConnection, message middleware)
- Frame history and navigation
- `mutate_frame` for incremental modifications

**Acceptance**: A Claude or other MCP-compatible agent can connect, discover capabilities, compose frames via intents, and the user can interact with the composed workspace while chatting with the agent.

### Phase 3: Third-Party Fragments

**Goal**: Full 3P fragment ecosystem support.

**Deliverables**:
- Fragment package format specification
- `prev build` CLI for fragment packages
- 3P fragment loader (npm package discovery, manifest validation)
- Permission system (manifest declarations, server policy, load-time validation)
- Fragment manifest extractor (Zod -> JSON Schema)
- `definePrevConfig` for fragment packages

**Acceptance**: A third-party npm package with `prev` field in package.json can be installed, discovered, loaded, and its fragments composed alongside 1P fragments.

### Phase 4: Reactive Data + Subscriptions

**Goal**: Real-time data flow through the system.

**Deliverables**:
- Data source `subscribe` support
- Subscription lifecycle management (tied to session/frame)
- Server-push partial re-renders for subscription updates
- Reactive binding evaluation (data change triggers dependent fragment updates)
- Data cache with TTL and stale-while-revalidate

**Acceptance**: A data source with subscriptions pushes updates through to rendered fragments in real-time. Fragment bindings react to data changes.

### Phase 5: Polish + Production Readiness

**Goal**: Production-grade reliability and developer experience.

**Deliverables**:
- Comprehensive error handling (fragment render failures, data source timeouts, WebSocket disconnects)
- Fragment error boundaries (one fragment crashing doesn't take down the workspace)
- Graceful degradation (WebSocket fallback to polling, SSR fallback for JS-disabled)
- Performance monitoring (fragment render times, data source latency, bundle sizes)
- Development mode (hot reload fragments, verbose logging, composition inspector)
- Documentation site (using dxdocs)

**Acceptance**: prev can be deployed to production with confidence. Errors are isolated, performance is measurable, and the developer experience is smooth.

### Phase 6: Fragment Isolation (v2)

**Goal**: True microfrontend isolation — independent render + stitch.

**Deliverables**:
- Per-fragment `renderToReadableStream` calls
- HTML stitching layer (combines independently-rendered fragment HTML)
- Fragment crash isolation (one fragment's React error doesn't affect others)
- Optional `worker_threads` isolation for 3P fragment server code
- Independent fragment hydration (each fragment hydrates its own root)

**Acceptance**: A crashing 3P fragment is caught and displayed as an error boundary without affecting other fragments or the chat panel.

---

## Example: Full Application

```typescript
// app.ts — A complete prev application

import { createPrevServer, defineFragment, defineDataSource } from '@bundt/prev';
import { z } from 'zod';
import { Database } from 'bun:sqlite';

// -- Data Sources --

const db = new Database('./app.db');

const products = defineDataSource({
  id: 'products',
  version: '1.0.0',
  description: 'Product catalog with search and filtering',
  tags: ['catalog', 'products'],

  params: z.object({
    search: z.string().optional(),
    category: z.string().optional(),
    limit: z.number().default(50),
    offset: z.number().default(0),
  }),

  returns: z.object({
    items: z.array(z.object({
      id: z.string(),
      name: z.string(),
      category: z.string(),
      price: z.number(),
      stock: z.number(),
    })),
    total: z.number(),
  }),

  fetch: async ({ params }) => {
    const items = db.query(`
      SELECT * FROM products
      WHERE ($search IS NULL OR name LIKE '%' || $search || '%')
        AND ($category IS NULL OR category = $category)
      LIMIT $limit OFFSET $offset
    `).all({
      $search: params.search ?? null,
      $category: params.category ?? null,
      $limit: params.limit,
      $offset: params.offset,
    });

    const [{ total }] = db.query('SELECT COUNT(*) as total FROM products').all();

    return { items, total };
  },
});

const productDetail = defineDataSource({
  id: 'product-detail',
  version: '1.0.0',
  tags: ['catalog', 'products'],

  params: z.object({
    id: z.string(),
  }),

  returns: z.object({
    id: z.string(),
    name: z.string(),
    description: z.string(),
    category: z.string(),
    price: z.number(),
    stock: z.number(),
    images: z.array(z.string()),
    reviews: z.array(z.object({
      author: z.string(),
      rating: z.number(),
      text: z.string(),
    })),
  }),

  fetch: async ({ params }) => {
    return db.query('SELECT * FROM products WHERE id = ?').get(params.id);
  },
});

// -- Fragments --

const ProductGrid = defineFragment({
  id: 'product-grid',
  version: '1.0.0',
  description: 'Searchable, filterable product grid',
  tags: ['catalog', 'grid', 'search'],

  props: z.object({
    showSearch: z.boolean().default(true),
    showFilters: z.boolean().default(true),
    gridColumns: z.number().default(3),
  }),

  data: {
    products: {
      source: z.string(),
      params: z.object({
        search: z.string().optional(),
        category: z.string().optional(),
        limit: z.number().optional(),
      }),
    },
  },

  interactions: {
    productSelect: {
      payload: z.object({ productId: z.string() }),
    },
    searchChange: {
      payload: z.object({ query: z.string() }),
    },
    filterChange: {
      payload: z.object({ category: z.string() }),
    },
  },

  layout: {
    minWidth: 400,
    minHeight: 500,
    resizable: true,
  },

  render: ({ props, data, emit }) => (
    <div className="product-grid">
      {props.showSearch && (
        <input
          type="search"
          placeholder="Search products..."
          onChange={(e) => emit('searchChange', { query: e.target.value })}
        />
      )}
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${props.gridColumns}, 1fr)` }}>
        {data.products.items.map((product) => (
          <div
            key={product.id}
            className="product-card"
            onClick={() => emit('productSelect', { productId: product.id })}
          >
            <h3>{product.name}</h3>
            <p>${product.price}</p>
            <span>{product.stock} in stock</span>
          </div>
        ))}
      </div>
    </div>
  ),
});

const ProductDetails = defineFragment({
  id: 'product-details',
  version: '1.0.0',
  description: 'Detailed product view with reviews',
  tags: ['catalog', 'detail'],

  props: z.object({}),

  data: {
    product: {
      source: z.string(),
      params: z.object({ id: z.string() }),
    },
  },

  interactions: {
    addToCart: {
      payload: z.object({ productId: z.string(), quantity: z.number() }),
    },
  },

  layout: {
    minWidth: 300,
    minHeight: 400,
    resizable: true,
  },

  render: ({ data, emit }) => (
    <div className="product-details">
      <h2>{data.product.name}</h2>
      <p>{data.product.description}</p>
      <div className="price">${data.product.price}</div>
      <button onClick={() => emit('addToCart', { productId: data.product.id, quantity: 1 })}>
        Add to Cart
      </button>
      <div className="reviews">
        {data.product.reviews.map((review, i) => (
          <div key={i} className="review">
            <strong>{review.author}</strong> — {'*'.repeat(review.rating)}
            <p>{review.text}</p>
          </div>
        ))}
      </div>
    </div>
  ),
});

// -- Server --

const server = createPrevServer({
  fragments: [ProductGrid, ProductDetails],
  dataSources: [products, productDetail],

  thirdParty: {
    autoDiscover: true,
    policy: {
      allowNetwork: [],
      maxBundleSize: '500kb',
    },
  },

  database: {
    path: './data/store.db',
  },

  chat: {
    createAgentConnection: (session) => ({
      transport: 'stdio',
      command: 'claude',
      args: ['--mcp'],
    }),
  },

  server: {
    port: 3000,
  },
});

server.listen();
// prev server running at http://localhost:3000
```

When an agent connects and calls:

```json
{
  "tool": "compose_frame",
  "arguments": {
    "sessionId": "sess_abc",
    "composition": {
      "type": "intent",
      "description": "Show the product catalog with ability to view product details"
    }
  }
}
```

The server:
1. Resolves the intent — matches "product catalog" to `product-grid`, "product details" to `product-details`
2. Selects `primary-detail` layout (one primary browsing fragment + one detail fragment)
3. Auto-binds `product-grid.productSelect` -> `product-details.data.product.params.id`
4. Fetches initial data from `products` data source
5. Streams the composed frame via SSR
6. Ships fragment hydration bundles + composition glue
7. User sees a product grid on the left, clicks a product, detail panel updates on the right

---

## Open Design Questions (Post-Spec)

These are explicitly deferred and should be resolved during implementation:

1. **Intent resolution sophistication** — The v1 keyword/scoring resolver will work for well-tagged fragments but may struggle with ambiguous intents. Should we provide hooks for app developers to customize intent resolution? Likely yes.

2. **Fragment versioning conflicts** — If two 3P packages provide fragments with the same ID but different versions, what's the resolution strategy? Namespace by package name? Allow explicit overrides?

3. **Data binding transform language** — The `transform` field in bindings is currently a string. What expression language? JSONPath? A safe subset of JS? A custom DSL? Needs prototyping.

4. **Offline/degraded mode** — What happens when the WebSocket drops? Cache the last frame and allow read-only interaction? Reconnect and replay missed interactions?

5. **Fragment testing** — How do developers test fragments in isolation? Likely a `prev dev` server that renders individual fragments with mock data. Should be specified in detail.

6. **Accessibility** — Dynamic UI composition must maintain accessibility. Fragment-level ARIA landmarks, focus management on frame transitions, screen reader announcements for frame changes. Needs dedicated attention.

7. **Performance budget** — What's the target for time-to-interactive on a fresh frame composition? Streaming SSR helps, but we should set explicit targets (e.g., first fragment visible < 200ms, full hydration < 1s).

8. **Scaling bindings** — The declarative binding approach (Decision C) should be monitored as complexity grows. If a frame has 10+ fragments with cross-bindings, does the evaluation model remain tractable? May need dependency graph optimization.
