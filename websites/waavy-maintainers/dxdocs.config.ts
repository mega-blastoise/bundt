// Maintainer documentation for waavy: architecture, development, releasing,
// and runbooks. User-facing docs live in websites/waavy-docs.

export default {
  title: 'Waavy Maintainers',
  description: 'How waavy is built, tested, released and maintained.',
  base: '/',

  headerLinks: [
    { label: 'GitHub', href: 'https://github.com/mega-blastoise/bundt', icon: 'github' },
    { label: 'Actions', href: 'https://github.com/mega-blastoise/bundt/actions', icon: 'external' }
  ],

  navigation: [
    { type: 'page', path: '/', title: 'Overview' },
    {
      type: 'group',
      title: 'Architecture',
      items: [
        { type: 'page', path: '/architecture/overview', title: 'System Overview' },
        { type: 'page', path: '/architecture/build-and-releases', title: 'Build and Releases' },
        { type: 'page', path: '/architecture/rendering', title: 'Rendering and Hydration' },
        { type: 'page', path: '/architecture/transports', title: 'Transports' },
        { type: 'page', path: '/architecture/distribution', title: 'Distribution' },
        { type: 'page', path: '/architecture/rust-crate', title: 'Rust Crate' },
        { type: 'page', path: '/architecture/decisions', title: 'Decision Log' }
      ]
    },
    {
      type: 'group',
      title: 'Development',
      items: [
        { type: 'page', path: '/development/setup', title: 'Setup' },
        { type: 'page', path: '/development/testing', title: 'Testing' },
        { type: 'page', path: '/development/conventions', title: 'Conventions' },
        { type: 'page', path: '/development/ci', title: 'CI' }
      ]
    },
    {
      type: 'group',
      title: 'Releasing',
      items: [
        { type: 'page', path: '/releasing/versioning', title: 'Versioning' },
        { type: 'page', path: '/releasing/workflow', title: 'Release Workflow' },
        { type: 'page', path: '/releasing/runbook', title: 'Release Runbook' },
        { type: 'page', path: '/releasing/troubleshooting', title: 'Release Troubleshooting' }
      ]
    },
    {
      type: 'group',
      title: 'Runbooks',
      items: [
        { type: 'page', path: '/runbooks/protocol-changes', title: 'Changing the Protocol' },
        { type: 'page', path: '/runbooks/adding-a-platform', title: 'Adding a Platform' },
        { type: 'page', path: '/runbooks/upgrading-dependencies', title: 'Upgrading Dependencies' }
      ]
    },
    { type: 'page', path: '/known-issues', title: 'Known Issues' },
    { type: 'page', path: '/roadmap', title: 'Roadmap' }
  ],

  footer: {
    columns: [
      {
        title: 'Source',
        links: [
          { label: 'packages/waavy', href: 'https://github.com/mega-blastoise/bundt/tree/main/packages/waavy' },
          { label: 'crates/waavy', href: 'https://github.com/mega-blastoise/bundt/tree/main/crates/waavy' },
          { label: 'Specs', href: 'https://github.com/mega-blastoise/bundt/tree/main/.claude/specs/waavy' }
        ]
      },
      {
        title: 'Published',
        links: [
          { label: 'npm', href: 'https://www.npmjs.com/package/@bundt/waavy' },
          { label: 'crates.io', href: 'https://crates.io/crates/waavy' },
          { label: 'Releases', href: 'https://github.com/mega-blastoise/bundt/releases' }
        ]
      }
    ],
    copyright: 'Internal maintainer documentation. MIT licensed.'
  },

  theme: {
    preset: 'nord',
    accentColor: '#a855f7',
    darkMode: 'media'
  },

  output: {
    outDir: './dist'
  }
};
