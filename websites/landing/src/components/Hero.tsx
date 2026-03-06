import { Suspense } from 'react';
import { HeroScene } from './HeroScene';

export function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-slate-950 to-violet-950/20" />
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-violet-500/5 rounded-full blur-3xl" />

      <Suspense fallback={null}>
        <HeroScene />
      </Suspense>

      <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-violet-500/20 bg-violet-500/5 mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
          <span className="text-xs font-medium text-violet-300 tracking-wide uppercase">
            v0.1.0 Released
          </span>
        </div>

        <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white leading-[1.1] mb-6">
          Bun developer{' '}
          <span className="bg-gradient-to-r from-violet-400 to-purple-500 bg-clip-text text-transparent">
            toolkits
          </span>
        </h1>

        <p className="text-lg sm:text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
          CLIs, frameworks, and libraries for the Bun runtime.
          All TypeScript. All fast. All MIT licensed.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <a
            href="https://docs.bundt-dev.io"
            className="px-6 py-3 rounded-xl bg-violet-500 hover:bg-violet-400 text-white font-semibold transition-all hover:shadow-lg hover:shadow-violet-500/25"
          >
            Read the Docs
          </a>
          <div className="flex items-center gap-2 px-5 py-3 rounded-xl bg-slate-800/50 border border-slate-700/50 font-mono text-sm text-slate-300">
            <span className="text-violet-400">$</span>
            <span>bun add @bundt/cleo</span>
            <button
              onClick={() => navigator.clipboard.writeText('bun add @bundt/cleo')}
              className="ml-2 text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
              title="Copy"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <rect x="9" y="9" width="13" height="13" rx="2" strokeWidth="2" />
                <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" strokeWidth="2" />
              </svg>
            </button>
          </div>
        </div>

        <div className="flex items-center justify-center gap-8 mt-16 text-sm text-slate-500">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>MIT Licensed</span>
          </div>
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            <span>4 npm Packages</span>
          </div>
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <span>Bun-native</span>
          </div>
        </div>
      </div>

      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
        <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
        </svg>
      </div>
    </section>
  );
}
