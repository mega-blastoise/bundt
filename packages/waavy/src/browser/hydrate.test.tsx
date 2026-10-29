/**
 * Hydrator behavior in a simulated DOM. Real-browser coverage (event
 * handlers, CSS) lives in `e2e/`.
 */

import { GlobalRegistrator } from '@happy-dom/global-registrator';
import { afterAll, afterEach, beforeAll, describe, expect, spyOn, test } from 'bun:test';

import { DATA_ISLAND_ELEMENT_ID, ROOT_ELEMENT_ID } from '../core/constants';
import { serializeDataIsland } from '../core/data-island';

/**
 * React hydrates asynchronously through its scheduler (macrotasks). Waiting a
 * few ticks lets that work finish before assertions or DOM teardown, so it
 * never runs after the simulated `window` is gone.
 */
const flushReact = () => new Promise((resolve) => setTimeout(resolve, 20));

beforeAll(() => GlobalRegistrator.register());
afterAll(async () => {
  await flushReact();
  await GlobalRegistrator.unregister();
});
afterEach(() => {
  document.body.innerHTML = '';
});

function Greeting({ name }: { name: string }) {
  return <p>Hello {name}</p>;
}

/** Writes server-like markup into the simulated document. */
function mountServerMarkup(rootHtml: string | null, island: string | null): void {
  document.body.innerHTML = [
    rootHtml === null ? '' : `<div id="${ROOT_ELEMENT_ID}">${rootHtml}</div>`,
    island === null ? '' : `<script type="application/json" id="${DATA_ISLAND_ELEMENT_ID}">${island}</script>`
  ].join('');
}

const island = serializeDataIsland({ v: 1, page: 'greeting', buildId: 'b1', props: { name: 'Ada' } });

describe('hydrate', () => {
  test('hydrates #waavy-root with the island props', async () => {
    const { hydrate } = await import('./hydrate');
    mountServerMarkup('<p>Hello <!-- -->Ada</p>', island);
    const root = hydrate(Greeting, { buildId: 'b1' });
    expect(root).toBeDefined();
    await flushReact();
    expect(document.getElementById(ROOT_ELEMENT_ID)?.textContent).toBe('Hello Ada');
    root?.unmount();
  });

  test('skips hydration without an island', async () => {
    const { hydrate } = await import('./hydrate');
    const error = spyOn(console, 'error').mockImplementation(() => undefined);
    mountServerMarkup('<p></p>', null);
    expect(hydrate(Greeting)).toBeUndefined();
    expect(String(error.mock.calls[0]?.[0])).toContain(DATA_ISLAND_ELEMENT_ID);
    error.mockRestore();
  });

  test('skips hydration on invalid island JSON', async () => {
    const { hydrate } = await import('./hydrate');
    const error = spyOn(console, 'error').mockImplementation(() => undefined);
    mountServerMarkup('<p></p>', '{not json');
    expect(hydrate(Greeting)).toBeUndefined();
    expect(String(error.mock.calls[0]?.[0])).toContain('invalid data island');
    error.mockRestore();
  });

  test('skips hydration without a root element', async () => {
    const { hydrate } = await import('./hydrate');
    const error = spyOn(console, 'error').mockImplementation(() => undefined);
    mountServerMarkup(null, island);
    expect(hydrate(Greeting)).toBeUndefined();
    expect(String(error.mock.calls[0]?.[0])).toContain(ROOT_ELEMENT_ID);
    error.mockRestore();
  });

  test('warns on a build mismatch but still hydrates', async () => {
    const { hydrate } = await import('./hydrate');
    const warn = spyOn(console, 'warn').mockImplementation(() => undefined);
    mountServerMarkup('<p>Hello <!-- -->Ada</p>', island);
    const root = hydrate(Greeting, { buildId: 'other' });
    expect(root).toBeDefined();
    expect(String(warn.mock.calls[0]?.[0])).toContain('build mismatch');
    await flushReact();
    root?.unmount();
    warn.mockRestore();
  });
});
