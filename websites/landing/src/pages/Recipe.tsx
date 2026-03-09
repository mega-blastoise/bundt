import { useParams, Link } from 'react-router';
import { recipes } from '../data/recipes';

const difficultyColors = {
  beginner: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', text: 'text-emerald-400' },
  intermediate: { bg: 'bg-amber-500/10', border: 'border-amber-500/20', text: 'text-amber-400' },
  advanced: { bg: 'bg-rose-500/10', border: 'border-rose-500/20', text: 'text-rose-400' },
};

function CodeBlock({ code }: { code: string }) {
  return (
    <div className="relative group">
      <pre className="bg-slate-950 border border-slate-800/50 rounded-xl p-5 overflow-x-auto text-sm leading-relaxed">
        <code className="text-slate-300 font-mono">{code}</code>
      </pre>
      <button
        onClick={() => navigator.clipboard.writeText(code)}
        className="absolute top-3 right-3 p-1.5 rounded-md bg-slate-800/50 text-slate-500 hover:text-slate-300 opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
        title="Copy"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <rect x="9" y="9" width="13" height="13" rx="2" strokeWidth="2" />
          <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" strokeWidth="2" />
        </svg>
      </button>
    </div>
  );
}

export function Recipe() {
  const { id } = useParams<{ id: string }>();
  const recipe = recipes.find((r) => r.id === id);

  if (!recipe) {
    return (
      <div className="min-h-screen pt-24 pb-20">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h1 className="text-3xl font-bold text-white mb-4">Recipe not found</h1>
          <Link to="/cookbook" className="text-violet-400 hover:text-violet-300 transition-colors">
            &larr; Back to cookbook
          </Link>
        </div>
      </div>
    );
  }

  const dc = difficultyColors[recipe.difficulty];

  return (
    <div className="min-h-screen pt-24 pb-20">
      <div className="max-w-3xl mx-auto px-6">
        <div className="mb-12">
          <Link to="/cookbook" className="text-sm text-slate-500 hover:text-violet-400 transition-colors mb-6 inline-block">
            &larr; Back to cookbook
          </Link>

          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mb-4">
            {recipe.title}
          </h1>

          <p className="text-lg text-slate-400 leading-relaxed mb-6">
            {recipe.description}
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <span className={`text-xs font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full border ${dc.border} ${dc.bg} ${dc.text}`}>
              {recipe.difficulty}
            </span>
            <span className="text-sm text-slate-500 font-mono flex items-center gap-1.5">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {recipe.duration}
            </span>
            <div className="flex gap-2 ml-2">
              {recipe.packages.map((pkg) => (
                <span
                  key={pkg}
                  className="text-xs font-mono font-medium px-2 py-0.5 rounded-full border border-violet-500/20 bg-violet-500/5 text-violet-400"
                >
                  {pkg}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div
          className="h-0.5 rounded-full mb-12"
          style={{ background: `linear-gradient(to right, ${recipe.color}, transparent)` }}
        />

        <div className="space-y-12">
          {recipe.steps.map((step, i) => (
            <div key={i} className="relative">
              <div className="flex items-start gap-5">
                <div className="shrink-0 flex flex-col items-center">
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center font-mono font-bold text-sm text-white border"
                    style={{
                      borderColor: recipe.color + '40',
                      background: recipe.color + '15',
                    }}
                  >
                    {i + 1}
                  </div>
                  {i < recipe.steps.length - 1 && (
                    <div className="w-px h-full min-h-8 bg-slate-800/50 mt-3" />
                  )}
                </div>

                <div className="flex-1 min-w-0 pb-4">
                  <h3 className="text-lg font-bold text-white mb-2">{step.title}</h3>
                  <p className="text-slate-400 leading-relaxed mb-4">{step.description}</p>
                  {step.code && <CodeBlock code={step.code} />}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-16 flex items-center justify-between p-6 rounded-2xl border border-slate-800/50 bg-slate-900/30">
          <div>
            <h3 className="text-lg font-bold text-white mb-1">What's next?</h3>
            <p className="text-sm text-slate-400">Explore more AI workflow recipes.</p>
          </div>
          <Link
            to="/cookbook"
            className="px-5 py-2.5 rounded-xl bg-violet-500 hover:bg-violet-400 text-white font-semibold text-sm transition-all hover:shadow-lg hover:shadow-violet-500/25"
          >
            All Recipes
          </Link>
        </div>
      </div>
    </div>
  );
}
