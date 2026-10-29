// @bundt/prev/server - building blocks for custom prev servers

export { createFragmentRegistry } from './registry/fragment-registry';
export type { FragmentRegistry } from './registry/fragment-registry';

export { createDataSourceRegistry } from './registry/data-source-registry';
export type { DataSourceRegistry } from './registry/data-source-registry';

export { createCompositionEngine } from './composition/engine';
export type { CompositionEngine } from './composition/engine';

export { createDatabase } from './server/database';
export type { PrevDatabase } from './server/database';

export { createSessionManager } from './server/session';
export type { SessionManager } from './server/session';

export { createWebSocketHandler } from './server/websocket';
export type { WebSocketHandler, WebSocketData } from './server/websocket';

export { createSubscriptionManager } from './server/subscription-manager';
export type { SubscriptionManager } from './server/subscription-manager';

export { createMcpHandler } from './server/mcp';
export type { McpHandler } from './server/mcp';

export { renderFrame, WorkspaceLayout, FragmentRenderer, FragmentSkeleton } from './server/ssr';

export { generateGlueScript } from './server/glue';

export { buildClientBundle } from './server/client-bundle';

export { resolveIntent } from './composition/intent-resolver';
