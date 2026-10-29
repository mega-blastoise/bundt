import { createCompositionEngine } from '../composition/engine';
import { createDataSourceRegistry } from '../registry/data-source-registry';
import { createFragmentRegistry } from '../registry/fragment-registry';
import { loadThirdPartyPackages } from '../registry/third-party-loader';
import type { CompositionResult, PrevServerConfig, ServerMessage, StructuredComposition } from '../types';
import { generateChatCSS } from './chat-panel';
import { buildClientBundle } from './client-bundle';
import { createDatabase } from './database';
import { generateGlueScript } from './glue';
import { createMcpHandler } from './mcp';
import { createSessionManager } from './session';
import { renderFrame } from './ssr';
import { createSubscriptionManager } from './subscription-manager';
import { createWebSocketHandler, type WebSocketData } from './websocket';

export interface PrevServer {
  listen(): void;
  close(): void;
}

export function createPrevServer(config: PrevServerConfig): PrevServer {
  const port = config.port ?? 3000;
  const hostname = config.hostname ?? 'localhost';
  const dbPath = config.dbPath ?? ':memory:';
  const devMode = config.devMode ?? false;

  const database = createDatabase(dbPath);
  const fragmentRegistry = createFragmentRegistry(config.fragments);
  const dataSourceRegistry = createDataSourceRegistry(config.dataSources);
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

  // Track active WebSocket connections for broadcasting
  const activeConnections = new Set<{ send(data: string): void }>();

  let clientBundle: string | undefined;
  let server: ReturnType<typeof Bun.serve> | undefined;

  function broadcast(msg: ServerMessage): void {
    const data = JSON.stringify(msg);
    for (const ws of activeConnections) {
      try { ws.send(data); } catch { /* connection closed */ }
    }
  }

  async function handleRequest(req: Request): Promise<Response> {
    const url = new URL(req.url);
    const path = url.pathname;

    // WebSocket upgrade
    if (path === '/prev/ws') {
      const sessionId = url.searchParams.get('sessionId') ?? crypto.randomUUID();
      const upgraded = server!.upgrade(req, { data: { sessionId } as WebSocketData });
      if (upgraded) return new Response(null, { status: 101 });
      return new Response('WebSocket upgrade failed', { status: 400 });
    }

    // ── Home: Workspace + Chat shell ──
    if (path === '/' && req.method === 'GET') {
      return new Response(generateWorkspaceShell(config), {
        headers: { 'content-type': 'text/html; charset=utf-8' }
      });
    }

    // ── Dev playground ──
    if (path === '/dev' && req.method === 'GET') {
      return new Response(PLAYGROUND_HTML, {
        headers: { 'content-type': 'text/html; charset=utf-8' }
      });
    }

    // ── Composition ──
    if (path === '/prev/compose' && req.method === 'POST') {
      return handleCompose(req);
    }

    // ── Frame restore ──
    const frameMatch = path.match(/^\/prev\/frame\/([^/]+)$/);
    if (frameMatch && req.method === 'GET') {
      return handleFrameRestore(frameMatch[1]!);
    }

    // ── Glue bundle ──
    const glueMatch = path.match(/^\/prev\/frame\/([^/]+)\/glue\.js$/);
    if (glueMatch && req.method === 'GET') {
      return handleGlueBundle(glueMatch[1]!);
    }

    // ── Client runtime bundle ──
    if (path === '/prev/client.js' && req.method === 'GET') {
      return new Response(clientBundle ?? '', {
        headers: { 'content-type': 'application/javascript; charset=utf-8' }
      });
    }

    // ── MCP routes ──
    if (path.startsWith('/mcp/')) {
      return mcpHandler.handleRequest(req);
    }

    // ── API routes ──
    if (path === '/prev/api/registry' && req.method === 'GET') {
      return handleRegistryApi();
    }

    if (path === '/prev/api/session' && req.method === 'GET') {
      return handleSessionApi(url);
    }

    if (path === '/prev/api/subscribe-info' && req.method === 'GET') {
      return Response.json({ activeSubscriptions: subscriptionManager.activeCount() });
    }

    return new Response('Not Found', { status: 404 });
  }

  function handleRegistryApi(): Response {
    const fragments = fragmentRegistry.list().map((f) => ({
      id: f.id,
      name: f.name,
      description: f.description,
      tags: f.tags,
      data: Object.entries(f.data).map(([key, def]) => ({ key, source: def.source })),
      interactions: Object.keys(f.interactions),
      source: f.source ?? 'first-party',
      packageName: f.packageName
    }));
    const dataSources = dataSourceRegistry.list().map((ds) => ({
      id: ds.id,
      name: ds.name,
      description: ds.description,
      tags: ds.tags,
      ttl: ds.ttl,
      supportsSubscription: !!ds.subscribe
    }));
    return Response.json({ fragments, dataSources });
  }

  function handleSessionApi(url: URL): Response {
    const sessionId = url.searchParams.get('sessionId');
    if (!sessionId) return Response.json({ error: 'sessionId required' }, { status: 400 });
    const session = database.sessions.get(sessionId);
    if (!session) return Response.json({ error: 'session not found' }, { status: 404 });
    return Response.json(session);
  }

  async function handleCompose(req: Request): Promise<Response> {
    let body: StructuredComposition;
    try {
      body = (await req.json()) as StructuredComposition;
    } catch {
      return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const sessionId = new URL(req.url).searchParams.get('sessionId');
    const session = sessionManager.getOrCreateSession(sessionId ?? undefined);

    try {
      const result = await compositionEngine.compose(body, session.id);
      sessionManager.pushFrame(session.id, result.frame);

      wsHandler.registerFrame(result.frame.id, {
        frame: result.frame,
        resolvedData: result.resolvedData,
        resolvedBindings: result.resolvedBindings
      });

      // Setup subscriptions for reactive data sources
      subscriptionManager.setupFrameSubscriptions(result.frame, result.resolvedData, broadcast);

      const stream = await renderFrame(result.frame, fragmentRegistry, result.resolvedData);

      return new Response(stream, {
        headers: {
          'content-type': 'text/html; charset=utf-8',
          'x-prev-session-id': session.id,
          'x-prev-frame-id': result.frame.id
        }
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Composition failed';
      return Response.json({ error: message }, { status: 400 });
    }
  }

  async function handleFrameRestore(frameId: string): Promise<Response> {
    const frame = database.frames.get(frameId);
    if (!frame) return Response.json({ error: 'Frame not found' }, { status: 404 });

    const state = wsHandler.frameStates.get(frameId);
    const resolvedData = state?.resolvedData ?? new Map<string, Record<string, unknown>>();

    const stream = await renderFrame(frame, fragmentRegistry, resolvedData);
    return new Response(stream, {
      headers: {
        'content-type': 'text/html; charset=utf-8',
        'x-prev-frame-id': frame.id,
        'x-prev-session-id': frame.sessionId
      }
    });
  }

  function handleGlueBundle(frameId: string): Response {
    const state = wsHandler.frameStates.get(frameId);
    if (!state) {
      return new Response('// frame not found', {
        status: 404,
        headers: { 'content-type': 'application/javascript' }
      });
    }

    const glue = generateGlueScript(state.frame, state.resolvedBindings);
    return new Response(glue, {
      headers: { 'content-type': 'application/javascript; charset=utf-8' }
    });
  }

  async function init(): Promise<void> {
    // Load 3P fragments if configured
    if (config.thirdParty) {
      const loadResult = await loadThirdPartyPackages(config.thirdParty, fragmentRegistry, dataSourceRegistry);
      if (devMode || loadResult.errors.length > 0) {
        console.log(`[prev] 3P load: ${loadResult.fragments} fragments, ${loadResult.dataSources} data sources`);
        for (const err of loadResult.errors) {
          console.warn(`[prev] 3P error (${err.package}): ${err.error}`);
        }
      }
    }

    clientBundle = await buildClientBundle();
  }

  function listen(): void {
    init().then(() => {
      server = Bun.serve<WebSocketData>({
        port,
        hostname,
        fetch: handleRequest,
        websocket: {
          open(ws) {
            activeConnections.add(ws);
            if (devMode) console.log(`[prev] WS connected: ${ws.data.sessionId}`);
          },
          async message(ws, message) {
            const msgStr = typeof message === 'string' ? message : new TextDecoder().decode(message);
            await wsHandler.handleMessage(ws, msgStr);
          },
          close(ws) {
            activeConnections.delete(ws);
            if (devMode) console.log(`[prev] WS disconnected: ${ws.data.sessionId}`);
          }
        }
      });

      console.log(`[prev] server listening on http://${hostname}:${port}`);
      if (devMode) console.log(`[prev] dev playground at http://${hostname}:${port}/dev`);
      console.log(`[prev] MCP tools at http://${hostname}:${port}/mcp/tools`);
      console.log(`[prev] ${fragmentRegistry.list().length} fragments, ${dataSourceRegistry.list().length} data sources registered`);
    });
  }

  function close(): void {
    subscriptionManager.teardownAll();
    server?.stop();
    database.close();
  }

  return { listen, close };
}

// ── Workspace shell (home route) ──

function generateWorkspaceShell(config: PrevServerConfig): string {
  const chatCSS = generateChatCSS(config.chat?.theme ?? 'dark');

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>prev workspace</title>
  <style>
    :root {
      --prev-bg: #09090b;
      --prev-border: #1e1e2a;
      --prev-text: #f0f0f5;
      --prev-text-muted: #6b6b80;
      --prev-accent: #3b82f6;
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: system-ui, -apple-system, sans-serif; background: var(--prev-bg); color: var(--prev-text); height: 100vh; overflow: hidden; }
    .prev-app { display: flex; height: 100vh; }
    .prev-workspace {
      flex: 1;
      display: flex;
      flex-direction: column;
      min-width: 0;
    }
    .prev-workspace__header {
      height: 40px;
      padding: 0 16px;
      display: flex;
      align-items: center;
      gap: 12px;
      border-bottom: 1px solid var(--prev-border);
      flex-shrink: 0;
      font-size: 13px;
    }
    .prev-workspace__header h1 { font-size: 14px; font-weight: 600; }
    .prev-workspace__header h1 span { color: var(--prev-accent); }
    .prev-workspace__content {
      flex: 1;
      position: relative;
      overflow: auto;
    }
    .prev-workspace__content iframe {
      width: 100%;
      height: 100%;
      border: none;
      background: white;
    }
    .prev-workspace__empty {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100%;
      color: var(--prev-text-muted);
      font-size: 14px;
    }
    .prev-chat-container {
      width: 340px;
      flex-shrink: 0;
      height: 100vh;
    }
    .prev-divider {
      width: 4px;
      cursor: col-resize;
      background: var(--prev-border);
      flex-shrink: 0;
      transition: background 0.15s;
    }
    .prev-divider:hover { background: var(--prev-accent); }
    ${chatCSS}
  </style>
</head>
<body>
  <div class="prev-app">
    <div class="prev-workspace">
      <div class="prev-workspace__header">
        <h1><span>prev</span> workspace</h1>
        <span id="frameInfo" style="font-size:11px;font-family:monospace;color:var(--prev-text-muted)"></span>
        <span style="margin-left:auto;font-size:11px;color:var(--prev-text-muted)">
          <a href="/dev" style="color:var(--prev-accent);text-decoration:none">Dev Playground</a>
        </span>
      </div>
      <div class="prev-workspace__content" id="workspaceContent">
        <div class="prev-workspace__empty" id="emptyState">
          <div style="text-align:center">
            <div style="font-size:32px;opacity:0.15;margin-bottom:8px">&#x25A3;</div>
            <div>No workspace composed yet</div>
            <div style="font-size:12px;margin-top:4px">Use the agent chat or <a href="/dev" style="color:var(--prev-accent)">dev playground</a> to compose a workspace</div>
          </div>
        </div>
        <iframe id="viewport" style="display:none"></iframe>
      </div>
    </div>
    <div class="prev-divider" id="divider"></div>
    <div class="prev-chat-container">
      <div class="prev-chat-panel">
        <div class="prev-chat-header">
          <span class="prev-chat-header__title">Agent</span>
          <span class="prev-chat-header__status prev-chat-header__status--disconnected" id="chatStatus">Disconnected</span>
        </div>
        <div class="prev-chat-messages" id="chatMessages">
          <div class="prev-chat-message prev-chat-message--system">
            <div class="prev-chat-message__content">Welcome to prev. Connect an MCP-compatible agent to compose dynamic workspaces.</div>
          </div>
        </div>
        <form class="prev-chat-input" id="chatForm">
          <input type="text" name="message" placeholder="Message the agent..." autocomplete="off" class="prev-chat-input__field" id="chatInput" />
          <button type="submit" class="prev-chat-input__send">Send</button>
        </form>
      </div>
    </div>
  </div>
  <script>
  (function() {
    var sessionId = null;
    var proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    var ws;

    function connectWs() {
      var url = proto + '//' + window.location.host + '/prev/ws';
      if (sessionId) url += '?sessionId=' + encodeURIComponent(sessionId);
      ws = new WebSocket(url);
      ws.onopen = function() {
        document.getElementById('chatStatus').className = 'prev-chat-header__status prev-chat-header__status--connected';
        document.getElementById('chatStatus').textContent = 'Connected';
      };
      ws.onclose = function() {
        document.getElementById('chatStatus').className = 'prev-chat-header__status prev-chat-header__status--disconnected';
        document.getElementById('chatStatus').textContent = 'Disconnected';
        setTimeout(connectWs, 2000);
      };
      ws.onmessage = function(event) {
        var msg = JSON.parse(event.data);
        if (msg.type === 'chat-response') {
          addChatMessage(msg.message);
        }
      };
    }

    function addChatMessage(msg) {
      var el = document.createElement('div');
      el.className = 'prev-chat-message prev-chat-message--' + msg.role;
      var html = '';
      if (msg.role !== 'system') html += '<div class="prev-chat-message__author">' + (msg.role === 'user' ? 'You' : 'Agent') + '</div>';
      html += '<div class="prev-chat-message__content">' + escapeHtml(msg.content) + '</div>';
      el.innerHTML = html;
      document.getElementById('chatMessages').appendChild(el);
      document.getElementById('chatMessages').scrollTop = document.getElementById('chatMessages').scrollHeight;
    }

    function escapeHtml(s) { var d = document.createElement('div'); d.textContent = s; return d.innerHTML; }

    document.getElementById('chatForm').addEventListener('submit', function(e) {
      e.preventDefault();
      var input = document.getElementById('chatInput');
      var msg = input.value.trim();
      if (!msg || !ws || ws.readyState !== WebSocket.OPEN) return;
      addChatMessage({ role: 'user', content: msg });
      ws.send(JSON.stringify({ type: 'chat', sessionId: sessionId, message: msg }));
      input.value = '';
    });

    // Divider resize
    var divider = document.getElementById('divider');
    var chatContainer = document.querySelector('.prev-chat-container');
    divider.addEventListener('mousedown', function(e) {
      e.preventDefault();
      var startX = e.clientX;
      var startW = chatContainer.offsetWidth;
      function onMove(e2) {
        var newW = startW + (startX - e2.clientX);
        chatContainer.style.width = Math.max(240, Math.min(600, newW)) + 'px';
      }
      function onUp() { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); }
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    });

    connectWs();
  })();
  </script>
</body>
</html>`;
}

// ── Dev Playground HTML ──

const PLAYGROUND_HTML = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>prev dev playground</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Fira+Sans:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
  <style>
    :root {
      --bg-0: #09090b; --bg-1: #0c0c0f; --bg-2: #131318; --bg-3: #1a1a22;
      --border: #1e1e2a; --border-hover: #2a2a3a; --border-active: #3b82f6;
      --text-0: #f0f0f5; --text-1: #b0b0c0; --text-2: #6b6b80; --text-3: #3e3e50;
      --accent: #3b82f6; --accent-hover: #2563eb; --accent-dim: #1d4ed8;
      --green: #22c55e; --green-dim: #052e16; --red: #ef4444; --red-dim: #450a0a;
      --yellow: #eab308; --yellow-dim: #422006; --blue-dim: #172554;
      --sans: 'Fira Sans', system-ui, -apple-system, sans-serif;
      --mono: 'JetBrains Mono', 'SF Mono', monospace;
      --radius: 6px; --radius-lg: 8px;
    }

    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: var(--sans); background: var(--bg-0); color: var(--text-1); height: 100vh; display: flex; flex-direction: column; overflow: hidden; -webkit-font-smoothing: antialiased; }

    .pg-header { height: 48px; padding: 0 20px; display: flex; align-items: center; gap: 16px; border-bottom: 1px solid var(--border); flex-shrink: 0; background: var(--bg-1); }
    .pg-logo { display: flex; align-items: center; gap: 10px; }
    .pg-logo h1 { font-size: 0.9375rem; font-weight: 600; color: var(--text-0); letter-spacing: -0.02em; }
    .pg-logo h1 span { color: var(--accent); }
    .pg-logo .pg-version { font-size: 0.6875rem; font-family: var(--mono); color: var(--text-3); background: var(--bg-3); padding: 2px 6px; border-radius: 3px; }
    .pg-header-meta { margin-left: auto; display: flex; align-items: center; gap: 12px; }
    .pg-session-pill { font-size: 0.6875rem; font-family: var(--mono); color: var(--text-2); background: var(--bg-2); padding: 3px 8px; border-radius: 3px; display: none; }
    .pg-session-pill.visible { display: inline-flex; align-items: center; gap: 6px; }
    .pg-session-pill .pg-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--green); flex-shrink: 0; }
    .pg-kbd-hint { font-size: 0.6875rem; color: var(--text-3); }
    .pg-kbd-hint kbd { font-family: var(--mono); font-size: 0.625rem; padding: 1px 5px; border: 1px solid var(--border); border-radius: 3px; background: var(--bg-2); color: var(--text-2); }

    .pg-main { display: flex; flex: 1; min-height: 0; }

    .pg-sidebar { width: 380px; flex-shrink: 0; border-right: 1px solid var(--border); display: flex; flex-direction: column; overflow: hidden; background: var(--bg-1); }
    .pg-tabs { display: flex; border-bottom: 1px solid var(--border); flex-shrink: 0; }
    .pg-tab { flex: 1; padding: 10px 12px; font-size: 0.8125rem; font-weight: 500; font-family: var(--sans); text-align: center; cursor: pointer; border: none; background: none; color: var(--text-2); border-bottom: 2px solid transparent; transition: all 0.15s; }
    .pg-tab:hover { color: var(--text-1); background: var(--bg-2); }
    .pg-tab.active { color: var(--accent); border-bottom-color: var(--accent); }

    .pg-panel { flex: 1; overflow-y: auto; display: none; }
    .pg-panel.active { display: flex; flex-direction: column; }
    .pg-panel::-webkit-scrollbar { width: 6px; }
    .pg-panel::-webkit-scrollbar-track { background: transparent; }
    .pg-panel::-webkit-scrollbar-thumb { background: var(--bg-3); border-radius: 3px; }

    .pg-compose-panel { padding: 16px; gap: 16px; }
    .pg-section { display: flex; flex-direction: column; gap: 8px; }
    .pg-section-label { font-size: 0.6875rem; font-weight: 600; color: var(--text-2); text-transform: uppercase; letter-spacing: 0.06em; }

    .pg-fragment-picker { display: flex; flex-direction: column; gap: 6px; }
    .pg-fragment-card { padding: 10px 12px; border: 1px solid var(--border); border-radius: var(--radius); cursor: pointer; transition: all 0.15s; position: relative; }
    .pg-fragment-card::before { content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 3px; border-radius: var(--radius) 0 0 var(--radius); background: transparent; transition: background 0.15s; }
    .pg-fragment-card:hover { border-color: var(--border-hover); background: var(--bg-2); }
    .pg-fragment-card.selected { border-color: var(--border-active); background: rgba(59,130,246,0.04); }
    .pg-fragment-card.selected::before { background: var(--accent); }
    .pg-fc-header { display: flex; align-items: center; justify-content: space-between; }
    .pg-fc-name { font-size: 0.8125rem; font-weight: 500; color: var(--text-0); }
    .pg-fc-id { font-size: 0.6875rem; font-family: var(--mono); color: var(--text-3); }
    .pg-fc-desc { font-size: 0.75rem; color: var(--text-2); margin-top: 3px; line-height: 1.4; }
    .pg-fc-pills { display: flex; gap: 4px; flex-wrap: wrap; margin-top: 6px; }
    .pg-pill { font-size: 0.625rem; font-family: var(--mono); padding: 2px 6px; border-radius: 3px; }
    .pg-pill-tag { background: var(--bg-3); color: var(--text-2); }
    .pg-pill-data { background: var(--blue-dim); color: #60a5fa; }
    .pg-pill-emit { background: var(--yellow-dim); color: var(--yellow); }
    .pg-fc-check { width: 16px; height: 16px; border-radius: 4px; border: 1.5px solid var(--border); display: flex; align-items: center; justify-content: center; flex-shrink: 0; transition: all 0.15s; }
    .pg-fragment-card.selected .pg-fc-check { border-color: var(--accent); background: var(--accent); }
    .pg-fc-check svg { opacity: 0; transition: opacity 0.1s; }
    .pg-fragment-card.selected .pg-fc-check svg { opacity: 1; }

    .pg-layout-picker { display: grid; grid-template-columns: repeat(4, 1fr); gap: 4px; }
    .pg-layout-btn { padding: 6px 2px; border: 1px solid var(--border); border-radius: var(--radius); background: none; color: var(--text-2); font-size: 0.6875rem; font-family: var(--sans); cursor: pointer; transition: all 0.15s; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 3px; }
    .pg-layout-btn:hover { border-color: var(--border-hover); background: var(--bg-2); }
    .pg-layout-btn.active { border-color: var(--accent); color: var(--accent); background: rgba(59,130,246,0.06); }
    .pg-layout-icon { font-size: 0.875rem; line-height: 1; }

    .pg-presets { display: flex; flex-direction: column; gap: 4px; }
    .pg-preset-btn { padding: 8px 10px; border: 1px solid var(--border); border-radius: var(--radius); background: none; color: var(--text-1); font-size: 0.8125rem; font-family: var(--sans); cursor: pointer; transition: all 0.15s; text-align: left; display: flex; align-items: center; gap: 8px; }
    .pg-preset-btn:hover { border-color: var(--border-hover); background: var(--bg-2); }
    .pg-preset-btn .pg-preset-icon { font-size: 0.875rem; }
    .pg-preset-btn .pg-preset-label { font-weight: 500; }
    .pg-preset-btn .pg-preset-desc { font-size: 0.6875rem; color: var(--text-2); margin-left: auto; }

    .pg-actions { margin-top: auto; padding: 16px; border-top: 1px solid var(--border); display: flex; gap: 8px; flex-shrink: 0; }
    .pg-compose-btn { flex: 1; padding: 10px 16px; border: none; border-radius: var(--radius); background: var(--accent); color: white; font-size: 0.8125rem; font-weight: 500; font-family: var(--sans); cursor: pointer; transition: all 0.15s; display: flex; align-items: center; justify-content: center; gap: 6px; }
    .pg-compose-btn:hover { background: var(--accent-hover); }
    .pg-compose-btn:disabled { background: var(--bg-3); color: var(--text-3); cursor: not-allowed; }
    .pg-reset-btn { padding: 10px 12px; border: 1px solid var(--border); border-radius: var(--radius); background: none; color: var(--text-2); font-size: 0.8125rem; font-family: var(--sans); cursor: pointer; transition: all 0.15s; }
    .pg-reset-btn:hover { border-color: var(--border-hover); background: var(--bg-2); color: var(--text-1); }

    .pg-json-panel { position: relative; }
    .pg-json-wrap { flex: 1; position: relative; }
    .pg-json-editor { width: 100%; height: 100%; background: var(--bg-0); color: var(--text-0); border: none; resize: none; padding: 16px; font-family: var(--mono); font-size: 0.8125rem; line-height: 1.7; outline: none; tab-size: 2; }
    .pg-json-editor::placeholder { color: var(--text-3); }
    .pg-json-actions { padding: 12px 16px; border-top: 1px solid var(--border); display: flex; gap: 8px; flex-shrink: 0; }
    .pg-json-hint { font-size: 0.6875rem; color: var(--text-3); margin-left: auto; align-self: center; }
    .pg-json-hint kbd { font-family: var(--mono); font-size: 0.625rem; padding: 1px 5px; border: 1px solid var(--border); border-radius: 3px; background: var(--bg-2); color: var(--text-2); }

    .pg-mcp-panel { padding: 16px; gap: 12px; }
    .pg-mcp-tool { padding: 10px 12px; border: 1px solid var(--border); border-radius: var(--radius); cursor: pointer; transition: all 0.15s; }
    .pg-mcp-tool:hover { border-color: var(--border-hover); background: var(--bg-2); }
    .pg-mcp-tool__name { font-size: 0.8125rem; font-weight: 500; color: var(--text-0); font-family: var(--mono); }
    .pg-mcp-tool__desc { font-size: 0.75rem; color: var(--text-2); margin-top: 3px; }

    .pg-viewport { flex: 1; display: flex; flex-direction: column; background: var(--bg-0); }
    .pg-viewport-bar { height: 36px; padding: 0 16px; border-bottom: 1px solid var(--border); display: flex; align-items: center; gap: 10px; flex-shrink: 0; background: var(--bg-1); }
    .pg-status { font-size: 0.6875rem; font-weight: 500; font-family: var(--mono); padding: 2px 8px; border-radius: 3px; text-transform: uppercase; letter-spacing: 0.03em; }
    .pg-status.idle { background: var(--bg-3); color: var(--text-2); }
    .pg-status.loading { background: var(--blue-dim); color: #60a5fa; }
    .pg-status.ready { background: var(--green-dim); color: var(--green); }
    .pg-status.error { background: var(--red-dim); color: var(--red); }
    .pg-frame-id { font-size: 0.6875rem; font-family: var(--mono); color: var(--text-3); }
    .pg-response-meta { font-size: 0.6875rem; font-family: var(--mono); color: var(--text-3); margin-left: auto; display: flex; gap: 12px; }
    .pg-response-meta span { display: flex; align-items: center; gap: 4px; }

    .pg-viewport-content { flex: 1; display: flex; min-height: 0; }
    .pg-viewport iframe { width: 100%; height: 100%; border: none; background: white; border-radius: 0; }
    .pg-empty { width: 100%; display: flex; align-items: center; justify-content: center; }
    .pg-empty-inner { text-align: center; }
    .pg-empty-inner .pg-empty-icon { font-size: 2.5rem; margin-bottom: 12px; opacity: 0.15; }
    .pg-empty-inner h2 { font-size: 1rem; font-weight: 400; color: var(--text-2); margin-bottom: 4px; }
    .pg-empty-inner p { font-size: 0.8125rem; color: var(--text-3); }

    .pg-log { border-top: 1px solid var(--border); height: 140px; overflow-y: auto; flex-shrink: 0; background: var(--bg-1); }
    .pg-log::-webkit-scrollbar { width: 6px; }
    .pg-log::-webkit-scrollbar-track { background: transparent; }
    .pg-log::-webkit-scrollbar-thumb { background: var(--bg-3); border-radius: 3px; }
    .pg-log-header { position: sticky; top: 0; padding: 6px 16px; font-size: 0.6875rem; font-weight: 600; color: var(--text-3); text-transform: uppercase; letter-spacing: 0.06em; background: var(--bg-1); border-bottom: 1px solid var(--border); display: flex; align-items: center; justify-content: space-between; z-index: 1; }
    .pg-log-clear { font-size: 0.6875rem; font-family: var(--sans); color: var(--text-3); background: none; border: none; cursor: pointer; padding: 0; text-transform: uppercase; letter-spacing: 0.06em; font-weight: 600; }
    .pg-log-clear:hover { color: var(--text-2); }
    .pg-log-entry { padding: 3px 16px 3px 28px; font-size: 0.75rem; font-family: var(--mono); line-height: 1.7; position: relative; }
    .pg-log-entry::before { content: ''; position: absolute; left: 16px; top: 10px; width: 4px; height: 4px; border-radius: 50%; }
    .pg-log-entry.info { color: var(--text-2); }
    .pg-log-entry.info::before { background: var(--text-3); }
    .pg-log-entry.success { color: var(--green); }
    .pg-log-entry.success::before { background: var(--green); }
    .pg-log-entry.error { color: var(--red); }
    .pg-log-entry.error::before { background: var(--red); }
    .pg-log-entry.warn { color: var(--yellow); }
    .pg-log-entry.warn::before { background: var(--yellow); }
    .pg-log-entry .pg-log-time { color: var(--text-3); margin-right: 8px; }
  </style>
</head>
<body>
  <div class="pg-header">
    <div class="pg-logo">
      <h1><span>prev</span> dev playground</h1>
      <span class="pg-version">v0.1.0</span>
    </div>
    <div class="pg-header-meta">
      <a href="/" style="font-size:0.75rem;color:var(--accent);text-decoration:none">Workspace</a>
      <span class="pg-session-pill" id="sessionPill"><span class="pg-dot"></span><span id="sessionDisplay"></span></span>
      <span class="pg-kbd-hint"><kbd>Ctrl</kbd>+<kbd>Enter</kbd> compose</span>
    </div>
  </div>

  <div class="pg-main">
    <div class="pg-sidebar">
      <div class="pg-tabs">
        <button class="pg-tab active" data-tab="compose">Compose</button>
        <button class="pg-tab" data-tab="json">JSON</button>
        <button class="pg-tab" data-tab="mcp">MCP</button>
        <button class="pg-tab" data-tab="registry">Registry</button>
      </div>

      <div class="pg-panel pg-compose-panel active" id="composePanel">
        <div class="pg-section">
          <div class="pg-section-label">Quick Presets</div>
          <div class="pg-presets" id="presetPicker"></div>
        </div>
        <div class="pg-section">
          <div class="pg-section-label">Fragments</div>
          <div class="pg-fragment-picker" id="fragmentPicker"></div>
        </div>
        <div class="pg-section">
          <div class="pg-section-label">Layout</div>
          <div class="pg-layout-picker" id="layoutPicker">
            <button class="pg-layout-btn active" data-layout="auto"><span class="pg-layout-icon">&#x25A3;</span>Auto</button>
            <button class="pg-layout-btn" data-layout="single"><span class="pg-layout-icon">&#x25A0;</span>Single</button>
            <button class="pg-layout-btn" data-layout="split-horizontal"><span class="pg-layout-icon">&#x25EB;</span>Split H</button>
            <button class="pg-layout-btn" data-layout="split-vertical"><span class="pg-layout-icon">&#x2B12;</span>Split V</button>
            <button class="pg-layout-btn" data-layout="grid"><span class="pg-layout-icon">&#x25A6;</span>Grid</button>
            <button class="pg-layout-btn" data-layout="primary-detail"><span class="pg-layout-icon">&#x25E7;</span>Primary</button>
            <button class="pg-layout-btn" data-layout="dashboard"><span class="pg-layout-icon">&#x2B1A;</span>Dash</button>
          </div>
        </div>
      </div>

      <div class="pg-panel pg-json-panel" id="jsonPanel">
        <div class="pg-json-wrap">
          <textarea class="pg-json-editor" id="jsonEditor" spellcheck="false" placeholder='{ "fragments": [ ... ] }'></textarea>
        </div>
        <div class="pg-json-actions">
          <button class="pg-compose-btn" id="jsonComposeBtn">Send JSON</button>
          <span class="pg-json-hint"><kbd>Ctrl</kbd>+<kbd>Enter</kbd></span>
        </div>
      </div>

      <div class="pg-panel pg-mcp-panel" id="mcpPanel">
        <div class="pg-section">
          <div class="pg-section-label">MCP Tools</div>
          <div id="mcpToolList"></div>
        </div>
        <div class="pg-section" style="margin-top:12px">
          <div class="pg-section-label">Call Tool</div>
          <div style="display:flex;flex-direction:column;gap:8px">
            <select id="mcpToolSelect" style="padding:8px;border:1px solid var(--border);border-radius:var(--radius);background:var(--bg-2);color:var(--text-0);font-size:0.8125rem;font-family:var(--mono)"></select>
            <textarea id="mcpToolArgs" rows="6" style="padding:8px;border:1px solid var(--border);border-radius:var(--radius);background:var(--bg-0);color:var(--text-0);font-size:0.8125rem;font-family:var(--mono);resize:vertical" placeholder='{ "arguments": {} }'></textarea>
            <button class="pg-compose-btn" id="mcpCallBtn">Call Tool</button>
            <pre id="mcpResult" style="padding:8px;border:1px solid var(--border);border-radius:var(--radius);background:var(--bg-0);color:var(--text-1);font-size:0.75rem;font-family:var(--mono);max-height:300px;overflow:auto;white-space:pre-wrap;display:none"></pre>
          </div>
        </div>
      </div>

      <div class="pg-panel" id="registryPanel" style="padding:16px;gap:16px;">
        <div id="registryContent"></div>
      </div>

      <div class="pg-actions" id="composeActions">
        <button class="pg-compose-btn" id="composeBtn" disabled>Compose</button>
        <button class="pg-reset-btn" id="resetBtn">Reset</button>
      </div>
    </div>

    <div class="pg-viewport">
      <div class="pg-viewport-bar">
        <span class="pg-status idle" id="statusBadge">idle</span>
        <span class="pg-frame-id" id="frameIdDisplay"></span>
        <div class="pg-response-meta" id="responseMeta" style="display:none">
          <span id="responseTime"></span>
          <span id="responseSize"></span>
        </div>
      </div>
      <div class="pg-viewport-content">
        <div class="pg-empty" id="emptyState">
          <div class="pg-empty-inner">
            <div class="pg-empty-icon">&#x25A3;</div>
            <h2>No workspace composed</h2>
            <p>Select fragments and click Compose, or use the JSON/MCP tabs</p>
          </div>
        </div>
        <iframe id="viewport" style="display:none"></iframe>
      </div>
      <div class="pg-log" id="logPanel">
        <div class="pg-log-header"><span>Console</span><button class="pg-log-clear" id="logClear">Clear</button></div>
      </div>
    </div>
  </div>

  <script>
  (function() {
    var state = { sessionId: null, frameId: null, selectedFragments: [], selectedLayout: null, registry: { fragments: [], dataSources: [] }, mcpTools: [] };
    var presets = [
      { label: 'All Fragments', desc: 'dashboard', icon: '\\u25A6', fragmentIds: null, layout: 'dashboard' },
      { label: 'Product Browser', desc: 'split view', icon: '\\u25EB', fragmentIds: ['product-list', 'product-detail'], layout: 'split-horizontal' },
      { label: 'Single Detail', desc: 'full width', icon: '\\u25A0', fragmentIds: ['product-detail'], layout: 'single' }
    ];
    var $ = function(id) { return document.getElementById(id); };
    function log(msg, level) {
      level = level || 'info';
      var el = document.createElement('div'); el.className = 'pg-log-entry ' + level;
      var now = new Date(); var ms = String(now.getMilliseconds()).padStart(3, '0');
      var time = now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }) + '.' + ms;
      el.innerHTML = '<span class="pg-log-time">' + time + '</span>' + escapeHtml(msg);
      $('logPanel').appendChild(el); $('logPanel').scrollTop = $('logPanel').scrollHeight;
    }
    function escapeHtml(s) { var d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
    function setStatus(s) { var b = $('statusBadge'); b.className = 'pg-status ' + s; b.textContent = s; }
    function formatBytes(b) { if (b < 1024) return b + ' B'; if (b < 1048576) return (b / 1024).toFixed(1) + ' KB'; return (b / 1048576).toFixed(1) + ' MB'; }

    document.querySelectorAll('.pg-tab').forEach(function(tab) {
      tab.addEventListener('click', function() {
        document.querySelectorAll('.pg-tab').forEach(function(t) { t.classList.remove('active'); });
        document.querySelectorAll('.pg-panel').forEach(function(p) { p.classList.remove('active'); });
        tab.classList.add('active');
        var map = { compose: 'composePanel', json: 'jsonPanel', mcp: 'mcpPanel', registry: 'registryPanel' };
        var panel = $(map[tab.dataset.tab] || 'composePanel'); panel.classList.add('active');
        $('composeActions').style.display = (tab.dataset.tab === 'registry' || tab.dataset.tab === 'mcp') ? 'none' : 'flex';
      });
    });

    document.querySelectorAll('.pg-layout-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        document.querySelectorAll('.pg-layout-btn').forEach(function(b) { b.classList.remove('active'); });
        btn.classList.add('active');
        state.selectedLayout = btn.dataset.layout === 'auto' ? null : btn.dataset.layout;
        syncJsonEditor();
      });
    });

    $('logClear').addEventListener('click', function() {
      var header = $('logPanel').querySelector('.pg-log-header');
      $('logPanel').innerHTML = ''; $('logPanel').appendChild(header);
    });

    $('resetBtn').addEventListener('click', function() {
      state.selectedFragments = []; state.selectedLayout = null;
      document.querySelectorAll('.pg-fragment-card').forEach(function(c) { c.classList.remove('selected'); });
      document.querySelectorAll('.pg-layout-btn').forEach(function(b) { b.classList.remove('active'); });
      document.querySelector('.pg-layout-btn[data-layout="auto"]').classList.add('active');
      $('composeBtn').disabled = true; syncJsonEditor(); log('Selection reset');
    });

    // Load registry
    fetch('/prev/api/registry').then(function(r) { return r.json(); }).then(function(data) {
      state.registry = data; renderFragmentPicker(); renderPresets(); renderRegistryTab();
      log('Registry loaded: ' + data.fragments.length + ' fragments, ' + data.dataSources.length + ' data sources');
    }).catch(function(e) { log('Failed to load registry: ' + e.message, 'error'); });

    // Load MCP tools
    fetch('/mcp/tools').then(function(r) { return r.json(); }).then(function(data) {
      state.mcpTools = data.tools || [];
      renderMcpTools();
      log('MCP tools loaded: ' + state.mcpTools.length + ' tools');
    }).catch(function(e) { log('Failed to load MCP tools: ' + e.message, 'error'); });

    function renderMcpTools() {
      var el = $('mcpToolList'); el.innerHTML = '';
      var sel = $('mcpToolSelect'); sel.innerHTML = '';
      state.mcpTools.forEach(function(tool) {
        var div = document.createElement('div'); div.className = 'pg-mcp-tool';
        div.innerHTML = '<div class="pg-mcp-tool__name">' + escapeHtml(tool.name) + '</div><div class="pg-mcp-tool__desc">' + escapeHtml(tool.description) + '</div>';
        div.addEventListener('click', function() {
          sel.value = tool.name;
          $('mcpToolArgs').value = JSON.stringify(tool.inputSchema && tool.inputSchema.properties ? Object.fromEntries(Object.keys(tool.inputSchema.properties).map(function(k) { return [k, null]; })) : {}, null, 2);
        });
        el.appendChild(div);
        var opt = document.createElement('option'); opt.value = tool.name; opt.textContent = tool.name; sel.appendChild(opt);
      });
    }

    $('mcpCallBtn').addEventListener('click', function() {
      var name = $('mcpToolSelect').value;
      var args; try { args = JSON.parse($('mcpToolArgs').value); } catch(e) { log('Invalid JSON args: ' + e.message, 'error'); return; }
      log('MCP call: ' + name);
      fetch('/mcp/tools/call', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: name, arguments: args }) })
        .then(function(r) { return r.json(); })
        .then(function(result) {
          $('mcpResult').style.display = 'block';
          $('mcpResult').textContent = result.content && result.content[0] ? result.content[0].text : JSON.stringify(result, null, 2);
          log('MCP result for ' + name, result.isError ? 'error' : 'success');
        }).catch(function(e) { log('MCP call failed: ' + e.message, 'error'); });
    });

    function renderPresets() {
      var el = $('presetPicker'); el.innerHTML = '';
      presets.forEach(function(preset) {
        var btn = document.createElement('button'); btn.className = 'pg-preset-btn';
        btn.innerHTML = '<span class="pg-preset-icon">' + preset.icon + '</span><span class="pg-preset-label">' + escapeHtml(preset.label) + '</span><span class="pg-preset-desc">' + escapeHtml(preset.desc) + '</span>';
        btn.addEventListener('click', function() {
          var ids = preset.fragmentIds || state.registry.fragments.map(function(f) { return f.id; });
          state.selectedFragments = ids.slice(); state.selectedLayout = preset.layout || null;
          document.querySelectorAll('.pg-fragment-card').forEach(function(c) { c.classList[ids.indexOf(c.dataset.fragmentId) >= 0 ? 'add' : 'remove']('selected'); });
          document.querySelectorAll('.pg-layout-btn').forEach(function(b) { b.classList.remove('active'); });
          var lb = document.querySelector('.pg-layout-btn[data-layout="' + (preset.layout || 'auto') + '"]'); if (lb) lb.classList.add('active');
          $('composeBtn').disabled = false; syncJsonEditor(); log('Preset: ' + preset.label);
        });
        el.appendChild(btn);
      });
    }

    function renderFragmentPicker() {
      var picker = $('fragmentPicker'); picker.innerHTML = '';
      state.registry.fragments.forEach(function(frag) {
        var card = document.createElement('div'); card.className = 'pg-fragment-card'; card.dataset.fragmentId = frag.id;
        var pills = '';
        (frag.tags || []).forEach(function(t) { pills += '<span class="pg-pill pg-pill-tag">' + escapeHtml(t) + '</span>'; });
        frag.data.forEach(function(d) { pills += '<span class="pg-pill pg-pill-data">' + escapeHtml(d.key) + ' \\u2190 ' + escapeHtml(d.source) + '</span>'; });
        frag.interactions.forEach(function(i) { pills += '<span class="pg-pill pg-pill-emit">emit:' + escapeHtml(i) + '</span>'; });
        card.innerHTML = '<div class="pg-fc-header"><div><div class="pg-fc-name">' + escapeHtml(frag.name) + '</div><div class="pg-fc-id">' + escapeHtml(frag.id) + '</div></div><div class="pg-fc-check"><svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5l2.5 2.5L8 3" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg></div></div>' + (frag.description ? '<div class="pg-fc-desc">' + escapeHtml(frag.description) + '</div>' : '') + (pills ? '<div class="pg-fc-pills">' + pills + '</div>' : '');
        card.addEventListener('click', function() {
          var idx = state.selectedFragments.indexOf(frag.id);
          if (idx >= 0) { state.selectedFragments.splice(idx, 1); card.classList.remove('selected'); }
          else { state.selectedFragments.push(frag.id); card.classList.add('selected'); }
          $('composeBtn').disabled = state.selectedFragments.length === 0; syncJsonEditor();
        });
        picker.appendChild(card);
      });
    }

    function renderRegistryTab() {
      var el = $('registryContent');
      var html = '<div class="pg-section" style="margin-bottom:20px"><div class="pg-section-label">Fragments (' + state.registry.fragments.length + ')</div>';
      state.registry.fragments.forEach(function(f) {
        html += '<div style="padding:8px 0;border-bottom:1px solid var(--border)"><div style="font-size:0.8125rem;font-weight:500;color:var(--text-0)">' + escapeHtml(f.name) + '</div><div style="font-size:0.6875rem;font-family:var(--mono);color:var(--text-3)">' + escapeHtml(f.id) + (f.source === 'third-party' ? ' <span style="color:#60a5fa">[3P]</span>' : '') + '</div>' + (f.description ? '<div style="font-size:0.75rem;color:var(--text-2);margin-top:2px">' + escapeHtml(f.description) + '</div>' : '') + '</div>';
      });
      html += '</div><div class="pg-section"><div class="pg-section-label">Data Sources (' + state.registry.dataSources.length + ')</div>';
      state.registry.dataSources.forEach(function(ds) {
        html += '<div style="padding:8px 0;border-bottom:1px solid var(--border)"><div style="font-size:0.8125rem;font-weight:500;color:var(--text-0)">' + escapeHtml(ds.name) + '</div><div style="font-size:0.6875rem;font-family:var(--mono);color:var(--text-3)">' + escapeHtml(ds.id) + (ds.supportsSubscription ? ' <span style="color:#22c55e">[live]</span>' : '') + '</div>' + (ds.description ? '<div style="font-size:0.75rem;color:var(--text-2);margin-top:2px">' + escapeHtml(ds.description) + '</div>' : '') + '</div>';
      });
      html += '</div>'; el.innerHTML = html;
    }

    function buildComposition() {
      var fragments = state.selectedFragments.map(function(fragId) {
        var regFrag = state.registry.fragments.find(function(f) { return f.id === fragId; });
        var entry = { fragmentId: fragId };
        if (regFrag && regFrag.data.length > 0) { entry.data = {}; regFrag.data.forEach(function(d) { entry.data[d.key] = { source: d.source, params: {} }; }); }
        return entry;
      });
      var comp = { fragments: fragments };
      if (state.selectedLayout) comp.layout = state.selectedLayout;
      return comp;
    }

    function syncJsonEditor() { $('jsonEditor').value = JSON.stringify(buildComposition(), null, 2); }

    function compose(payload) {
      setStatus('loading');
      log('POST /prev/compose \\u2014 ' + (payload.fragments ? payload.fragments.length : 0) + ' fragment(s), layout: ' + (payload.layout || 'auto'));
      var url = '/prev/compose'; if (state.sessionId) url += '?sessionId=' + encodeURIComponent(state.sessionId);
      var t0 = performance.now();
      fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      .then(function(res) {
        var elapsed = Math.round(performance.now() - t0);
        var sid = res.headers.get('x-prev-session-id'); var fid = res.headers.get('x-prev-frame-id');
        if (sid) { state.sessionId = sid; $('sessionDisplay').textContent = sid.substring(0, 8) + '\\u2026'; $('sessionPill').classList.add('visible'); }
        if (fid) { state.frameId = fid; $('frameIdDisplay').textContent = fid; }
        if (!res.ok) return res.json().then(function(err) { throw new Error(err.error || res.status); });
        return res.text().then(function(html) { return { html: html, elapsed: elapsed }; });
      })
      .then(function(result) {
        if (!result) return;
        $('emptyState').style.display = 'none'; $('viewport').style.display = 'block'; $('viewport').srcdoc = result.html;
        $('responseMeta').style.display = 'flex'; $('responseTime').textContent = result.elapsed + 'ms'; $('responseSize').textContent = formatBytes(result.html.length);
        setStatus('ready'); log('Frame ' + state.frameId.substring(0,8) + '\\u2026 rendered in ' + result.elapsed + 'ms (' + formatBytes(result.html.length) + ')', 'success');
      })
      .catch(function(e) { setStatus('error'); log(e.message, 'error'); });
    }

    $('composeBtn').addEventListener('click', function() { compose(buildComposition()); });
    $('jsonComposeBtn').addEventListener('click', function() { try { compose(JSON.parse($('jsonEditor').value)); } catch (e) { log('Invalid JSON: ' + e.message, 'error'); } });
    $('jsonEditor').addEventListener('keydown', function(e) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); $('jsonComposeBtn').click(); }
      if (e.key === 'Tab') { e.preventDefault(); var ta = e.target; var s = ta.selectionStart; ta.value = ta.value.substring(0, s) + '  ' + ta.value.substring(ta.selectionEnd); ta.selectionStart = ta.selectionEnd = s + 2; }
    });
    document.addEventListener('keydown', function(e) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && document.activeElement !== $('jsonEditor') && document.activeElement !== $('mcpToolArgs')) {
        e.preventDefault(); if (state.selectedFragments.length > 0) compose(buildComposition());
      }
    });
    log('Playground ready');
  })();
  </script>
</body>
</html>`;
