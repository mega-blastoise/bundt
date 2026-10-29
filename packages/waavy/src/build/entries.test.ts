import { describe, expect, test } from 'bun:test';

import { BROWSER_SPECIFIER, clientEntrySource, ENTRY_SERVER_SPECIFIER, serverEntrySource } from './entries';

const pages = [
  { id: 'home', file: '/app/pages/home.tsx' },
  { id: 'account/settings', file: '/app/pages/it\'s "quoted".tsx' }
];

describe('serverEntrySource', () => {
  test('registers every page under its ID', () => {
    const source = serverEntrySource('b1', pages);
    expect(source).toContain(`import { defineRelease } from "${ENTRY_SERVER_SPECIFIER}";`);
    expect(source).toContain('import Page0 from "/app/pages/home.tsx";');
    expect(source).toContain('"account/settings": Page1');
    expect(source).toContain('buildId: "b1"');
  });

  test('quotes paths safely', () => {
    expect(serverEntrySource('b1', pages)).toContain(String.raw`import Page1 from "/app/pages/it's \"quoted\".tsx";`);
  });

  test('is valid TypeScript', () => {
    const transpiler = new Bun.Transpiler({ loader: 'tsx' });
    expect(() => transpiler.transformSync(serverEntrySource('b1', pages))).not.toThrow();
  });
});

describe('clientEntrySource', () => {
  test('hydrates the page with the build ID', () => {
    const source = clientEntrySource('b1', pages[0]!);
    expect(source).toContain(`import { hydrate } from "${BROWSER_SPECIFIER}";`);
    expect(source).toContain('import Page from "/app/pages/home.tsx";');
    expect(source).toContain('hydrate(Page, { buildId: "b1" });');
  });
});
