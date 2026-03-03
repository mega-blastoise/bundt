import { createBaseConfig } from '@bundt/internal-build-utils';

export const base_config = createBaseConfig({
  external: [
    'react',
    'react/jsx-runtime',
    'react-dom',
    'react-dom/server',
    'react-dom/static',
    '@mdx-js/mdx',
    'shiki',
    'remark-gfm',
    'gray-matter',
    'zod',
    'lucide-react',
    'cac',
    'picocolors',
    'chokidar',
    'unist-util-visit'
  ]
});

export default base_config;
