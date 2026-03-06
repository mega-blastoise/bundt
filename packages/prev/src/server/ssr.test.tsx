import { describe, expect, test } from 'bun:test';
import { z } from 'zod';
import { renderFrame } from './ssr';
import { createFragmentRegistry } from '../registry/fragment-registry';
import type { FragmentDefinition, Frame } from '../types';

function setup() {
  const fragmentRegistry = createFragmentRegistry([
    {
      id: 'greeting',
      name: 'Greeting',
      props: z.object({ name: z.string() }),
      data: {},
      interactions: {},
      render: ({ props }: { props: { name: string } }) => (
        <div data-testid="greeting">Hello, {props.name}!</div>
      )
    } as FragmentDefinition,
    {
      id: 'counter',
      name: 'Counter',
      props: z.object({}),
      data: {},
      interactions: {},
      render: () => <div data-testid="counter">Count: 0</div>
    } as FragmentDefinition
  ]);

  return fragmentRegistry;
}

function makeFrame(fragments: Frame['fragments']): Frame {
  return {
    id: 'frame-1',
    sessionId: 'session-1',
    layout: {
      type: 'split-horizontal',
      gap: '8px',
      padding: '8px',
      columns: fragments.length,
      rows: 1,
      positions: new Map(
        fragments.map((f, i) => [
          f.instanceId,
          { row: 1, col: i + 1, rowSpan: 1, colSpan: 1 }
        ])
      )
    },
    fragments,
    bindings: [],
    createdAt: Date.now()
  };
}

async function streamToString(stream: ReadableStream): Promise<string> {
  const reader = stream.getReader();
  const chunks: string[] = [];
  const decoder = new TextDecoder();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(decoder.decode(value, { stream: true }));
  }
  return chunks.join('');
}

describe('SSR renderFrame', () => {
  test('renders single fragment', async () => {
    const registry = setup();
    const frame = makeFrame([
      { instanceId: 'inst-1', fragmentId: 'greeting', props: { name: 'World' }, dataBindings: {} }
    ]);

    const stream = await renderFrame(frame, registry, new Map());
    const html = await streamToString(stream);

    expect(html).toContain('Hello,');
    expect(html).toContain('World');
    expect(html).toContain('data-prev-fragment="inst-1"');
    expect(html).toContain('data-prev-fragment-id="greeting"');
    expect(html).toContain('prev-workspace');
  });

  test('renders multiple fragments', async () => {
    const registry = setup();
    const frame = makeFrame([
      { instanceId: 'inst-1', fragmentId: 'greeting', props: { name: 'Alice' }, dataBindings: {} },
      { instanceId: 'inst-2', fragmentId: 'counter', props: {}, dataBindings: {} }
    ]);

    const stream = await renderFrame(frame, registry, new Map());
    const html = await streamToString(stream);

    expect(html).toContain('Alice');
    expect(html).toContain('Count: 0');
    expect(html).toContain('data-prev-fragment="inst-1"');
    expect(html).toContain('data-prev-fragment="inst-2"');
  });

  test('includes grid layout CSS', async () => {
    const registry = setup();
    const frame = makeFrame([
      { instanceId: 'inst-1', fragmentId: 'greeting', props: { name: 'Test' }, dataBindings: {} }
    ]);

    const stream = await renderFrame(frame, registry, new Map());
    const html = await streamToString(stream);

    expect(html).toContain('display: grid');
  });

  test('includes script tags', async () => {
    const registry = setup();
    const frame = makeFrame([
      { instanceId: 'inst-1', fragmentId: 'greeting', props: { name: 'Test' }, dataBindings: {} }
    ]);

    const stream = await renderFrame(frame, registry, new Map());
    const html = await streamToString(stream);

    expect(html).toContain('/prev/client.js');
    expect(html).toContain('/prev/frame/frame-1/glue.js');
  });

  test('passes resolved data to fragments', async () => {
    const dataRegistry = createFragmentRegistry([
      {
        id: 'data-viewer',
        name: 'Data Viewer',
        props: z.object({}),
        data: { items: { source: 'test' } },
        interactions: {},
        render: ({ data }: { data: { items?: unknown[] } }) => (
          <div data-testid="data">
            {Array.isArray(data.items) ? `${data.items.length} items` : 'no data'}
          </div>
        )
      } as FragmentDefinition
    ]);

    const frame = makeFrame([
      { instanceId: 'inst-1', fragmentId: 'data-viewer', props: {}, dataBindings: {} }
    ]);

    const resolvedData = new Map([
      ['inst-1', { items: [1, 2, 3] }]
    ]);

    const stream = await renderFrame(frame, dataRegistry, resolvedData);
    const html = await streamToString(stream);

    expect(html).toContain('3 items');
  });
});
