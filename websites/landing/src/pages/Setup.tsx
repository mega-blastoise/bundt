import { Link } from 'react-router';

const steps = [
  {
    number: '01',
    title: 'Install Bun',
    description: 'bundt is built exclusively for the Bun runtime.',
    code: 'curl -fsSL https://bun.sh/install | bash',
    note: 'Requires Bun 1.0+. Verify with `bun --version`.',
  },
  {
    number: '02',
    title: 'Install Claude Code',
    description: 'bundt tools orchestrate Claude Code sessions. Install the CLI and authenticate.',
    code: `bun add -g @anthropic-ai/claude-code
claude auth`,
    note: 'Requires an Anthropic API key from console.anthropic.com.',
  },
  {
    number: '03',
    title: 'Install cleo',
    description: 'The Claude extensions orchestrator. Manages agents, skills, task templates, and multi-session TUI workflows.',
    code: 'bun add -g @bundt/cleo',
    note: null,
  },
  {
    number: '04',
    title: 'Scaffold your first agent',
    description: 'Create an agent markdown file in your project. Agents define the model, tools, and skills available to Claude Code sessions.',
    code: `# Scaffold an agent with description and tools
cleo init reviewer \\
  -d "Reviews code for correctness, performance, and style" \\
  -t "Read,Grep,Glob"

# Create a skill the agent can reference
cleo create-skill code-review \\
  -d "Structured code review checklist"

# Validate everything is wired up
cleo validate`,
    note: 'Agents live in .claude/agents/, skills in .claude/skills/. Both use frontmatter + markdown.',
  },
  {
    number: '05',
    title: 'Run your first task',
    description: 'Use `cleo task` to interactively build token-efficient context (files, command output, documents) and run it through Claude. Context is assembled into BCP blocks with priority-based budget allocation.',
    code: `# Interactive: walks you through files, commands, docs, budget, model
cleo task "Review the auth module for security issues"

# Or run directly with a prompt
cleo run "Fix the failing tests in src/auth/" \\
  --model claude-sonnet-4-6 \\
  --bcp context.bcp \\
  --max-budget 0.50`,
    note: 'Tasks can be saved as reusable templates with --save <name>.',
  },
  {
    number: '06',
    title: 'Launch the TUI',
    description: 'The full terminal UI lets you run multiple Claude Code sessions concurrently. Dispatch task templates in parallel, follow up on running sessions, and monitor costs — all from one screen.',
    code: `cleo tui

# TUI keybindings:
#   n     New session (pick model, agent, template)
#   D     Dispatch — batch-launch multiple task templates
#   i     Send follow-up message to active session
#   j/k   Navigate sessions / scroll output
#   d     Kill active session
#   t     Cycle theme
#   ?     Help`,
    note: 'Press Ctrl+T in the new session modal to load a saved task template with pre-built context.',
  },
  {
    number: '07',
    title: 'Enable history and experiment',
    description: 'Turn on history tracking to snapshot every agent/skill change. Rollback lets you rapidly experiment with different agent configurations without fear of losing a working setup.',
    code: `# Enable history (SQLite-backed)
cleo config set history.enabled true

# View recent operations
cleo history
cleo history reviewer --detail

# Rollback to a previous snapshot
cleo rollback reviewer --dry-run
cleo rollback reviewer --to 5`,
    note: 'History stores full config snapshots. Use --dry-run to preview what a rollback would restore.',
  },
];

function CodeBlock({ code }: { code: string }) {
  return (
    <div className="relative group">
      <pre className="bg-slate-900/80 border border-slate-800/50 rounded-xl p-4 overflow-x-auto text-sm leading-relaxed">
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

export function Setup() {
  return (
    <div className="min-h-screen pt-24 pb-20">
      <div className="max-w-3xl mx-auto px-6">
        <div className="mb-16">
          <Link to="/" className="text-sm text-slate-500 hover:text-violet-400 transition-colors mb-6 inline-block">
            &larr; Back to home
          </Link>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight mb-4">
            Setup
          </h1>
          <p className="text-lg text-slate-400 leading-relaxed">
            From zero to multi-agent development in seven steps.
          </p>
        </div>

        <div className="space-y-16">
          {steps.map((step) => (
            <div key={step.number} className="relative">
              <div className="flex items-start gap-6">
                <div className="shrink-0 w-12 h-12 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center font-mono font-bold text-violet-400 text-sm">
                  {step.number}
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-xl font-bold text-white mb-2">{step.title}</h2>
                  <p className="text-slate-400 leading-relaxed mb-4">{step.description}</p>
                  <CodeBlock code={step.code} />
                  {step.note && (
                    <p className="mt-3 text-sm text-slate-500 flex items-start gap-2">
                      <svg className="w-4 h-4 shrink-0 mt-0.5 text-violet-400/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {step.note}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-20 p-8 rounded-2xl border border-slate-800/50 bg-slate-900/30 text-center">
          <h3 className="text-xl font-bold text-white mb-3">Ready to build?</h3>
          <p className="text-slate-400 mb-6">
            Check out the cookbook for real-world AI workflow recipes.
          </p>
          <Link
            to="/cookbook"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-violet-500 hover:bg-violet-400 text-white font-semibold transition-all hover:shadow-lg hover:shadow-violet-500/25"
          >
            Browse Recipes
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </Link>
        </div>
      </div>
    </div>
  );
}
