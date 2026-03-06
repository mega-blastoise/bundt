const packages = [
  {
    name: '@bundt/cleo',
    version: '0.1.0',
    description: 'Claude extensions orchestrator. Manage, discover, and run Claude Code agents and skills. Full TUI, task runner, BCP integration.',
    tags: ['cli', 'ai', 'mcp', 'agents'],
    href: 'https://www.npmjs.com/package/@bundt/cleo',
    color: 'from-violet-500 to-purple-600'
  },
  {
    name: '@bundt/dxdocs',
    version: '0.1.0',
    description: 'Beautiful documentation sites from MDX. Zero client JavaScript, pure static HTML. Built-in components, syntax highlighting, dark mode.',
    tags: ['docs', 'mdx', 'ssg', 'react'],
    href: 'https://www.npmjs.com/package/@bundt/dxdocs',
    color: 'from-blue-500 to-cyan-600'
  },
  {
    name: '@bundt/prev',
    version: '0.1.0',
    description: 'Agent-native dynamic UI framework. Server-composed, streaming React SSR with fragment-based micro-frontends and WebSocket interactions.',
    tags: ['react', 'ssr', 'ai', 'streaming'],
    href: 'https://www.npmjs.com/package/@bundt/prev',
    color: 'from-amber-500 to-orange-600'
  },
  {
    name: '@bundt/signals',
    version: '0.1.0',
    description: 'Reactive signal graph abstractions. Signals, computed values, and effects with automatic dependency tracking and batching.',
    tags: ['reactive', 'signals', 'state'],
    href: 'https://www.npmjs.com/package/@bundt/signals',
    color: 'from-emerald-500 to-teal-600'
  }
];

export function Packages() {
  return (
    <section id="packages" className="py-32 relative">
      <div className="absolute inset-0 bg-gradient-to-b from-violet-950/20 via-transparent to-transparent" />

      <div className="relative max-w-7xl mx-auto px-6">
        <div className="text-center mb-20">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            The toolkit
          </h2>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto">
            Each package is independent, versioned separately, and published to npm under the <code className="text-violet-400 font-mono text-base">@bundt</code> scope.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {packages.map((pkg) => (
            <a
              key={pkg.name}
              href={pkg.href}
              target="_blank"
              rel="noreferrer"
              className="group relative p-6 rounded-2xl border border-slate-800/50 bg-slate-900/30 hover:bg-slate-900/50 hover:border-violet-500/20 transition-all duration-300 overflow-hidden"
            >
              {/* Gradient accent bar */}
              <div className={`absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r ${pkg.color} opacity-0 group-hover:opacity-100 transition-opacity`} />

              <div className="flex items-start justify-between mb-3">
                <div>
                  <span className="font-mono text-lg text-white group-hover:text-violet-300 transition-colors">
                    {pkg.name}
                  </span>
                  <span className="ml-2 text-xs font-mono text-slate-600">
                    v{pkg.version}
                  </span>
                </div>
                <svg className="w-4 h-4 text-slate-600 group-hover:text-slate-400 transition-colors mt-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </div>

              <p className="text-sm text-slate-400 leading-relaxed mb-4">
                {pkg.description}
              </p>

              <div className="flex flex-wrap gap-2">
                {pkg.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 rounded-full border border-slate-700/50 text-slate-500"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </a>
          ))}
        </div>

        {/* Install block */}
        <div className="mt-16 text-center">
          <p className="text-sm text-slate-500 mb-4">Install any package with Bun:</p>
          <div className="inline-flex items-center gap-3 px-5 py-3 rounded-xl bg-slate-800/50 border border-slate-700/50 font-mono text-sm text-slate-300">
            <span className="text-violet-400">$</span>
            <span>bun add @bundt/cleo @bundt/dxdocs @bundt/prev @bundt/signals</span>
          </div>
        </div>
      </div>
    </section>
  );
}
