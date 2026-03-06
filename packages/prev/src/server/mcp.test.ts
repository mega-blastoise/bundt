import { describe, expect, test } from 'bun:test';
import { z } from 'zod';
import { createCompositionEngine } from '../composition/engine';
import { createDataSourceRegistry } from '../registry/data-source-registry';
import { createFragmentRegistry } from '../registry/fragment-registry';
import { createDatabase } from './database';
import { createMcpHandler } from './mcp';
import { createSessionManager } from './session';
import { createWebSocketHandler } from './websocket';

function setup() {
  const fragments = [
    {
      id: 'test-fragment',
      name: 'Test Fragment',
      description: 'A test fragment',
      tags: ['test'],
      props: z.object({ title: z.string().optional() }),
      data: { items: { source: 'test-source' } },
      interactions: { select: { payload: z.object({ id: z.string() }) } },
      render: () => null
    }
  ];

  const dataSources = [
    {
      id: 'test-source',
      name: 'Test Source',
      description: 'A test data source',
      tags: ['test'],
      params: z.object({}),
      returns: z.object({ items: z.array(z.string()) }),
      fetch: async () => ({ items: ['a', 'b', 'c'] })
    }
  ];

  const fragmentRegistry = createFragmentRegistry(fragments);
  const dataSourceRegistry = createDataSourceRegistry(dataSources);
  const database = createDatabase(':memory:');
  const compositionEngine = createCompositionEngine(fragmentRegistry, dataSourceRegistry);
  const sessionManager = createSessionManager(database);
  const wsHandler = createWebSocketHandler(compositionEngine, sessionManager, database, fragmentRegistry, dataSourceRegistry);

  const mcp = createMcpHandler(compositionEngine, sessionManager, fragmentRegistry, dataSourceRegistry, wsHandler);

  return { mcp, sessionManager, database };
}

describe('MCP Handler', () => {
  test('getToolDefinitions returns all tools', () => {
    const { mcp } = setup();
    const tools = mcp.getToolDefinitions();
    expect(tools.length).toBe(7);
    const names = tools.map((t) => t.name);
    expect(names).toContain('compose_frame');
    expect(names).toContain('mutate_frame');
    expect(names).toContain('list_fragments');
    expect(names).toContain('list_data_sources');
    expect(names).toContain('get_frame_state');
    expect(names).toContain('query_data');
    expect(names).toContain('navigate_history');
  });

  test('list_fragments returns registered fragments', async () => {
    const { mcp } = setup();
    const result = await mcp.handleToolCall('list_fragments', {});
    expect(result.isError).toBeUndefined();
    const data = JSON.parse(result.content[0]!.text);
    expect(data.fragments).toHaveLength(1);
    expect(data.fragments[0].id).toBe('test-fragment');
  });

  test('list_fragments supports search filter', async () => {
    const { mcp } = setup();
    const result = await mcp.handleToolCall('list_fragments', { filter: { search: 'nonexistent' } });
    const data = JSON.parse(result.content[0]!.text);
    expect(data.fragments).toHaveLength(0);
  });

  test('list_data_sources returns registered sources', async () => {
    const { mcp } = setup();
    const result = await mcp.handleToolCall('list_data_sources', {});
    const data = JSON.parse(result.content[0]!.text);
    expect(data.dataSources).toHaveLength(1);
    expect(data.dataSources[0].id).toBe('test-source');
  });

  test('query_data fetches from data source', async () => {
    const { mcp } = setup();
    const result = await mcp.handleToolCall('query_data', { sourceId: 'test-source', params: {} });
    expect(result.isError).toBeUndefined();
    const data = JSON.parse(result.content[0]!.text);
    expect(data.data.items).toEqual(['a', 'b', 'c']);
  });

  test('query_data returns error for unknown source', async () => {
    const { mcp } = setup();
    const result = await mcp.handleToolCall('query_data', { sourceId: 'nope' });
    expect(result.isError).toBe(true);
  });

  test('compose_frame with structured composition', async () => {
    const { mcp } = setup();
    const result = await mcp.handleToolCall('compose_frame', {
      composition: {
        type: 'structured',
        fragments: [{ fragmentId: 'test-fragment', data: { items: { source: 'test-source', params: {} } } }]
      }
    });
    expect(result.isError).toBeUndefined();
    const data = JSON.parse(result.content[0]!.text);
    expect(data.frameId).toBeDefined();
    expect(data.fragmentCount).toBe(1);
  });

  test('compose_frame with intent composition', async () => {
    const { mcp } = setup();
    const result = await mcp.handleToolCall('compose_frame', {
      composition: {
        type: 'intent',
        description: 'Show test data'
      }
    });
    expect(result.isError).toBeUndefined();
    const data = JSON.parse(result.content[0]!.text);
    expect(data.fragmentCount).toBeGreaterThan(0);
  });

  test('get_frame_state returns current frame', async () => {
    const { mcp } = setup();

    // First compose a frame
    const composeResult = await mcp.handleToolCall('compose_frame', {
      composition: {
        type: 'structured',
        fragments: [{ fragmentId: 'test-fragment' }]
      }
    });
    const { sessionId } = JSON.parse(composeResult.content[0]!.text);

    const result = await mcp.handleToolCall('get_frame_state', { sessionId });
    expect(result.isError).toBeUndefined();
    const data = JSON.parse(result.content[0]!.text);
    expect(data.frame.fragments).toHaveLength(1);
  });

  test('navigate_history returns error when no history', async () => {
    const { mcp, sessionManager } = setup();
    const session = sessionManager.createSession();
    const result = await mcp.handleToolCall('navigate_history', { sessionId: session.id, direction: 'back' });
    expect(result.isError).toBe(true);
  });

  test('unknown tool returns error', async () => {
    const { mcp } = setup();
    const result = await mcp.handleToolCall('nonexistent', {});
    expect(result.isError).toBe(true);
  });

  test('handleRequest GET /mcp/tools returns tool definitions', async () => {
    const { mcp } = setup();
    const req = new Request('http://localhost/mcp/tools');
    const res = await mcp.handleRequest(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.tools).toHaveLength(7);
  });

  test('handleRequest POST /mcp/tools/call invokes tool', async () => {
    const { mcp } = setup();
    const req = new Request('http://localhost/mcp/tools/call', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'list_fragments', arguments: {} })
    });
    const res = await mcp.handleRequest(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.content).toBeDefined();
  });
});
