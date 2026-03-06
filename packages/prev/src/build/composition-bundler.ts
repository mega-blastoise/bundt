import type { Frame, ResolvedBinding } from '../types';

export async function buildCompositionGlue(
  frame: Frame,
  resolvedBindings: ResolvedBinding[]
): Promise<string> {
  const config = {
    frameId: frame.id,
    fragments: frame.fragments.map((f) => ({
      instanceId: f.instanceId,
      fragmentId: f.fragmentId
    })),
    bindings: resolvedBindings.map((b) => ({
      id: b.id,
      sourceFragmentInstanceId: b.sourceFragmentInstanceId,
      sourceInteraction: b.sourceInteraction,
      targetFragmentInstanceId: b.targetFragmentInstanceId,
      targetType: b.targetType,
      targetKey: b.targetKey,
      transform: b.transform
    }))
  };

  const entry = `
import { initFrame } from '@bundt/prev/client';
initFrame(${JSON.stringify(config, null, 2)});
`;

  const tmpPath = `/tmp/prev-glue-${frame.id}.ts`;
  await Bun.write(tmpPath, entry);

  try {
    const result = await Bun.build({
      entrypoints: [tmpPath],
      target: 'browser',
      format: 'esm',
      minify: true
    });

    if (result.success && result.outputs[0]) {
      return result.outputs[0].text();
    }

    return `/* prev glue build failed */\nconsole.error("Glue bundle build failed");`;
  } finally {
    try {
      const { unlink } = await import('node:fs/promises');
      await unlink(tmpPath);
    } catch {
      // cleanup is best-effort
    }
  }
}
