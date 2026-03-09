import {
  createFragmentRegistry,
  createDataSourceRegistry,
  createCompositionEngine,
  createDatabase,
  createSessionManager,
  createWebSocketHandler,
  createSubscriptionManager,
  createMcpHandler,
  buildClientBundle,
  renderFrame,
  generateGlueScript,
  type WebSocketData,
} from '@bundt/prev/server';
import type { FragmentDefinition, DataSourceDefinition, ServerMessage } from '@bundt/prev';
import { allFragments } from './fragments';
import { allDataSources } from './data-sources';
import { presets } from './presets';
import { generatePlaygroundHtml } from './playground-html';
import { handleCompose } from './compose';
import { handleChat } from './chat';

const port = Number(process.env['PORT'] ?? 3000);

const database = createDatabase(':memory:');
const fragmentRegistry = createFragmentRegistry(allFragments as FragmentDefinition[]);
const dataSourceRegistry = createDataSourceRegistry(allDataSources as DataSourceDefinition[]);
const compositionEngine = createCompositionEngine(fragmentRegistry, dataSourceRegistry);
const sessionManager = createSessionManager(database);
const subscriptionManager = createSubscriptionManager(dataSourceRegistry);
const wsHandler = createWebSocketHandler(
  compositionEngine,
  sessionManager,
  database,
  fragmentRegistry,
  dataSourceRegistry
);
const mcpHandler = createMcpHandler(
  compositionEngine,
  sessionManager,
  fragmentRegistry,
  dataSourceRegistry,
  wsHandler
);

const activeConnections = new Set<{ send(data: string): void }>();

function broadcast(msg: ServerMessage): void {
  const data = JSON.stringify(msg);
  for (const ws of activeConnections) {
    try { ws.send(data); } catch { /* closed */ }
  }
}

const composeDeps = {
  compositionEngine,
  sessionManager,
  fragmentRegistry,
  wsHandler,
  subscriptionManager,
  broadcast,
};

let clientBundle: string | undefined;
const playgroundHtml = generatePlaygroundHtml(allFragments.length, allDataSources.length);

async function handleRequest(req: Request, server: ReturnType<typeof Bun.serve>): Promise<Response> {
  const url = new URL(req.url);
  const path = url.pathname;

  // WebSocket upgrade
  if (path === '/ws') {
    const sessionId = url.searchParams.get('sessionId') ?? crypto.randomUUID();
    const upgraded = server.upgrade(req, { data: { sessionId } as WebSocketData });
    if (upgraded) return new Response(null, { status: 101 });
    return new Response('WebSocket upgrade failed', { status: 400 });
  }

  // Playground HTML
  if (path === '/' && req.method === 'GET') {
    return new Response(playgroundHtml, {
      headers: { 'content-type': 'text/html; charset=utf-8' },
    });
  }

  // Compose endpoint
  if (path === '/api/compose' && req.method === 'POST') {
    return handleCompose(req, composeDeps);
  }

  // Chat endpoint (Claude Messages API)
  if (path === '/api/chat' && req.method === 'POST') {
    return handleChat(req, mcpHandler);
  }

  // Presets list
  if (path === '/api/presets' && req.method === 'GET') {
    return Response.json(presets.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      fragmentCount: p.fragmentCount,
    })));
  }

  // Registry catalog
  if (path === '/api/registry' && req.method === 'GET') {
    const fragments = fragmentRegistry.list().map((f) => ({
      id: f.id,
      name: f.name,
      description: f.description,
      tags: f.tags,
      data: Object.entries(f.data).map(([key, def]) => ({ key, source: def.source })),
      interactions: Object.keys(f.interactions),
    }));
    const dataSources = dataSourceRegistry.list().map((ds) => ({
      id: ds.id,
      name: ds.name,
      description: ds.description,
      tags: ds.tags,
      ttl: ds.ttl,
      supportsSubscription: !!ds.subscribe,
    }));
    return Response.json({ fragments, dataSources });
  }

  // Frame render (SSR)
  const frameMatch = path.match(/^\/frame\/([^/]+)$/);
  if (frameMatch && req.method === 'GET') {
    const frameId = frameMatch[1]!;
    const frame = database.frames.get(frameId);
    if (!frame) return Response.json({ error: 'Frame not found' }, { status: 404 });
    const state = wsHandler.frameStates.get(frameId);
    const resolvedData = state?.resolvedData ?? new Map<string, Record<string, unknown>>();
    const stream = await renderFrame(frame, fragmentRegistry, resolvedData);
    return new Response(stream, {
      headers: {
        'content-type': 'text/html; charset=utf-8',
        'x-prev-frame-id': frame.id,
        'x-prev-session-id': frame.sessionId,
      },
    });
  }

  // Glue script
  const glueMatch = path.match(/^\/frame\/([^/]+)\/glue\.js$/);
  if (glueMatch && req.method === 'GET') {
    const state = wsHandler.frameStates.get(glueMatch[1]!);
    if (!state) {
      return new Response('// frame not found', {
        status: 404,
        headers: { 'content-type': 'application/javascript' },
      });
    }
    const glue = generateGlueScript(state.frame, state.resolvedBindings);
    return new Response(glue, {
      headers: { 'content-type': 'application/javascript; charset=utf-8' },
    });
  }

  // Client runtime bundle
  if (path === '/prev/client.js' && req.method === 'GET') {
    return new Response(clientBundle ?? '', {
      headers: { 'content-type': 'application/javascript; charset=utf-8' },
    });
  }

  return new Response('Not Found', { status: 404 });
}

async function start(): Promise<void> {
  clientBundle = await buildClientBundle();

  const server: ReturnType<typeof Bun.serve> = Bun.serve<WebSocketData>({
    port,
    fetch: (req) => handleRequest(req, server),
    websocket: {
      open(ws) {
        activeConnections.add(ws);
      },
      async message(ws, message) {
        const msgStr = typeof message === 'string' ? message : new TextDecoder().decode(message);
        await wsHandler.handleMessage(ws, msgStr);
      },
      close(ws) {
        activeConnections.delete(ws);
      },
    },
  });

  console.log(`[playground] listening on http://localhost:${port}`);
  console.log(`[playground] ${allFragments.length} fragments, ${allDataSources.length} data sources`);
  console.log(`[playground] ${presets.length} presets available`);
}

start();
