import { concurrent_build } from '@bundt/internal-build-utils';

await concurrent_build({
  entrypoints: ['src/index.ts'],
  outdir: './dist',
  format: 'esm',
  splitting: false,
  sourcemap: 'linked',
  packages: 'external',
  naming: { entry: 'index.js' }
} as Bun.BuildConfig);
