export default {
  title: '@dxforge/docs',
  description: 'Beautiful documentation sites from MDX. Zero client JS.',

  navigation: [
    { type: 'page', path: '/', title: 'Introduction' },
    {
      type: 'group',
      title: 'Getting Started',
      items: [
        { type: 'page', path: '/installation', title: 'Installation' },
        { type: 'page', path: '/project-structure', title: 'Project Structure' },
        { type: 'page', path: '/configuration', title: 'Configuration' }
      ]
    },
    {
      type: 'group',
      title: 'Authoring',
      items: [
        { type: 'page', path: '/writing-content', title: 'Writing Content' },
        { type: 'page', path: '/components', title: 'Components' },
        { type: 'page', path: '/syntax-highlighting', title: 'Syntax Highlighting' }
      ]
    },
    {
      type: 'group',
      title: 'Reference',
      items: [
        { type: 'page', path: '/cli', title: 'CLI' },
        { type: 'page', path: '/theming', title: 'Theming' },
        { type: 'page', path: '/deploying', title: 'Deploying' },
        { type: 'page', path: '/environmental-impact', title: 'Environmental Impact' }
      ]
    }
  ],

  headerLinks: [
    { label: 'GitHub', href: 'https://github.com/dxforge/docs', icon: 'github' },
    { label: 'npm', href: 'https://www.npmjs.com/package/@dxforge/docs', icon: 'external' }
  ],

  theme: {
    darkMode: 'media'
  },

  output: {
    outDir: './site'
  }
};
