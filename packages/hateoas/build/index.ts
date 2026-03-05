import { resolve } from 'path';
import { concurrent_build } from '@bundt/internal-build-utils';
import base_config from './base';

const distDir = resolve(import.meta.dir, '../dist');

await Bun.$`rm -rf ${distDir}`;
await Bun.$`mkdir -p ${distDir}`;

await concurrent_build(
  {
    ...base_config,
    entrypoints: ['src/index.ts'],
    naming: { entry: 'index.js' }
  } as Bun.BuildConfig,
  {
    ...base_config,
    entrypoints: ['src/server/index.ts'],
    naming: { entry: 'server.js' }
  } as Bun.BuildConfig,
  {
    ...base_config,
    entrypoints: ['src/client/index.ts'],
    naming: { entry: 'client.js' }
  } as Bun.BuildConfig,
  {
    ...base_config,
    entrypoints: ['src/react/index.ts'],
    naming: { entry: 'react.js' }
  } as Bun.BuildConfig,
  {
    ...base_config,
    entrypoints: ['src/protocol/index.ts'],
    naming: { entry: 'protocol.js' }
  } as Bun.BuildConfig
);
