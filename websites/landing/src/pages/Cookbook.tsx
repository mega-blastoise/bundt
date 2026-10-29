import { Link } from 'react-router';
import { recipes } from '../data/recipes';

const difficultyColors = {
  beginner: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', text: 'text-emerald-400' },
  intermediate: { bg: 'bg-amber-500/10', border: 'border-amber-500/20', text: 'text-amber-400' },
  advanced: { bg: 'bg-rose-500/10', border: 'border-rose-500/20', text: 'text-rose-400' },
};

export function Cookbook() {
  return (
    <div className="min-h-screen pt-24 pb-20">
      <div className="max-w-5xl mx-auto px-6">
        <div className="mb-16">
          <Link to="/" className="text-sm text-slate-500 hover:text-violet-400 transition-colors mb-6 inline-block">
            &larr; Back to home
          </Link>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight mb-4">
            Cookbook
          </h1>
          <p className="text-lg text-slate-400 leading-relaxed max-w-2xl">
            Step-by-step recipes for AI-driven development workflows.
            Each recipe is a real-world pattern you can use today.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {recipes.map((recipe) => {
            const dc = difficultyColors[recipe.difficulty];
            return (
              <Link
                key={recipe.id}
                to={`/cookbook/${recipe.id}`}
                className="group relative p-6 rounded-2xl border border-slate-800/50 bg-slate-900/30 hover:bg-slate-900/50 hover:border-violet-500/20 transition-all duration-300 overflow-hidden"
              >
                <div
                  className="absolute top-0 left-0 right-0 h-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ background: `linear-gradient(to right, ${recipe.color}, ${recipe.color}88)` }}
                />

                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-lg font-bold text-white group-hover:text-violet-300 transition-colors leading-tight pr-4">
                    {recipe.title}
                  </h3>
                  <svg className="w-4 h-4 text-slate-600 group-hover:text-slate-400 transition-colors shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </div>

                <p className="text-sm text-slate-400 leading-relaxed mb-4">
                  {recipe.description}
                </p>

                <div className="flex items-center justify-between">
                  <div className="flex flex-wrap gap-2">
                    {recipe.packages.map((pkg) => (
                      <span
                        key={pkg}
                        className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-full border border-violet-500/20 bg-violet-500/5 text-violet-400"
                      >
                        {pkg}
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center gap-3">
                    <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border ${dc.border} ${dc.bg} ${dc.text}`}>
                      {recipe.difficulty}
                    </span>
                    <span className="text-xs text-slate-500 font-mono">
                      {recipe.duration}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-slate-800/30">
                  {recipe.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-[9px] font-medium uppercase tracking-wider text-slate-600"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
