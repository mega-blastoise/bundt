let cachedBundle: string | undefined;

export async function buildClientBundle(): Promise<string> {
  if (cachedBundle) return cachedBundle;

  const entry = `
    import { initRuntime } from '@bundt/prev/client';
    initRuntime();
  `;
  const tmpPath = '/tmp/prev-client-entry.ts';
  await Bun.write(tmpPath, entry);

  try {
    const result = await Bun.build({
      entrypoints: [tmpPath],
      target: 'browser',
      format: 'esm',
      minify: true
    });
    if (result.success && result.outputs[0]) {
      cachedBundle = await result.outputs[0].text();
    }
  } catch {
    cachedBundle = '// client bundle build failed';
  }

  return cachedBundle ?? '// no client bundle';
}
