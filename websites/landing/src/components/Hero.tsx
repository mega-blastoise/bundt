export function Hero() {
  return (
    <section className="relative min-h-screen flex items-end justify-center overflow-hidden">
      {/* Pure black base */}
      <div className="absolute inset-0 bg-black" />

      {/* Outermost atmospheric wash */}
      <div
        className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[220%] h-[90%]"
        style={{
          background:
            'radial-gradient(ellipse 65% 85% at 50% 100%, rgba(109,40,217,0.5) 0%, rgba(91,33,182,0.22) 30%, rgba(46,16,101,0.09) 55%, transparent 75%)',
        }}
      />

      {/* Mid glow — rich saturated violet, higher reach */}
      <div
        className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[180%] h-[80%]"
        style={{
          background:
            'radial-gradient(ellipse 55% 75% at 50% 100%, rgba(124,58,237,0.75) 0%, rgba(109,40,217,0.38) 25%, rgba(76,29,149,0.13) 50%, transparent 70%)',
        }}
      />

      {/* Inner bright glow — concentrated warm violet */}
      <div
        className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[140%] h-[60%]"
        style={{
          background:
            'radial-gradient(ellipse 50% 65% at 50% 100%, rgba(139,92,246,0.9) 0%, rgba(124,58,237,0.45) 25%, rgba(109,40,217,0.12) 50%, transparent 70%)',
        }}
      />

      {/* Hot core — bright highlight at the very bottom center */}
      <div
        className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[100%] h-[45%]"
        style={{
          background:
            'radial-gradient(ellipse 45% 55% at 50% 100%, rgba(167,139,250,0.95) 0%, rgba(139,92,246,0.55) 20%, rgba(124,58,237,0.16) 45%, transparent 65%)',
        }}
      />

      {/* Brightest edge — white-violet line at horizon */}
      <div
        className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[75%] h-[24%]"
        style={{
          background:
            'radial-gradient(ellipse 55% 45% at 50% 100%, rgba(196,181,253,0.75) 0%, rgba(167,139,250,0.35) 30%, transparent 60%)',
        }}
      />

      {/* Subtle top vignette to keep header area pure black */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(to bottom, black 0%, black 15%, transparent 45%)',
        }}
      />

      {/* Grain texture */}
      <div className="absolute inset-0 opacity-[0.035] bg-[url('data:image/svg+xml,%3Csvg viewBox=%220 0 256 256%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22n%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.85%22 numOctaves=%224%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23n)%22/%3E%3C/svg%3E')]" />

      {/* Content — positioned in lower-center, within the glow */}
      <div className="relative z-10 max-w-4xl mx-auto px-6 text-center pb-24 pt-32">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/10 bg-white/[0.04] mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-bundt-400 animate-pulse" />
          <span className="text-xs font-medium text-bundt-300 tracking-wide uppercase">
            AI-native developer toolkits
          </span>
        </div>

        <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white leading-[1.08] mb-6">
          Build with{' '}
          <span className="bg-gradient-to-r from-bundt-300 to-bundt-400 bg-clip-text text-transparent">
            AI agents
          </span>
          ,{' '}
          <br className="hidden sm:block" />
          ship on{' '}
          <span className="bg-gradient-to-r from-bundt-200 to-bundt-400 bg-clip-text text-transparent">
            Bun
          </span>
        </h1>

        <p className="text-lg sm:text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
          CLIs, frameworks, and libraries designed for AI-first development.
          Orchestrate agents, generate docs, stream UIs &mdash; all TypeScript, all Bun-native.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <a
            href="https://docs.bundt-dev.io"
            className="group inline-flex items-center gap-2 px-6 py-3 rounded-full border border-white/15 bg-white/[0.06] hover:bg-white/[0.1] text-white font-semibold transition-all backdrop-blur-sm"
          >
            Read the Docs
            <svg
              className="w-4 h-4 transition-transform group-hover:translate-x-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M9 5l7 7-7 7"
              />
            </svg>
          </a>
          <span className="text-sm text-slate-500">View Demo</span>
        </div>

        <div className="flex items-center justify-center gap-8 mt-20 text-sm text-slate-500">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <span>Agent-native</span>
          </div>
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span>MCP + BCP</span>
          </div>
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <span>Bun-native</span>
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 animate-bounce z-10">
        <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
        </svg>
      </div>
    </section>
  );
}
