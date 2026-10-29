export default {
  title: 'Bundt',
  description: 'Developer tools for the Bun runtime — CLIs, frameworks, and libraries.',
  base: '/',
  favicon: '/favicon.svg',

  headerLinks: [
    { label: 'GitHub', href: 'https://github.com/mega-blastoise/bundt', icon: 'github' },
    { label: 'npm', href: 'https://www.npmjs.com/org/bundt', icon: 'external' },
    { label: 'BCP Docs', href: 'https://docs.bitcontextprotocol.com', icon: 'external' }
  ],

  navigation: [
    {
      type: 'group',
      title: 'Getting Started',
      items: [
        { type: 'page', path: '/', title: 'Introduction' },
        { type: 'page', path: '/getting-started/installation', title: 'Installation' },
        { type: 'page', path: '/getting-started/monorepo', title: 'Monorepo Structure' }
      ]
    },
    {
      type: 'group',
      title: 'Cleo',
      items: [
        { type: 'page', path: '/cleo/overview', title: 'Overview' },
        { type: 'page', path: '/cleo/cli-reference', title: 'CLI Reference' },
        { type: 'page', path: '/cleo/registry', title: 'Extension Registry' },
        { type: 'page', path: '/cleo/bcp-integration', title: 'BCP Integration' }
      ]
    },
    {
      type: 'group',
      title: 'DXDocs',
      items: [
        { type: 'page', path: '/dxdocs/overview', title: 'Overview' },
        { type: 'page', path: '/dxdocs/configuration', title: 'Configuration' },
        { type: 'page', path: '/dxdocs/writing-content', title: 'Writing Content' },
        { type: 'page', path: '/dxdocs/components', title: 'Built-in Components' },
        { type: 'page', path: '/dxdocs/theming', title: 'Theming' }
      ]
    },
    {
      type: 'group',
      title: 'Prev',
      items: [
        { type: 'page', path: '/prev/overview', title: 'Overview' },
        { type: 'page', path: '/prev/architecture', title: 'Architecture' },
        { type: 'page', path: '/prev/fragments', title: 'Fragments' },
        { type: 'page', path: '/prev/streaming', title: 'Streaming SSR' },
        { type: 'page', path: '/prev/websockets', title: 'WebSocket Interactions' }
      ]
    },
    {
      type: 'group',
      title: 'Signals',
      items: [
        { type: 'page', path: '/signals/overview', title: 'Overview' },
        { type: 'page', path: '/signals/api', title: 'API Reference' }
      ]
    }
  ],

  coverpage: {
    title: 'Bundt',
    tagline: 'Developer tools for the Bun runtime',
    description:
      'A monorepo of TypeScript CLIs, frameworks, and libraries. Every package is independent, versioned separately, and published to npm under the @bundt scope.',
    actions: [
      { label: 'Get Started', href: '/getting-started/installation', primary: true },
      { label: 'View on GitHub', href: 'https://github.com/mega-blastoise/bundt' }
    ],
    background: 'gradient'
  },

  footer: {
    columns: [
      {
        title: 'Packages',
        links: [
          { label: 'Cleo', href: '/cleo/overview' },
          { label: 'DXDocs', href: '/dxdocs/overview' },
          { label: 'Prev', href: '/prev/overview' },
          { label: 'Signals', href: '/signals/overview' }
        ]
      },
      {
        title: 'Resources',
        links: [
          { label: 'Installation', href: '/getting-started/installation' },
          { label: 'Monorepo Structure', href: '/getting-started/monorepo' },
          { label: 'BCP Docs', href: 'https://docs.bitcontextprotocol.com' }
        ]
      },
      {
        title: 'Community',
        links: [
          { label: 'GitHub', href: 'https://github.com/mega-blastoise/bundt' },
          { label: 'npm', href: 'https://www.npmjs.com/org/bundt' }
        ]
      }
    ],
    socials: [
      { icon: 'github', href: 'https://github.com/mega-blastoise/bundt', label: 'GitHub' }
    ]
  },

  theme: {
    preset: 'minimal',
    darkMode: 'dark'
  },

  output: {
    outDir: './dist'
  }
};
