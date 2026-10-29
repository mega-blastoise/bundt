import { Link } from 'react-router';

export function Showcase() {
  return (
    <section className="py-24 px-6">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <span className="text-xs font-semibold uppercase tracking-widest text-violet-400 mb-3 block">
            Showcase
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mb-4">
            See it in action
          </h2>
          <p className="text-slate-400 max-w-xl mx-auto leading-relaxed">
            Live demos showcasing what you can build with the bundt toolkit.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <a
            href="https://playground.bundt-dev.io"
            className="group relative p-8 rounded-2xl border border-slate-800/50 bg-gradient-to-br from-slate-900/80 to-violet-950/20 hover:border-violet-500/30 transition-all duration-300 overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400 text-lg font-bold font-mono">
                  p
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">prev Playground</h3>
                  <span className="text-xs text-violet-400 font-mono">playground.bundt-dev.io</span>
                </div>
              </div>
              <p className="text-sm text-slate-400 leading-relaxed mb-6">
                Type natural language and watch dashboards materialize. 10 fragment types,
                7 data sources, live WebSocket updates, streaming SSR — all composed on the fly.
              </p>
              <div className="flex items-center gap-4">
                <span className="text-xs font-mono text-slate-500">10 fragments</span>
                <span className="text-xs font-mono text-slate-500">7 data sources</span>
                <span className="text-xs font-mono text-slate-500">4 presets</span>
              </div>
            </div>
          </a>

          <Link
            to="/cookbook"
            className="group relative p-8 rounded-2xl border border-slate-800/50 bg-gradient-to-br from-slate-900/80 to-emerald-950/20 hover:border-emerald-500/30 transition-all duration-300 overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-teal-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 text-lg font-bold font-mono">
                  c
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Cookbook</h3>
                  <span className="text-xs text-emerald-400 font-mono">5 recipes</span>
                </div>
              </div>
              <p className="text-sm text-slate-400 leading-relaxed mb-6">
                Step-by-step recipes for AI-driven workflows. Multi-agent TUI sessions,
                agent-composed dashboards, task templates with BCP context, full SDLC pipelines.
              </p>
              <div className="flex items-center gap-4">
                <span className="text-xs font-mono text-slate-500">cleo</span>
                <span className="text-xs font-mono text-slate-500">prev</span>
                <span className="text-xs font-mono text-slate-500">dxdocs</span>
              </div>
            </div>
          </Link>
        </div>
      </div>
    </section>
  );
}
