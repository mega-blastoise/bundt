import type { z } from 'zod';
import type { ReactNode } from 'react';

// ── Layout Types ──

export const LAYOUT_TYPES = {
  single: 'single',
  splitHorizontal: 'split-horizontal',
  splitVertical: 'split-vertical',
  grid: 'grid',
  primaryDetail: 'primary-detail',
  dashboard: 'dashboard',
  custom: 'custom'
} as const;

export type LayoutType = (typeof LAYOUT_TYPES)[keyof typeof LAYOUT_TYPES];

export interface LayoutPosition {
  row: number;
  col: number;
  rowSpan: number;
  colSpan: number;
}

export interface LayoutSize {
  width: string;
  height: string;
  minWidth?: string;
  minHeight?: string;
  maxWidth?: string;
  maxHeight?: string;
}

export interface LayoutHints {
  minWidth?: string;
  minHeight?: string;
  resizable?: boolean;
  preferredAspectRatio?: number;
}

export interface LayoutDefinition {
  type: LayoutType;
  gap: string;
  padding: string;
  columns: number;
  rows: number;
  areas?: string[][];
  positions: Map<string, LayoutPosition>;
}

// ── Fragment Types ──

export interface InteractionDefinition {
  payload: z.ZodType;
}

export interface DataFieldDefinition {
  source: string;
  params?: z.ZodType;
}

export type EmitFn<TInteractions extends Record<string, InteractionDefinition>> = <K extends keyof TInteractions>(
  interaction: K,
  payload: z.infer<TInteractions[K]['payload']>
) => void;

export interface FragmentRenderContext<
  TProps extends z.ZodType = z.ZodType,
  TData extends Record<string, DataFieldDefinition> = Record<string, DataFieldDefinition>,
  TInteractions extends Record<string, InteractionDefinition> = Record<string, InteractionDefinition>
> {
  props: z.infer<TProps>;
  data: { [K in keyof TData]: unknown };
  emit: EmitFn<TInteractions>;
}

export interface FragmentRenderProps<
  TProps extends z.ZodType = z.ZodType,
  TData extends Record<string, DataFieldDefinition> = Record<string, DataFieldDefinition>,
  TInteractions extends Record<string, InteractionDefinition> = Record<string, InteractionDefinition>
> {
  props: z.infer<TProps>;
  data: { [K in keyof TData]: unknown };
  emit: EmitFn<TInteractions>;
}

export interface FragmentDefinition<
  TProps extends z.ZodType = z.ZodType,
  TData extends Record<string, DataFieldDefinition> = Record<string, DataFieldDefinition>,
  TInteractions extends Record<string, InteractionDefinition> = Record<string, InteractionDefinition>
> {
  id: string;
  name: string;
  description?: string;
  tags?: string[];
  props: TProps;
  data: TData;
  interactions: TInteractions;
  layoutHints?: LayoutHints;
  render: (context: FragmentRenderContext<TProps, TData, TInteractions>) => ReactNode;
  /** 3P fragment metadata */
  source?: 'first-party' | 'third-party';
  packageName?: string;
}

// ── Data Source Types ──

export interface DataSourceDefinition<
  TParams extends z.ZodType = z.ZodType,
  TReturns extends z.ZodType = z.ZodType
> {
  id: string;
  name: string;
  description?: string;
  tags?: string[];
  params: TParams;
  returns: TReturns;
  ttl?: number;
  fetch: (params: z.infer<TParams>) => Promise<z.infer<TReturns>>;
  subscribe?: (params: z.infer<TParams>, emit: (data: z.infer<TReturns>) => void) => () => void;
}

// ── Data Binding Types ──

export interface DataSourceBinding {
  source: string;
  params: Record<string, unknown>;
}

export interface DataBinding {
  id: string;
  sourceFragmentInstanceId: string;
  sourceInteraction: string;
  targetFragmentInstanceId: string;
  targetType: 'prop' | 'dataParam';
  targetKey: string;
  transform?: string;
}

export interface DataFetchStep {
  dataSourceId: string;
  params: Record<string, unknown>;
  targetFragmentInstanceId: string;
  targetDataKey: string;
  dependsOn?: string[];
}

export interface DataFetchPlan {
  steps: DataFetchStep[];
}

export interface ResolvedBinding {
  id: string;
  sourceFragmentInstanceId: string;
  sourceInteraction: string;
  targetFragmentInstanceId: string;
  targetType: 'prop' | 'dataParam';
  targetKey: string;
  transform?: string;
  sourceFragmentId: string;
  targetFragmentId: string;
}

// ── Fragment Instance Types ──

export interface FragmentInstance {
  instanceId: string;
  fragmentId: string;
  props: Record<string, unknown>;
  dataBindings: Record<string, DataSourceBinding>;
  position?: LayoutPosition;
  size?: LayoutSize;
  layoutHints?: LayoutHints;
}

// ── Frame Types ──

export interface Frame {
  id: string;
  sessionId: string;
  layout: LayoutDefinition;
  fragments: FragmentInstance[];
  bindings: DataBinding[];
  createdAt: number;
  intent?: string;
}

// ── Session Types ──

export interface Session {
  id: string;
  agentId?: string;
  currentFrameId?: string;
  frameHistory: string[];
  historyIndex: number;
  metadata: Record<string, unknown>;
  createdAt: number;
  lastActiveAt: number;
}

// ── Composition Request Types ──

export interface StructuredCompositionFragment {
  fragmentId: string;
  props?: Record<string, unknown>;
  data?: Record<string, DataSourceBinding>;
  position?: LayoutPosition;
  size?: LayoutSize;
}

export interface StructuredComposition {
  fragments: StructuredCompositionFragment[];
  bindings?: DataBinding[];
  layout?: LayoutType;
  intent?: string;
}

export interface IntentComposition {
  description: string;
  constraints?: {
    dataSources?: string[];
    preferredFragments?: string[];
    layout?: LayoutType;
    interactivity?: 'low' | 'medium' | 'high';
  };
}

export type CompositionRequest =
  | { type: 'structured'; composition: StructuredComposition }
  | { type: 'intent'; composition: IntentComposition };

// ── Mutation Types ──

export type FrameMutation =
  | { action: 'add'; fragmentId: string; props?: Record<string, unknown>; data?: Record<string, DataSourceBinding>; position?: LayoutPosition }
  | { action: 'remove'; instanceId: string }
  | { action: 'replace'; instanceId: string; newFragmentId: string; props?: Record<string, unknown>; data?: Record<string, DataSourceBinding> }
  | { action: 'resize'; instanceId: string; size: { rowSpan?: number; colSpan?: number } }
  | { action: 'bind'; source: { fragmentInstanceId: string; interaction: string; field: string }; target: { fragmentInstanceId: string; prop?: string; dataParam?: string } }
  | { action: 'unbind'; bindingId: string };

export interface MutateFrameRequest {
  sessionId: string;
  frameId: string;
  mutations: FrameMutation[];
}

export interface MutateFrameResult {
  frameId: string;
  applied: number;
  failed: Array<{ index: number; error: string }>;
}

// ── Interaction Event Types ──

export interface InteractionEvent {
  frameId: string;
  fragmentInstanceId: string;
  interaction: string;
  payload: unknown;
}

// ── Server Config Types ──

export interface ThirdPartyConfig {
  autoDiscover?: boolean;
  packages?: string[];
  policy?: {
    allowNetwork?: string[];
    allowEnv?: string[];
    denyStorage?: boolean;
    maxBundleSize?: string;
  };
}

export interface ChatConfig {
  createAgentConnection?: (session: Session) => unknown;
  renderMessage?: (message: ChatMessage) => ReactNode;
  renderInput?: (props: Record<string, unknown>) => ReactNode;
  onBeforeSend?: (message: string, session: Session) => Promise<string>;
  theme?: 'dark' | 'light';
}

export interface PrevServerConfig {
  port?: number;
  hostname?: string;
  dbPath?: string;
  fragments: FragmentDefinition[];
  dataSources: DataSourceDefinition[];
  thirdParty?: ThirdPartyConfig;
  chat?: ChatConfig;
  devMode?: boolean;
}

// ── WebSocket Message Types ──

export type ClientMessage =
  | { type: 'interaction'; frameId: string; fragmentInstanceId: string; interaction: string; payload: unknown }
  | { type: 'chat'; sessionId: string; message: string }
  | { type: 'ping' };

export type ServerMessage =
  | { type: 'fragment-update'; fragmentInstanceId: string; html: string; data: Record<string, unknown> }
  | { type: 'chat-response'; message: ChatMessage }
  | { type: 'subscription-update'; fragmentInstanceId: string; dataKey: string; data: unknown }
  | { type: 'error'; message: string }
  | { type: 'pong' };

// ── Composition Result ──

export interface CompositionResult {
  frame: Frame;
  resolvedData: Map<string, Record<string, unknown>>;
  resolvedBindings: ResolvedBinding[];
}

// ── Chat Types ──

export interface ChatMessage {
  id: string;
  role: 'user' | 'agent' | 'system';
  content: string;
  timestamp: number;
  toolCalls?: ToolCallInfo[];
}

export interface ToolCallInfo {
  name: string;
  args: Record<string, unknown>;
  result?: unknown;
  status: 'pending' | 'success' | 'error';
}

// ── MCP Tool Types ──

export interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

export interface McpToolResult {
  content: Array<{ type: 'text'; text: string }>;
  isError?: boolean;
}

// ── 3P Fragment Types ──

export interface FragmentManifest {
  id: string;
  version: string;
  description?: string;
  tags?: string[];
  propsSchema: Record<string, unknown>;
  dataRequirements: Record<string, { paramsSchema: Record<string, unknown> }>;
  interactions: Record<string, { payloadSchema: Record<string, unknown> }>;
  layout?: LayoutHints;
}

export interface FragmentPackageConfig {
  fragments: string[];
  dataSources?: string[];
  permissions?: {
    network?: string[];
    storage?: boolean;
    env?: string[];
  };
}

// ── Subscription Types ──

export interface ActiveSubscription {
  dataSourceId: string;
  params: Record<string, unknown>;
  fragmentInstanceId: string;
  dataKey: string;
  unsubscribe: () => void;
}
