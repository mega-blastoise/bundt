import type {
  DataFieldDefinition,
  DataSourceDefinition,
  FragmentDefinition,
  InteractionDefinition
} from './types';
import type { z } from 'zod';

export { createPrevServer } from './server';
export type { PrevServer } from './server/server';

export type {
  ActiveSubscription,
  ChatConfig,
  ChatMessage,
  ClientMessage,
  CompositionRequest,
  CompositionResult,
  DataBinding,
  DataFetchPlan,
  DataFetchStep,
  DataFieldDefinition,
  DataSourceBinding,
  DataSourceDefinition,
  EmitFn,
  Frame,
  FragmentDefinition,
  FragmentInstance,
  FragmentManifest,
  FragmentPackageConfig,
  FragmentRenderContext,
  FragmentRenderProps,
  FrameMutation,
  IntentComposition,
  InteractionDefinition,
  InteractionEvent,
  LayoutDefinition,
  LayoutHints,
  LayoutPosition,
  LayoutSize,
  LayoutType,
  McpToolDefinition,
  McpToolResult,
  MutateFrameRequest,
  MutateFrameResult,
  PrevServerConfig,
  ResolvedBinding,
  ServerMessage,
  Session,
  StructuredComposition,
  StructuredCompositionFragment,
  ThirdPartyConfig,
  ToolCallInfo
} from './types';

export function defineFragment<
  TProps extends z.ZodType,
  TData extends Record<string, DataFieldDefinition>,
  TInteractions extends Record<string, InteractionDefinition>
>(definition: FragmentDefinition<TProps, TData, TInteractions>): FragmentDefinition<TProps, TData, TInteractions> {
  if (!definition.id) throw new Error('Fragment definition must have an id');
  if (!definition.name) throw new Error('Fragment definition must have a name');
  if (!definition.render) throw new Error('Fragment definition must have a render function');
  return Object.freeze({ ...definition }) as FragmentDefinition<TProps, TData, TInteractions>;
}

export function defineDataSource<
  TParams extends z.ZodType,
  TReturns extends z.ZodType
>(definition: DataSourceDefinition<TParams, TReturns>): DataSourceDefinition<TParams, TReturns> {
  if (!definition.id) throw new Error('Data source definition must have an id');
  if (!definition.name) throw new Error('Data source definition must have a name');
  if (!definition.fetch) throw new Error('Data source definition must have a fetch function');
  return Object.freeze({ ...definition }) as DataSourceDefinition<TParams, TReturns>;
}
