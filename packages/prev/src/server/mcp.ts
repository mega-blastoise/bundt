import type { CompositionEngine } from '../composition/engine';
import type { DataSourceRegistry } from '../registry/data-source-registry';
import type { FragmentRegistry } from '../registry/fragment-registry';
import type {
  CompositionRequest,
  LayoutType,
  McpToolDefinition,
  McpToolResult,
  MutateFrameRequest
} from '../types';
import type { SessionManager } from './session';
import type { WebSocketHandler } from './websocket';

const TOOL_DEFINITIONS: McpToolDefinition[] = [
  {
    name: 'compose_frame',
    description: 'Compose a new UI workspace from fragments and data sources.',
    inputSchema: {
      type: 'object',
      properties: {
        sessionId: { type: 'string', description: 'Session ID (optional, will create new if omitted)' },
        composition: {
          oneOf: [
            {
              type: 'object',
              properties: {
                type: { const: 'structured' },
                fragments: { type: 'array', items: { type: 'object' } },
                bindings: { type: 'array', items: { type: 'object' } },
                layout: { type: 'string' }
              },
              required: ['type', 'fragments']
            },
            {
              type: 'object',
              properties: {
                type: { const: 'intent' },
                description: { type: 'string' },
                constraints: { type: 'object' }
              },
              required: ['type', 'description']
            }
          ]
        },
        replaceCurrentFrame: { type: 'boolean', default: true }
      },
      required: ['composition']
    }
  },
  {
    name: 'mutate_frame',
    description: 'Modify the current workspace frame. Add, remove, replace, or resize fragments.',
    inputSchema: {
      type: 'object',
      properties: {
        sessionId: { type: 'string' },
        frameId: { type: 'string' },
        mutations: { type: 'array', items: { type: 'object' } }
      },
      required: ['sessionId', 'frameId', 'mutations']
    }
  },
  {
    name: 'list_fragments',
    description: 'List all available UI fragments with their schemas.',
    inputSchema: {
      type: 'object',
      properties: {
        filter: {
          type: 'object',
          properties: {
            tags: { type: 'array', items: { type: 'string' } },
            search: { type: 'string' }
          }
        }
      }
    }
  },
  {
    name: 'list_data_sources',
    description: 'List all available data sources with their schemas.',
    inputSchema: {
      type: 'object',
      properties: {
        filter: {
          type: 'object',
          properties: {
            tags: { type: 'array', items: { type: 'string' } },
            hasSubscription: { type: 'boolean' },
            search: { type: 'string' }
          }
        }
      }
    }
  },
  {
    name: 'get_frame_state',
    description: 'Get the current workspace state.',
    inputSchema: {
      type: 'object',
      properties: {
        sessionId: { type: 'string' },
        includeFragmentState: { type: 'boolean', default: false },
        includeDataCache: { type: 'boolean', default: false }
      },
      required: ['sessionId']
    }
  },
  {
    name: 'query_data',
    description: 'Query a registered data source.',
    inputSchema: {
      type: 'object',
      properties: {
        sourceId: { type: 'string' },
        params: { type: 'object' },
        limit: { type: 'number' }
      },
      required: ['sourceId']
    }
  },
  {
    name: 'navigate_history',
    description: 'Navigate the workspace frame history.',
    inputSchema: {
      type: 'object',
      properties: {
        sessionId: { type: 'string' },
        direction: { type: 'string', enum: ['back', 'forward'] },
        steps: { type: 'number', default: 1 }
      },
      required: ['sessionId', 'direction']
    }
  }
];

export interface McpHandler {
  getToolDefinitions(): McpToolDefinition[];
  handleToolCall(name: string, args: Record<string, unknown>): Promise<McpToolResult>;
  handleRequest(req: Request): Promise<Response>;
}

export function createMcpHandler(
  compositionEngine: CompositionEngine,
  sessionManager: SessionManager,
  fragmentRegistry: FragmentRegistry,
  dataSourceRegistry: DataSourceRegistry,
  wsHandler: WebSocketHandler
): McpHandler {
  function ok(data: unknown): McpToolResult {
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
  }

  function err(message: string): McpToolResult {
    return { content: [{ type: 'text', text: message }], isError: true };
  }

  async function handleToolCall(name: string, args: Record<string, unknown>): Promise<McpToolResult> {
    try {
      switch (name) {
        case 'compose_frame': return await handleComposeFrame(args);
        case 'mutate_frame': return await handleMutateFrame(args);
        case 'list_fragments': return handleListFragments(args);
        case 'list_data_sources': return handleListDataSources(args);
        case 'get_frame_state': return handleGetFrameState(args);
        case 'query_data': return await handleQueryData(args);
        case 'navigate_history': return handleNavigateHistory(args);
        default: return err(`Unknown tool: ${name}`);
      }
    } catch (error) {
      return err(error instanceof Error ? error.message : String(error));
    }
  }

  async function handleComposeFrame(args: Record<string, unknown>): Promise<McpToolResult> {
    const session = sessionManager.getOrCreateSession(args['sessionId'] as string | undefined);
    const comp = args['composition'] as Record<string, unknown>;

    let request: CompositionRequest;
    if (comp['type'] === 'intent') {
      request = {
        type: 'intent',
        composition: {
          description: comp['description'] as string,
          constraints: comp['constraints'] as CompositionRequest extends { type: 'intent' } ? CompositionRequest['composition']['constraints'] : undefined
        }
      };
    } else {
      request = {
        type: 'structured',
        composition: {
          fragments: (comp['fragments'] as Array<Record<string, unknown>>).map((f) => ({
            fragmentId: f['fragmentId'] as string,
            props: f['props'] as Record<string, unknown> | undefined,
            data: f['data'] as Record<string, { source: string; params: Record<string, unknown> }> | undefined
          })),
          bindings: comp['bindings'] as CompositionRequest extends { type: 'structured' } ? CompositionRequest['composition']['bindings'] : undefined,
          layout: comp['layout'] as LayoutType | undefined
        }
      };
    }

    const result = await compositionEngine.composeFromRequest(request, session.id);
    sessionManager.pushFrame(session.id, result.frame);
    wsHandler.registerFrame(result.frame.id, {
      frame: result.frame,
      resolvedData: result.resolvedData,
      resolvedBindings: result.resolvedBindings
    });

    return ok({
      frameId: result.frame.id,
      sessionId: session.id,
      fragmentCount: result.frame.fragments.length,
      layout: result.frame.layout.type,
      fragments: result.frame.fragments.map((f) => ({ instanceId: f.instanceId, fragmentId: f.fragmentId }))
    });
  }

  async function handleMutateFrame(args: Record<string, unknown>): Promise<McpToolResult> {
    const req = args as unknown as MutateFrameRequest;
    const state = wsHandler.frameStates.get(req.frameId);
    if (!state) return err(`Frame "${req.frameId}" not found`);

    const result = await compositionEngine.mutateFrame(state.frame, req.mutations, state.resolvedData);
    sessionManager.pushFrame(req.sessionId, result.frame);
    wsHandler.registerFrame(result.frame.id, {
      frame: result.frame,
      resolvedData: result.resolvedData,
      resolvedBindings: []
    });

    return ok({ frameId: result.frameId, applied: result.applied, failed: result.failed });
  }

  function handleListFragments(args: Record<string, unknown>): McpToolResult {
    const filter = args['filter'] as { tags?: string[]; search?: string } | undefined;
    let fragments = fragmentRegistry.list(filter?.tags ? { tags: filter.tags } : undefined);

    if (filter?.search) {
      const search = filter.search.toLowerCase();
      fragments = fragments.filter((f) =>
        f.id.toLowerCase().includes(search) ||
        f.name.toLowerCase().includes(search) ||
        f.description?.toLowerCase().includes(search)
      );
    }

    return ok({
      fragments: fragments.map((f) => ({
        id: f.id,
        name: f.name,
        description: f.description,
        tags: f.tags,
        data: Object.entries(f.data).map(([key, def]) => ({ key, source: def.source })),
        interactions: Object.keys(f.interactions),
        layoutHints: f.layoutHints,
        source: f.source ?? 'first-party',
        packageName: f.packageName
      }))
    });
  }

  function handleListDataSources(args: Record<string, unknown>): McpToolResult {
    const filter = args['filter'] as { tags?: string[]; hasSubscription?: boolean; search?: string } | undefined;
    let sources = dataSourceRegistry.list(filter?.tags ? { tags: filter.tags } : undefined);

    if (filter?.search) {
      const search = filter.search.toLowerCase();
      sources = sources.filter((ds) =>
        ds.id.toLowerCase().includes(search) ||
        ds.name.toLowerCase().includes(search) ||
        ds.description?.toLowerCase().includes(search)
      );
    }

    if (filter?.hasSubscription !== undefined) {
      sources = sources.filter((ds) => !!ds.subscribe === filter.hasSubscription);
    }

    return ok({
      dataSources: sources.map((ds) => ({
        id: ds.id,
        name: ds.name,
        description: ds.description,
        tags: ds.tags,
        ttl: ds.ttl,
        supportsSubscription: !!ds.subscribe,
        source: 'first-party'
      }))
    });
  }

  function handleGetFrameState(args: Record<string, unknown>): McpToolResult {
    const sessionId = args['sessionId'] as string;
    const frame = sessionManager.getSessionFrame(sessionId);
    if (!frame) return err('No active frame for session');

    const session = sessionManager.getOrCreateSession(sessionId);

    return ok({
      frame: {
        id: frame.id,
        layout: frame.layout.type,
        fragments: frame.fragments.map((f) => ({
          instanceId: f.instanceId,
          fragmentId: f.fragmentId,
          props: f.props,
          position: f.position
        })),
        bindings: frame.bindings
      },
      session: {
        historyLength: session.frameHistory.length,
        historyIndex: session.historyIndex
      }
    });
  }

  async function handleQueryData(args: Record<string, unknown>): Promise<McpToolResult> {
    const sourceId = args['sourceId'] as string;
    const params = (args['params'] as Record<string, unknown>) ?? {};

    if (!dataSourceRegistry.has(sourceId)) {
      return err(`Data source "${sourceId}" not found`);
    }

    const ds = dataSourceRegistry.get(sourceId);
    const data = await ds.fetch(params);

    let result = data;
    let truncated = false;
    const limit = args['limit'] as number | undefined;
    if (limit && Array.isArray(data)) {
      result = data.slice(0, limit);
      truncated = data.length > limit;
    }

    return ok({ data: result, rowCount: Array.isArray(data) ? data.length : undefined, truncated });
  }

  function handleNavigateHistory(args: Record<string, unknown>): McpToolResult {
    const sessionId = args['sessionId'] as string;
    const direction = args['direction'] as 'back' | 'forward';
    const steps = (args['steps'] as number) ?? 1;

    const frame = sessionManager.navigateHistory(sessionId, direction, steps);
    if (!frame) return err(`Cannot navigate ${direction} ${steps} step(s)`);

    const session = sessionManager.getOrCreateSession(sessionId);
    return ok({
      frameId: frame.id,
      historyIndex: session.historyIndex,
      historyLength: session.frameHistory.length
    });
  }

  function handleRequest(req: Request): Promise<Response> {
    const url = new URL(req.url);
    const path = url.pathname;

    if (path === '/mcp/tools' && req.method === 'GET') {
      return Promise.resolve(Response.json({ tools: TOOL_DEFINITIONS }));
    }

    if (path === '/mcp/tools/call' && req.method === 'POST') {
      return req.json().then(async (body: { name: string; arguments: Record<string, unknown> }) => {
        const result = await handleToolCall(body.name, body.arguments ?? {});
        return Response.json(result);
      });
    }

    return Promise.resolve(new Response('Not Found', { status: 404 }));
  }

  return { getToolDefinitions: () => TOOL_DEFINITIONS, handleToolCall, handleRequest };
}
