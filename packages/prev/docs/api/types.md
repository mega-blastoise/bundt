# Type Reference

All types are exported from `@bundt/prev`.

## Fragment Types

### `FragmentDefinition<TProps, TData, TInteractions>`

```typescript
interface FragmentDefinition<TProps, TData, TInteractions> {
  id: string;
  name: string;
  description?: string;
  tags?: string[];
  props: TProps;                    // ZodType
  data: TData;                     // Record<string, DataFieldDefinition>
  interactions: TInteractions;      // Record<string, InteractionDefinition>
  layoutHints?: LayoutHints;
  render: (ctx: FragmentRenderContext<TProps, TData, TInteractions>) => ReactNode;
}
```

### `FragmentRenderContext<TProps, TData, TInteractions>`

```typescript
interface FragmentRenderContext<TProps, TData, TInteractions> {
  props: z.infer<TProps>;
  data: { [K in keyof TData]: unknown };
  emit: EmitFn<TInteractions>;
}
```

### `DataFieldDefinition`

```typescript
interface DataFieldDefinition {
  source: string;
  params?: z.ZodType;
}
```

### `InteractionDefinition`

```typescript
interface InteractionDefinition {
  payload: z.ZodType;
}
```

## Data Source Types

### `DataSourceDefinition<TParams, TReturns>`

```typescript
interface DataSourceDefinition<TParams, TReturns> {
  id: string;
  name: string;
  description?: string;
  tags?: string[];
  params: TParams;           // ZodType
  returns: TReturns;         // ZodType
  ttl?: number;
  fetch: (params: z.infer<TParams>) => Promise<z.infer<TReturns>>;
}
```

### `DataSourceBinding`

```typescript
interface DataSourceBinding {
  source: string;
  params: Record<string, unknown>;
}
```

## Frame Types

### `Frame`

```typescript
interface Frame {
  id: string;
  sessionId: string;
  layout: LayoutDefinition;
  fragments: FragmentInstance[];
  bindings: DataBinding[];
  createdAt: number;
  intent?: string;
}
```

### `FragmentInstance`

```typescript
interface FragmentInstance {
  instanceId: string;
  fragmentId: string;
  props: Record<string, unknown>;
  dataBindings: Record<string, DataSourceBinding>;
  position?: LayoutPosition;
  size?: LayoutSize;
  layoutHints?: LayoutHints;
}
```

## Layout Types

### `LayoutType`

```typescript
type LayoutType = 'single' | 'split-horizontal' | 'split-vertical'
                | 'grid' | 'primary-detail' | 'dashboard' | 'custom';
```

### `LayoutDefinition`

```typescript
interface LayoutDefinition {
  type: LayoutType;
  gap: string;
  padding: string;
  columns: number;
  rows: number;
  areas?: string[][];
  positions: Map<string, LayoutPosition>;
}
```

### `LayoutPosition`

```typescript
interface LayoutPosition {
  row: number;
  col: number;
  rowSpan: number;
  colSpan: number;
}
```

### `LayoutSize`

```typescript
interface LayoutSize {
  width: string;
  height: string;
  minWidth?: string;
  minHeight?: string;
  maxWidth?: string;
  maxHeight?: string;
}
```

### `LayoutHints`

```typescript
interface LayoutHints {
  minWidth?: string;
  minHeight?: string;
  resizable?: boolean;
  preferredAspectRatio?: number;
}
```

## Binding Types

### `DataBinding`

```typescript
interface DataBinding {
  id: string;
  sourceFragmentInstanceId: string;
  sourceInteraction: string;
  targetFragmentInstanceId: string;
  targetType: 'prop' | 'dataParam';
  targetKey: string;
  transform?: string;
}
```

### `ResolvedBinding`

Extends `DataBinding` with resolved fragment IDs:

```typescript
interface ResolvedBinding extends Omit<DataBinding, never> {
  sourceFragmentId: string;
  targetFragmentId: string;
}
```

## Session Types

### `Session`

```typescript
interface Session {
  id: string;
  agentId?: string;
  currentFrameId?: string;
  frameHistory: string[];
  historyIndex: number;
  metadata: Record<string, unknown>;
  createdAt: number;
  lastActiveAt: number;
}
```

## Composition Types

### `StructuredComposition`

```typescript
interface StructuredComposition {
  fragments: StructuredCompositionFragment[];
  bindings?: DataBinding[];
  layout?: LayoutType;
  intent?: string;
}
```

### `StructuredCompositionFragment`

```typescript
interface StructuredCompositionFragment {
  fragmentId: string;
  props?: Record<string, unknown>;
  data?: Record<string, DataSourceBinding>;
  position?: LayoutPosition;
  size?: LayoutSize;
}
```

### `CompositionResult`

```typescript
interface CompositionResult {
  frame: Frame;
  resolvedData: Map<string, Record<string, unknown>>;
  resolvedBindings: ResolvedBinding[];
}
```

## Server Types

### `PrevServerConfig`

```typescript
interface PrevServerConfig {
  port?: number;
  hostname?: string;
  dbPath?: string;
  fragments: FragmentDefinition[];
  dataSources: DataSourceDefinition[];
}
```

## WebSocket Message Types

### `ClientMessage`

```typescript
type ClientMessage =
  | { type: 'interaction'; frameId: string; fragmentInstanceId: string; interaction: string; payload: unknown }
  | { type: 'ping' };
```

### `ServerMessage`

```typescript
type ServerMessage =
  | { type: 'fragment-update'; fragmentInstanceId: string; html: string; data: Record<string, unknown> }
  | { type: 'error'; message: string }
  | { type: 'pong' };
```

### `InteractionEvent`

```typescript
interface InteractionEvent {
  frameId: string;
  fragmentInstanceId: string;
  interaction: string;
  payload: unknown;
}
```
