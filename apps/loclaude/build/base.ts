import { createBaseConfig } from '@bundt/internal-build-utils';

export const base_config = createBaseConfig({
  entrypoints: ['src/cli.ts'],
  external: [
    '@inquirer/prompts',
    'bytes',
    'cac',
    'picocolors'
  ]
});

export default base_config;
