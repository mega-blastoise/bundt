import { createBaseConfig } from '@bundt/internal-build-utils';

export const base_config = createBaseConfig({
  external: [
    '@bit-context-protocol/driver',
    '@inquirer/prompts',
    'cac',
    'front-matter',
    'fuse.js',
    'marked',
    'picocolors',
    'zod'
  ]
});

export default base_config;
