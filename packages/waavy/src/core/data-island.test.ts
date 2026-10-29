import { describe, expect, test } from 'bun:test';

import { type DataIsland, parseDataIsland, serializeDataIsland } from './data-island';

function island(props: Record<string, unknown>): DataIsland {
  return { v: 1, page: 'home', buildId: 'b1', props };
}

describe('serializeDataIsland', () => {
  const hostile = '</script><script>alert(1)</script><!-- & \u2028 \u2029';

  test('never emits characters that could end the script element', () => {
    const text = serializeDataIsland(island({ label: hostile }));
    expect(text).not.toContain('</script');
    expect(text).not.toContain('<!--');
    expect(text).not.toMatch(/[<>&\u2028\u2029]/);
  });

  test('uses literal six-character JSON escapes', () => {
    const text = serializeDataIsland(island({ s: '<>&\u2028\u2029' }));
    expect(text).toContain(String.raw`\u003c\u003e\u0026\u2028\u2029`);
  });

  test('round-trips through JSON.parse unchanged', () => {
    const original = island({ label: hostile, nested: { list: [1, 'é', null] } });
    expect(JSON.parse(serializeDataIsland(original))).toEqual(original);
    expect(parseDataIsland(serializeDataIsland(original))).toEqual(original);
  });
});

describe('parseDataIsland', () => {
  test.each([
    ['not json', 'JSON'],
    ['[]', 'not a JSON object'],
    ['{"v":2,"page":"p","buildId":"b","props":{}}', 'version 2'],
    ['{"v":1,"page":"p","props":{}}', 'missing'],
    ['{"v":1,"page":"p","buildId":"b","props":[]}', 'missing']
  ])('rejects %p', (text, fragment) => {
    expect(() => parseDataIsland(text)).toThrow(fragment);
  });
});
