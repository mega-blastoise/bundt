import { createBaseConfig } from '@bundt/internal-build-utils';

export const base_config = createBaseConfig({
  external: [
    'cac',
    'picocolors',
    'front-matter',
    'fuse.js',
    'marked',
    'zod'
  ]
});

export default base_config;
