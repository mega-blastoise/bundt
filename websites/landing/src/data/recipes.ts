export type Recipe = {
  id: string;
  title: string;
  description: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  duration: string;
  packages: string[];
  tags: string[];
  color: string;
  steps: {
    title: string;
    description: string;
    code?: string;
  }[];
};

export const recipes: Recipe[] = [
  {
    id: 'tui-multi-session',
    title: 'Multi-Agent TUI Workflows',
    description: 'Use the cleo TUI to run multiple Claude Code sessions concurrently — one reviewing code, one writing tests, one generating docs — all visible in a single terminal.',
    difficulty: 'beginner',
    duration: '10 min',
    packages: ['@bundt/cleo'],
    tags: ['tui', 'multi-agent', 'concurrent'],
    color: '#8b5cf6',
    steps: [
      {
        title: 'Create task templates',
        description: 'Task templates define reusable units of work. Each template captures: a description (the prompt), files to include as context, commands to capture output from, documents for external context, priority levels for BCP budget allocation, and which model to use.',
        code: `# Interactive builder walks through each step
cleo task "Review src/auth/ for security vulnerabilities" --save review-auth

# It will prompt you to:
#   1. Add files (supports globs like "src/auth/**/*.ts")
#   2. Add commands (e.g. "bun test --filter auth" to capture test output)
#   3. Add external context (specs, error logs, API docs)
#   4. Set a token budget for BCP context assembly
#   5. Choose a model

# Create more templates for parallel work
cleo task "Write missing unit tests for src/auth/" --save test-auth
cleo task "Generate API docs for the auth module" --save docs-auth`,
      },
      {
        title: 'List your templates',
        description: 'Templates are JSON files stored in .cleo/tasks/ (local) or ~/.claude/tasks/ (global). Local templates shadow global ones with the same name.',
        code: `cleo task --list

# Output:
# Local templates (.cleo/tasks/)
#   review-auth  — Review src/auth/ for security vulnerabilities
#   test-auth    — Write missing unit tests for src/auth/
#   docs-auth    — Generate API docs for the auth module`,
      },
      {
        title: 'Launch the TUI and dispatch',
        description: 'Open the TUI and press D to enter dispatch mode. Select multiple templates with space, then press enter to launch them all as concurrent Claude Code sessions. Each session runs in its own process with BCP-assembled context.',
        code: `cleo tui

# In the TUI:
#   D           Open dispatch modal
#   j/k         Navigate template list
#   Space       Toggle template selection
#   Enter       Launch all selected templates
#
# Each session appears in the sidebar. Switch between them
# with j/k (sidebar focus) or 1-9 (direct jump).`,
      },
      {
        title: 'Follow up on sessions',
        description: 'When a session completes a turn, it enters "waiting" state. Press i to type a follow-up message. Cleo uses claude --resume to continue the same conversation with full context.',
        code: `# In the TUI with a completed session active:
#   i           Enter chat mode
#   Type your follow-up message
#   Enter       Send (resumes the session via --resume)
#   Escape      Cancel

# Example follow-ups:
#   "Now apply those fixes to src/auth/middleware.ts"
#   "Add edge case tests for expired tokens"
#   "Also document the error codes"`,
      },
      {
        title: 'Monitor and manage',
        description: 'The TUI shows live output, cost tracking, and token usage for each session. Kill runaway sessions, dismiss completed ones, or cycle themes.',
        code: `# Session management:
#   d     Kill active session (confirms first)
#   x     Dismiss completed/errored session
#   /     Rename active session
#   t     Cycle theme (monokai, dracula, etc.)
#   g/G   Jump to top/bottom of output
#   ?     Show all keybindings`,
      },
    ],
  },
  {
    id: 'task-templates',
    title: 'Reusable Task Templates with BCP Context',
    description: 'Build token-efficient task templates that pack files, command output, and documents into BCP-encoded context with priority-based budget allocation. Save them for repeated use across projects.',
    difficulty: 'intermediate',
    duration: '15 min',
    packages: ['@bundt/cleo'],
    tags: ['tasks', 'bcp', 'templates', 'context'],
    color: '#7c3aed',
    steps: [
      {
        title: 'Understand the task anatomy',
        description: 'A task template is a JSON file defining: description (the prompt), files with glob patterns and priority levels, commands whose output to capture, external documents, a token budget, and model selection. Files are prioritized: critical, high, normal, low, background.',
        code: `# Example task template (.cleo/tasks/refactor-module.json):
{
  "description": "Refactor the user service to use the repository pattern",
  "files": [
    { "path": "src/services/user.ts", "priority": "critical" },
    { "path": "src/models/user.ts", "priority": "high" },
    { "path": "src/types.ts", "priority": "normal" },
    { "path": "tests/services/user.test.ts", "priority": "high" }
  ],
  "commands": [
    { "run": "bun test --filter user", "priority": "high", "summary": "Current test results" },
    { "run": "git diff HEAD~3 -- src/services/", "priority": "normal" }
  ],
  "documents": [
    { "title": "Repository Pattern Spec", "content": "...", "format": "markdown", "priority": "critical" }
  ],
  "budget": 8000,
  "model": "claude-sonnet-4-6"
}`,
      },
      {
        title: 'Build interactively with BCP assembly',
        description: 'The interactive gather flow walks you through each section. When BCP is available, cleo assembles all context into BCP blocks — binary-encoded, content-addressed, with adaptive rendering based on your token budget. Critical-priority files always survive budget cuts.',
        code: `cleo task

# Step 1: "What do you need Claude to do?"
# Step 2: Files — auto-detects CLAUDE.md, supports glob patterns
# Step 3: Commands — auto-suggests "git diff" if changes detected
# Step 4: External context — paste text or load from files
# Step 5: Token budget — BCP allocates budget by priority
# Step 6: Model selection

# At the end, save as a template:
#   "Save this as a reusable template?" → yes
#   "Template name:" → refactor-module`,
      },
      {
        title: 'Use BCP context with cleo run',
        description: 'For headless execution, cleo run accepts a .bcp file directly. The context is injected into the Claude Code system prompt. Output is structured JSON validated against a Zod schema.',
        code: `# Headless run with BCP context file
cleo run "Implement the changes described in the spec" \\
  --bcp project-context.bcp \\
  --budget 4000 \\
  --model claude-opus-4-6 \\
  --max-budget 2.00

# Output includes:
#   Summary: what was done
#   Files changed: absolute paths
#   Errors: any issues encountered
#   Stats: tokens in/out, cost, duration, BCP block count`,
      },
      {
        title: 'Dry run to review context',
        description: 'Use --dry-run to see exactly what context will be sent to Claude without executing. Useful for verifying your file selection and priorities before spending tokens.',
        code: `# Review context without executing
cleo task -t refactor-module --dry-run

# Override the description from CLI args
cleo task -t refactor-module "Also add input validation" --dry-run`,
      },
    ],
  },
  {
    id: 'history-rollback',
    title: 'Rapid Agent Experimentation with History',
    description: 'Use cleo\'s SQLite-backed history and rollback to rapidly iterate on agent configurations. Try different tool sets, skills, and prompts — roll back to any previous working state in one command.',
    difficulty: 'beginner',
    duration: '10 min',
    packages: ['@bundt/cleo'],
    tags: ['history', 'rollback', 'experimentation'],
    color: '#f59e0b',
    steps: [
      {
        title: 'Enable history tracking',
        description: 'History is opt-in. Once enabled, every install, uninstall, init, create-skill, and rollback operation is recorded with a full config snapshot.',
        code: `# Enable locally (per-project)
cleo config set history.enabled true

# Or globally
cleo config set history.enabled true --global`,
      },
      {
        title: 'Create and iterate on agents',
        description: 'Each operation creates a snapshot. Scaffold an agent, tweak it, install bundled agents — every state is recorded.',
        code: `# Start with a base agent
cleo init code-reviewer -d "Reviews PRs for quality" -t "Read,Grep,Glob"

# Install a bundled agent to compare approaches
cleo install security-scanner

# Modify the reviewer — edit .claude/agents/code-reviewer.md
# Add more tools, change the model, reference new skills
# Every save is captured when you run cleo validate`,
      },
      {
        title: 'Browse history',
        description: 'View all operations, filter by target or action, inspect full snapshots.',
        code: `# View recent history
cleo history

# Filter by target
cleo history code-reviewer

# Filter by action type
cleo history --action install

# Inspect a specific event with full config snapshot
cleo history --id 7 --detail`,
      },
      {
        title: 'Rollback to a known-good state',
        description: 'If an experiment breaks your agent config, rollback restores the full markdown file (frontmatter + body) from a snapshot. Use --dry-run to preview first.',
        code: `# Preview what would be restored
cleo rollback code-reviewer --dry-run

# Rollback to the most recent previous snapshot
cleo rollback code-reviewer

# Rollback to a specific event
cleo rollback code-reviewer --to 3

# Works for skills too
cleo rollback code-review --dry-run`,
      },
    ],
  },
  {
    id: 'custom-registry',
    title: 'Run a Custom Agent Registry',
    description: 'Point cleo at any registry URL to share agents and skills across your team or organization. The registry is a simple JSON index — host it on GitHub, S3, or any HTTP endpoint.',
    difficulty: 'intermediate',
    duration: '15 min',
    packages: ['@bundt/cleo'],
    tags: ['registry', 'sharing', 'teams'],
    color: '#3b82f6',
    steps: [
      {
        title: 'Understand the registry format',
        description: 'A cleo registry is a JSON file conforming to the RegistryIndex schema: a version number and an array of entries. Each entry has a qualified name (namespace/name:tag@version), type, description, author, tags, and path.',
        code: `# registry.json
{
  "version": 1,
  "entries": [
    {
      "qualifiedName": {
        "namespace": "myteam",
        "name": "pr-reviewer",
        "tag": "latest",
        "version": "1.0.0"
      },
      "type": "agent",
      "description": "Team PR review agent with house style rules",
      "author": "myteam",
      "tags": ["review", "style", "ci"],
      "path": "agents/pr-reviewer/agent.md"
    }
  ]
}`,
      },
      {
        title: 'Configure your registry URL',
        description: 'Set the registry URL globally or per-project. Cleo fetches the JSON index and merges results with local search.',
        code: `# Point to your team's registry
cleo config set registry.url https://registry.myteam.dev/registry.json --global

# Or use a GitHub raw URL
cleo config set registry.url \\
  https://raw.githubusercontent.com/myteam/cleo-registry/main/registry.json \\
  --global

# For submission, configure the GitHub repo and token
cleo config set registry.repo myteam/cleo-registry --global
cleo config set registry.token <your-github-pat> --global`,
      },
      {
        title: 'Search across local and remote',
        description: 'cleo search queries local agents/skills first, then your configured registry. Use --deep for fuzzy full-body search.',
        code: `# Search by name or description
cleo search reviewer

# Deep search — fuzzy matches against full markdown body
cleo search "security audit" --deep

# Filter by type
cleo search testing --type skill`,
      },
      {
        title: 'Submit to your registry',
        description: 'Submit creates a PR on the configured registry repo with the agent/skill files and metadata. Uses qualified names: namespace/name@version.',
        code: `# Submit an agent (collects linked skills automatically)
cleo submit agent myteam/pr-reviewer@1.0.0

# Submit a standalone skill
cleo submit skill myteam/security-checklist@1.0.0

# The PR includes:
#   - Agent/skill markdown files
#   - Submission metadata table
#   - Auto-generated from your local config`,
      },
    ],
  },
  {
    id: 'docs-site',
    title: 'Generate a Docs Site from Markdown',
    description: 'Use dxdocs to turn a directory of markdown files into a zero-JavaScript static documentation site with syntax highlighting, navigation, and dark mode.',
    difficulty: 'beginner',
    duration: '5 min',
    packages: ['@bundt/dxdocs'],
    tags: ['documentation', 'static-site', 'markdown'],
    color: '#0ea5e9',
    steps: [
      {
        title: 'Install dxdocs',
        description: 'Add dxdocs as a dev dependency.',
        code: 'bun add -d @bundt/dxdocs',
      },
      {
        title: 'Organize your docs',
        description: 'dxdocs uses filesystem routing. Each .md file becomes a page. Directories become navigation sections.',
        code: `docs/
  index.md           # Landing page
  getting-started.md # /getting-started
  guides/
    auth.md          # /guides/auth
    deploy.md        # /guides/deploy
  api/
    client.md        # /api/client
    server.md        # /api/server`,
      },
      {
        title: 'Configure and build',
        description: 'Create a minimal config and build. Output is pure static HTML — zero client JavaScript.',
        code: `cat > dxdocs.config.json << 'EOF'
{
  "title": "My Project",
  "description": "Documentation for my project",
  "contentDir": "./docs",
  "outDir": "./docs-dist",
  "theme": { "accent": "#8b5cf6" }
}
EOF

bunx dxdocs build
bunx dxdocs preview`,
      },
    ],
  },
  {
    id: 'full-sdlc',
    title: 'End-to-End AI SDLC Pipeline',
    description: 'The complete AI-first workflow: write a spec, dispatch agents to implement + test + review + document in parallel via the cleo TUI, then deploy. You review and approve at each gate.',
    difficulty: 'advanced',
    duration: '45 min',
    packages: ['@bundt/cleo', '@bundt/dxdocs'],
    tags: ['sdlc', 'pipeline', 'full-stack'],
    color: '#10b981',
    steps: [
      {
        title: 'Write the spec',
        description: 'Specs are the source of truth. Write one as a markdown file — it becomes critical-priority BCP context for every agent in the pipeline.',
        code: `cat > .claude/specs/user-auth.md << 'EOF'
# User Authentication

## Requirements
- Email/password registration and login
- JWT token-based sessions with 24h expiry
- Password hashing with argon2
- Rate limiting: 5 attempts per minute per IP

## API
- POST /auth/register { email, password } -> { token }
- POST /auth/login { email, password } -> { token }
- GET /auth/me (authenticated) -> { user }

## Acceptance Criteria
- All endpoints return proper HTTP error codes
- Passwords never stored in plaintext
- 100% test coverage on auth logic
EOF`,
      },
      {
        title: 'Create task templates for each phase',
        description: 'Build a template per pipeline phase. Each references the spec as critical context and targets specific files.',
        code: `# Implementation template
cleo task "Implement user auth per the spec in .claude/specs/user-auth.md" \\
  --save impl-auth

# Testing template
cleo task "Write comprehensive tests for src/auth/ per the spec" \\
  --save test-auth

# Review template
cleo task "Review src/auth/ against the spec. Check security, error handling, edge cases." \\
  --save review-auth

# Documentation template
cleo task "Generate API docs for the auth module" \\
  --save docs-auth`,
      },
      {
        title: 'Run phase 1: implement',
        description: 'Start with implementation. Run it solo first, then review the output before dispatching parallel work.',
        code: `# Run implementation headless
cleo task -t impl-auth

# Or in the TUI for live monitoring
cleo tui
# Press Ctrl+T to load the impl-auth template`,
      },
      {
        title: 'Dispatch phases 2-4 in parallel',
        description: 'Once implementation is reviewed, dispatch testing, review, and docs as concurrent TUI sessions. Press D, select all three templates, enter.',
        code: `# In the TUI:
#   D           Open dispatch
#   j/Space     Select test-auth
#   j/Space     Select review-auth
#   j/Space     Select docs-auth
#   Enter       Launch all three

# Three sessions run concurrently, each with BCP-assembled
# context including the spec, source files, and test output.
# Follow up on any session with i to refine results.`,
      },
      {
        title: 'Build docs and deploy',
        description: 'The docs agent generates markdown. Feed it to dxdocs for a zero-JS static site, then deploy.',
        code: `# Build the documentation site
bunx dxdocs build

# Deploy to S3 + CloudFront (or any static host)
aws s3 sync docs-dist/ s3://my-docs-bucket/ --delete
aws cloudfront create-invalidation --distribution-id E123 --paths "/*"`,
      },
      {
        title: 'Iterate with rollback safety',
        description: 'If any agent produces bad output and you modified agents to fix it, roll back to the previous config if the fix didn\'t help.',
        code: `# Check what changed
cleo history review-agent --detail

# Didn't work — rollback
cleo rollback review-agent

# Try a different approach, re-dispatch
cleo tui`,
      },
    ],
  },
];
