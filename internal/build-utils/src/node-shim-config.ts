import type { BuildConfig } from 'bun';

export function createNodeShimConfig(name: string): Partial<BuildConfig> {
  return {
    entrypoints: [`bin/${name}.mjs`],
    outdir: './dist',
    format: 'esm',
    target: 'node',
    naming: { entry: `${name}.mjs` },
    external: ['@inquirer/prompts']
  };
}
