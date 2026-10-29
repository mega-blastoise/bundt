import { describe, expect, test } from 'bun:test';

import { createDocumentShell, type DocumentAssets } from './document';

const assets: DocumentAssets = {
  scripts: ['/assets/home-1.js'],
  styles: ['/assets/home-1.css'],
  preloads: ['/assets/chunks/chunk-1.js']
};

describe('createDocumentShell', () => {
  test('produces the documented shell', () => {
    const shell = createDocumentShell({
      document: { title: 'Home', lang: 'fr', head: '<meta name="robots" content="noindex">' },
      assets,
      island: '{"v":1}'
    });
    expect(shell.prefix + '<p>page</p>' + shell.suffix).toMatchSnapshot();
  });

  test('defaults lang to en and omits an absent title', () => {
    const { prefix } = createDocumentShell({ document: undefined, assets, island: '{}' });
    expect(prefix).toContain('<html lang="en">');
    expect(prefix).not.toContain('<title>');
  });

  test('escapes title text and attribute values', () => {
    const { prefix, suffix } = createDocumentShell({
      document: { title: '<b>&"x"' },
      assets: { scripts: ['/a.js?x="1"'], styles: [], preloads: [] },
      island: '{}'
    });
    expect(prefix).toContain('<title>&lt;b&gt;&amp;&quot;x&quot;</title>');
    expect(suffix).toContain('src="/a.js?x=&quot;1&quot;"');
  });

  test('inserts head verbatim (trusted host HTML)', () => {
    const { prefix } = createDocumentShell({ document: { head: '<script>trusted()</script>' }, assets, island: '{}' });
    expect(prefix).toContain('<script>trusted()</script>');
  });

  test('wraps the page in #waavy-root and places the island after it', () => {
    const { prefix, suffix } = createDocumentShell({ document: undefined, assets, island: '{"v":1}' });
    expect(prefix.endsWith('<div id="waavy-root">')).toBe(true);
    expect(suffix.startsWith('</div><script type="application/json" id="waavy-data">{"v":1}</script>')).toBe(true);
  });
});
