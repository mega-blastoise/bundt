export default {
  title: 'DXDocs',
  description: 'Beautiful documentation, zero framework overhead',

  navigation: [
    { type: 'page', path: '/', title: 'Home' },
    {
      type: 'group',
      title: 'Getting Started',
      items: [
        { type: 'page', path: '/quickstart', title: 'Quickstart' },
        { type: 'page', path: '/configuration', title: 'Configuration' }
      ]
    },
    {
      type: 'group',
      title: 'Guides',
      items: [
        { type: 'page', path: '/writing-content', title: 'Writing Content' },
        { type: 'page', path: '/components', title: 'Components' }
      ]
    }
  ],

  headerLinks: [
    { label: 'GitHub', href: 'https://github.com', icon: 'github' }
  ],

  theme: {
    darkMode: 'media'
  }
};
