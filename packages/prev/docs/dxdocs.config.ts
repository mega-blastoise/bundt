export default {
  title: '@bundt/prev',
  description: 'Agent-native dynamic UI framework. Server-composed, streaming React SSR with fragment-based micro-frontends.',
  base: '/prev/',

  headerLinks: [
    { label: 'GitHub', href: 'https://github.com/mega-blastoise/bundt/tree/main/packages/prev', icon: 'github' as const }
  ],

  navigation: [
    { type: 'page' as const, path: '/index', title: 'Introduction' },
    {
      type: 'group' as const,
      title: 'Guide',
      items: [
        { type: 'page' as const, path: '/guide/getting-started', title: 'Getting Started' },
        { type: 'page' as const, path: '/guide/fragments', title: 'Defining Fragments' },
        { type: 'page' as const, path: '/guide/data-sources', title: 'Data Sources' },
        { type: 'page' as const, path: '/guide/composition', title: 'Composing Workspaces' },
        { type: 'page' as const, path: '/guide/interactions', title: 'Interactions & Bindings' }
      ]
    },
    {
      type: 'group' as const,
      title: 'Concepts',
      items: [
        { type: 'page' as const, path: '/concepts/architecture', title: 'Architecture' },
        { type: 'page' as const, path: '/concepts/layout', title: 'Layout System' },
        { type: 'page' as const, path: '/concepts/sessions', title: 'Sessions & Persistence' }
      ]
    },
    {
      type: 'group' as const,
      title: 'API Reference',
      items: [
        { type: 'page' as const, path: '/api/define-fragment', title: 'defineFragment' },
        { type: 'page' as const, path: '/api/define-data-source', title: 'defineDataSource' },
        { type: 'page' as const, path: '/api/create-prev-server', title: 'createPrevServer' },
        { type: 'page' as const, path: '/api/server-routes', title: 'Server Routes' },
        { type: 'page' as const, path: '/api/types', title: 'Type Reference' }
      ]
    }
  ],

  theme: {
    accentColor: '#3b82f6',
    darkMode: 'media' as const
  }
};
