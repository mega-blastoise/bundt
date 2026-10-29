import { resolve } from 'path';
import { concurrent_build, createBaseConfig } from '@bundt/internal-build-utils';

const distDir = resolve(import.meta.dir, '../dist');

await Bun.$`rm -rf ${distDir}`;
await Bun.$`mkdir -p ${distDir}`;

const serverConfig = createBaseConfig({
  external: ['react', 'react-dom', 'zod'],
  outdir: './dist'
});

const clientConfig = createBaseConfig({
  external: [],
  outdir: './dist'
});

await concurrent_build(
  {
    ...serverConfig,
    entrypoints: ['src/index.ts'],
    naming: { entry: 'index.js' },
    target: 'bun'
  } as Bun.BuildConfig,
  {
    ...serverConfig,
    entrypoints: ['src/server-exports.ts'],
    naming: { entry: 'server-exports.js' },
    target: 'bun'
  } as Bun.BuildConfig,
  {
    ...clientConfig,
    entrypoints: ['src/client/index.ts'],
    naming: { entry: 'client.js' },
    target: 'browser'
  } as Bun.BuildConfig,
  {
    ...serverConfig,
    entrypoints: ['src/build/index.ts'],
    naming: { entry: 'build.js' },
    target: 'bun'
  } as Bun.BuildConfig
);

// Generate .d.ts declaration files
await Bun.$`bunx tsc --declaration --emitDeclarationOnly --outDir dist --project tsconfig.build.json`;
