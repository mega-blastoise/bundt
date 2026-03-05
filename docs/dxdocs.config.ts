import type { VoidConfig } from '../apps/dxdocs/src/config/schema.ts';

export default {
  title: 'Bundt',
  description:
    'Bun Developer Toolkits — TypeScript/Rust developer tools for the Bun runtime',

  navigation: [
    { type: 'page', path: '/', title: 'Introduction' },
    { type: 'page', path: '/getting-started', title: 'Getting Started' },
    { type: 'page', path: '/architecture', title: 'Architecture' },
    {
      type: 'group',
      title: 'Packages',
      items: [
        { type: 'page', path: '/packages/cleo', title: 'Cleo' },
        { type: 'page', path: '/packages/dxdocs', title: 'DXDocs' },
        { type: 'page', path: '/packages/hateoas', title: 'HATEOAS' },
        { type: 'page', path: '/packages/waavy', title: 'Waavy' },
        { type: 'page', path: '/packages/ollama', title: 'Ollama' }
      ]
    },
    { type: 'page', path: '/contributing', title: 'Contributing' },
    { type: 'page', path: '/releasing', title: 'Release Process' }
  ],

  headerLinks: [
    {
      label: 'GitHub',
      href: 'https://github.com/bundt-dev/bundt',
      icon: 'github'
    }
  ],

  theme: {
    accentColor: '#E8915A',
    darkMode: 'media'
  },

  output: {
    outDir: './dist'
  }
} satisfies VoidConfig;
