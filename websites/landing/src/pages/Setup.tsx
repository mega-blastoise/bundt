import { useState } from 'react';
import { Link } from 'react-router';
import {
  Terminal,
  CheckCircle2,
  ChevronRight,
  Copy,
  Info,
  AlertTriangle,
  Package,
  Bot,
  FileText,
  Cpu,
  Zap,
} from 'lucide-react';

type Step = {
  number: string;
  title: string;
  description: string;
  code: string;
  note: string | null;
  warn?: string | null;
  verify?: string;
};

const prerequisites: Step[] = [
  {
    number: '01',
    title: 'Install Bun',
    description:
      'All bundt packages target the Bun runtime exclusively. Install Bun 1.0+ and verify it is on your PATH.',
    code: `curl -fsSL https://bun.sh/install | bash

# Verify installation
bun --version   # should print 1.x.x`,
    note: 'macOS, Linux, and WSL2 are supported. Native Windows support is in beta. See bun.sh/docs/installation for alternatives (Homebrew, npm, Docker).',
    warn: null,
  },
  {
    number: '02',
    title: 'Install Claude Code',
    description:
      'bundt/cleo orchestrates Claude Code sessions. You need the Claude Code CLI installed globally and authenticated with an Anthropic API key.',
    code: `# Install Claude Code globally
bun add -g @anthropic-ai/claude-code

# Authenticate — opens browser to console.anthropic.com
claude auth

# Verify
claude --version`,
    note: 'Requires an active Anthropic API key with usage credits. Create one at console.anthropic.com/settings/keys.',
    warn: 'Claude Code is billed per token. Set spend limits in the Anthropic console before running agent workloads.',
  },
];

const cleoSteps: Step[] = [
  {
    number: '01',
    title: 'Install cleo globally',
    description:
      'cleo is a CLI that manages Claude Code agents, skills, task templates, history, and a multi-session TUI. It works project-locally (reads .claude/) and globally (~/.claude/).',
    code: `bun add -g @bundt/cleo

# Verify
cleo --version
cleo --help`,
    note: 'cleo also ships a Node-compatible binary. If Bun is not available, it falls back gracefully.',
    warn: null,
  },
  {
    number: '02',
    title: 'Scaffold your first agent',
    description:
      'Agents are markdown files in .claude/agents/ with YAML frontmatter (model, tools, skills) and a markdown body (system prompt). cleo init creates one interactively or from flags.',
    code: `# Create an agent with tools
cleo init reviewer \\
  -d "Reviews code for correctness, performance, and style" \\
  -t "Read,Grep,Glob"

# Create a reusable skill
cleo create-skill code-review \\
  -d "Structured code review checklist"

# Validate agents + skills parse correctly
cleo validate`,
    note: 'Agents: .claude/agents/<name>.md. Skills: .claude/skills/<name>.md. Both support frontmatter + markdown.',
    verify: `ls .claude/agents/   # reviewer.md
ls .claude/skills/   # code-review.md`,
  },
  {
    number: '03',
    title: 'Build and run a task',
    description:
      'Tasks assemble token-efficient context from files (with glob patterns), command output, and documents. Context is encoded as BCP blocks with priority-based budget allocation: critical files always survive budget cuts.',
    code: `# Interactive: walks through files, commands, docs, budget, model
cleo task "Review the auth module for security issues"

# Save as reusable template
cleo task "Review the auth module for security issues" --save review-auth

# Headless execution with explicit budget
cleo run "Fix the failing tests in src/auth/" \\
  --model claude-sonnet-4-6 \\
  --max-budget 0.50`,
    note: 'Templates are JSON files in .cleo/tasks/ (local) or ~/.claude/tasks/ (global). Use --dry-run to preview assembled context without executing.',
    warn: null,
  },
  {
    number: '04',
    title: 'Launch the TUI',
    description:
      'The terminal UI runs multiple Claude Code sessions concurrently. Dispatch saved task templates in parallel, follow up on running sessions, and monitor token usage and costs from one screen.',
    code: `cleo tui

# Keybindings:
#   n       New session (pick model, agent, template)
#   D       Dispatch — batch-launch multiple task templates
#   Ctrl+T  Load a saved task template in new-session modal
#   i       Send follow-up to active session (uses --resume)
#   j/k     Navigate sessions / scroll output
#   d       Kill active session (confirms first)
#   x       Dismiss completed/errored session
#   t       Cycle theme (monokai, dracula, etc.)
#   ?       Show all keybindings`,
    note: 'Each session runs as a separate claude process. cleo manages lifecycle, stdin/stdout capture, and --resume threading.',
    warn: null,
  },
  {
    number: '05',
    title: 'Enable history and rollback',
    description:
      'History tracks every agent/skill modification as a SQLite-backed snapshot. Roll back to any previous state when an experiment goes wrong.',
    code: `# Enable history tracking
cleo config set history.enabled true

# View operations
cleo history
cleo history reviewer --detail

# Preview a rollback
cleo rollback reviewer --dry-run

# Restore to a specific snapshot
cleo rollback reviewer --to 3`,
    note: 'Snapshots include the full markdown file (frontmatter + body). Use cleo history --id <n> --detail to inspect any snapshot.',
    warn: null,
  },
];

const otherPackages = [
  {
    name: '@bundt/prev',
    abbrev: 'prev',
    icon: Zap,
    color: 'amber',
    description:
      'Agent-native dynamic UI framework. Compose dashboards from natural language — server-rendered, streaming, live WebSocket updates.',
    install: 'bun add @bundt/prev',
    usage: `import { defineFragment, defineDataSource, createCompositionEngine } from '@bundt/prev/server';

// See the "Agent-Composed Dashboard" cookbook recipe for a full walkthrough`,
    docs: '/cookbook/prev-agent-dashboard',
    docsLabel: 'Dashboard recipe',
  },
  {
    name: '@bundt/dxdocs',
    abbrev: 'dxdocs',
    icon: FileText,
    color: 'blue',
    description:
      'Zero-JS static documentation from Markdown/MDX. Filesystem routing, syntax highlighting, dark mode, custom themes.',
    install: 'bun add -d @bundt/dxdocs',
    usage: `# Create config
cat > dxdocs.config.json << 'EOF'
{
  "title": "My Project",
  "contentDir": "./docs",
  "outDir": "./docs-dist"
}
EOF

# Build and preview
bunx dxdocs build
bunx dxdocs preview`,
    docs: '/cookbook/docs-site',
    docsLabel: 'Docs site recipe',
  },
  {
    name: '@bundt/ollama',
    abbrev: 'ollama',
    icon: Cpu,
    color: 'rose',
    description:
      'Run Claude Code with local Ollama LLMs. Zero API costs, complete privacy. Manages local model lifecycles.',
    install: 'bun add -g @bundt/ollama',
    usage: `# Requires Ollama running locally (ollama.com)
ollama-bundt start
ollama-bundt models`,
    docs: null,
    docsLabel: null,
    prerelease: true,
  },
];

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="absolute top-3 right-3 p-1.5 rounded-md bg-slate-800/50 text-slate-500 hover:text-slate-300 opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
      title="Copy"
    >
      {copied ? (
        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
      ) : (
        <Copy className="w-4 h-4" />
      )}
    </button>
  );
}

function CodeBlock({ code }: { code: string }) {
  return (
    <div className="relative group">
      <pre className="bg-slate-900/80 border border-slate-800/50 rounded-xl p-4 overflow-x-auto text-sm leading-relaxed">
        <code className="text-slate-300 font-mono">{code}</code>
      </pre>
      <CopyButton text={code} />
    </div>
  );
}

function StepCard({ step }: { step: Step }) {
  return (
    <div className="relative">
      <div className="flex items-start gap-6">
        <div className="shrink-0 w-12 h-12 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center font-mono font-bold text-violet-400 text-sm">
          {step.number}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-xl font-bold text-white mb-2">{step.title}</h3>
          <p className="text-slate-400 leading-relaxed mb-4">{step.description}</p>
          <CodeBlock code={step.code} />
          {step.verify && (
            <div className="mt-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-2">
                Verify
              </p>
              <CodeBlock code={step.verify} />
            </div>
          )}
          {step.warn && (
            <p className="mt-3 text-sm text-amber-400/80 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              {step.warn}
            </p>
          )}
          {step.note && (
            <p className="mt-3 text-sm text-slate-500 flex items-start gap-2">
              <Info className="w-4 h-4 shrink-0 mt-0.5 text-violet-400/50" />
              {step.note}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export function Setup() {
  return (
    <div className="min-h-screen pt-24 pb-20">
      <div className="max-w-3xl mx-auto px-6">
        {/* Header */}
        <div className="mb-16">
          <Link
            to="/"
            className="text-sm text-slate-500 hover:text-violet-400 transition-colors mb-6 inline-block"
          >
            &larr; Back to home
          </Link>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight mb-4">
            Setup Guide
          </h1>
          <p className="text-lg text-slate-400 leading-relaxed">
            Prerequisites, installation, and first steps for the bundt ecosystem.
          </p>
        </div>

        {/* Table of contents */}
        <nav className="mb-16 p-6 rounded-2xl border border-slate-800/50 bg-slate-900/30">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-500 mb-4">
            On this page
          </h2>
          <ul className="space-y-2">
            {[
              { href: '#prerequisites', label: 'Prerequisites', desc: 'Bun + Claude Code' },
              { href: '#cleo', label: 'cleo', desc: 'Agent orchestrator CLI' },
              { href: '#other-packages', label: 'Other packages', desc: 'prev, dxdocs, ollama' },
            ].map((item) => (
              <li key={item.href}>
                <a
                  href={item.href}
                  className="flex items-center gap-3 text-slate-400 hover:text-white transition-colors group"
                >
                  <ChevronRight className="w-3.5 h-3.5 text-violet-500 group-hover:translate-x-0.5 transition-transform" />
                  <span className="font-medium">{item.label}</span>
                  <span className="text-sm text-slate-600">{item.desc}</span>
                </a>
              </li>
            ))}
          </ul>
        </nav>

        {/* Prerequisites */}
        <section id="prerequisites" className="mb-20 scroll-mt-24">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700/50 flex items-center justify-center">
              <Terminal className="w-5 h-5 text-slate-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Prerequisites</h2>
              <p className="text-sm text-slate-500">Required for all bundt packages</p>
            </div>
          </div>
          <div className="space-y-12">
            {prerequisites.map((step) => (
              <StepCard key={step.number} step={step} />
            ))}
          </div>
        </section>

        {/* Divider */}
        <div className="border-t border-slate-800/50 mb-20" />

        {/* cleo */}
        <section id="cleo" className="mb-20 scroll-mt-24">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
              <Bot className="w-5 h-5 text-violet-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">@bundt/cleo</h2>
              <p className="text-sm text-slate-500">
                Claude extensions orchestrator
              </p>
            </div>
          </div>
          <p className="text-slate-400 leading-relaxed mb-8 ml-13">
            cleo is the primary entry point for AI-first development with bundt. It manages agent
            configurations, reusable skills, context-assembled task templates, and a full terminal UI
            for running multiple Claude Code sessions concurrently.
          </p>
          <div className="space-y-12">
            {cleoSteps.map((step) => (
              <StepCard key={step.number} step={step} />
            ))}
          </div>
        </section>

        {/* Divider */}
        <div className="border-t border-slate-800/50 mb-20" />

        {/* Other packages */}
        <section id="other-packages" className="mb-20 scroll-mt-24">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700/50 flex items-center justify-center">
              <Package className="w-5 h-5 text-slate-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Other packages</h2>
              <p className="text-sm text-slate-500">
                Independent packages in the bundt ecosystem
              </p>
            </div>
          </div>

          <div className="space-y-8">
            {otherPackages.map((pkg) => {
              const Icon = pkg.icon;
              return (
                <div
                  key={pkg.name}
                  className="p-6 rounded-2xl border border-slate-800/50 bg-slate-900/30"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                          pkg.color === 'amber'
                            ? 'bg-amber-500/10 border border-amber-500/20'
                            : pkg.color === 'blue'
                              ? 'bg-blue-500/10 border border-blue-500/20'
                              : 'bg-rose-500/10 border border-rose-500/20'
                        }`}
                      >
                        <Icon
                          className={`w-4.5 h-4.5 ${
                            pkg.color === 'amber'
                              ? 'text-amber-400'
                              : pkg.color === 'blue'
                                ? 'text-blue-400'
                                : 'text-rose-400'
                          }`}
                        />
                      </div>
                      <div>
                        <span className="font-mono text-lg text-white">{pkg.name}</span>
                        {'prerelease' in pkg && (
                          <span className="ml-2 text-[9px] font-semibold uppercase tracking-widest px-1.5 py-0.5 rounded border border-amber-500/30 bg-amber-500/10 text-amber-400">
                            coming soon
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <p className="text-sm text-slate-400 leading-relaxed mb-4">{pkg.description}</p>
                  <CodeBlock code={pkg.usage} />
                  <div className="mt-4 flex items-center gap-4">
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/50 border border-slate-700/50 font-mono text-xs text-slate-400">
                      <span className="text-violet-400">$</span>
                      {pkg.install}
                    </div>
                    {pkg.docs && (
                      <Link
                        to={pkg.docs}
                        className="text-sm text-violet-400 hover:text-violet-300 transition-colors flex items-center gap-1"
                      >
                        {pkg.docsLabel}
                        <ChevronRight className="w-3.5 h-3.5" />
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* CTA */}
        <div className="p-8 rounded-2xl border border-slate-800/50 bg-slate-900/30 text-center">
          <h3 className="text-xl font-bold text-white mb-3">Ready to build?</h3>
          <p className="text-slate-400 mb-6">
            Check out the cookbook for real-world AI workflow recipes.
          </p>
          <Link
            to="/cookbook"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-violet-500 hover:bg-violet-400 text-white font-semibold transition-all hover:shadow-lg hover:shadow-violet-500/25"
          >
            Browse Recipes
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
