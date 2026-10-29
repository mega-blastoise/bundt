// Consumer documentation for @bundt/waavy and the `waavy` Rust crate.
// Maintainer docs live in websites/waavy-maintainers.

export default {
  title: 'Waavy',
  description: 'Render React pages from any server — Rust, Python, Go, Ruby — without running JavaScript in it.',
  base: '/',

  headerLinks: [
    { label: 'GitHub', href: 'https://github.com/mega-blastoise/bundt/tree/main/packages/waavy', icon: 'github' },
    { label: 'npm', href: 'https://www.npmjs.com/package/@bundt/waavy', icon: 'external' },
    { label: 'docs.rs', href: 'https://docs.rs/waavy', icon: 'external' }
  ],

  navigation: [
    {
      type: 'group',
      title: 'Getting Started',
      items: [
        { type: 'page', path: '/', title: 'Introduction' },
        { type: 'page', path: '/getting-started/installation', title: 'Installation' },
        { type: 'page', path: '/getting-started/quickstart', title: 'Quickstart' },
        { type: 'page', path: '/getting-started/concepts', title: 'Core Concepts' }
      ]
    },
    {
      type: 'group',
      title: 'Guides',
      items: [
        { type: 'page', path: '/guides/pages-and-props', title: 'Pages and Props' },
        { type: 'page', path: '/guides/styling', title: 'Styling' },
        { type: 'page', path: '/guides/suspense-and-streaming', title: 'Suspense and Streaming' },
        { type: 'page', path: '/guides/local-development', title: 'Local Development' },
        { type: 'page', path: '/guides/deployment', title: 'Deployment' }
      ]
    },
    {
      type: 'group',
      title: 'Hosts',
      items: [
        { type: 'page', path: '/guides/rust', title: 'Rust' },
        { type: 'page', path: '/guides/any-language', title: 'Any Language (HTTP)' },
        { type: 'page', path: '/guides/bun', title: 'Bun (in-process)' }
      ]
    },
    {
      type: 'group',
      title: 'Reference',
      items: [
        { type: 'page', path: '/reference/cli', title: 'CLI' },
        { type: 'page', path: '/reference/configuration', title: 'Configuration' },
        { type: 'page', path: '/reference/protocol', title: 'Host Protocol' },
        { type: 'page', path: '/reference/errors', title: 'Error Codes' },
        { type: 'page', path: '/reference/rust-crate', title: 'Rust Crate' },
        { type: 'page', path: '/reference/platforms', title: 'Platforms' }
      ]
    },
    { type: 'page', path: '/troubleshooting', title: 'Troubleshooting' }
  ],

  coverpage: {
    title: 'Waavy',
    tagline: 'React pages for every backend',
    description:
      'Register React pages, build a release, and render them from Rust, Python, Go or anything that speaks HTTP. JSON props in, hydrated HTML out. No JavaScript runtime in your server.',
    actions: [
      { label: 'Get Started', href: '/getting-started/quickstart', primary: true },
      { label: 'Core Concepts', href: '/getting-started/concepts' },
      { label: 'GitHub', href: 'https://github.com/mega-blastoise/bundt/tree/main/packages/waavy' }
    ],
    background: 'gradient'
  },

  footer: {
    columns: [
      {
        title: 'Learn',
        links: [
          { label: 'Quickstart', href: '/getting-started/quickstart' },
          { label: 'Deployment', href: '/guides/deployment' },
          { label: 'Host Protocol', href: '/reference/protocol' }
        ]
      },
      {
        title: 'Packages',
        links: [
          { label: '@bundt/waavy (npm)', href: 'https://www.npmjs.com/package/@bundt/waavy' },
          { label: 'waavy (crates.io)', href: 'https://crates.io/crates/waavy' },
          { label: 'Releases', href: 'https://github.com/mega-blastoise/bundt/releases' }
        ]
      }
    ],
    copyright: 'MIT licensed. Part of the Bundt toolkit.',
    socials: [{ icon: 'github', href: 'https://github.com/mega-blastoise/bundt', label: 'GitHub' }]
  },

  theme: {
    preset: 'minimal',
    accentColor: '#c026d3',
    darkMode: 'media'
  },

  output: {
    outDir: './dist'
  }
};
