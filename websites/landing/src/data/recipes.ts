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
    id: 'history-rollback',
    title: 'Rapid Agent Experimentation with History',
    description:
      'Use cleo\'s SQLite-backed history and rollback to rapidly iterate on agent configurations. Every scaffolding and installation operation is snapshotted — try different tool sets, skills, and system prompts, then roll back to any previous working state in one command.',
    difficulty: 'beginner',
    duration: '15 min',
    packages: ['@bundt/cleo'],
    tags: ['history', 'rollback', 'experimentation', 'agents'],
    color: '#f59e0b',
    steps: [
      {
        title: 'Enable history tracking',
        description:
          'History is opt-in. When enabled, cleo records every install, uninstall, init, create-skill, validate, and rollback operation to a local SQLite database (.claude/cleo-history.db or ~/.claude/cleo-history.db for global). Each event stores the full config snapshot — the agent or skill markdown frontmatter and body — so you can restore any previous state exactly.',
        code: `# Enable per-project (stored in .claude/cleo.json)
cleo config set history.enabled true

# Or enable globally (stored in ~/.claude/cleo.json)
cleo config set history.enabled true --global

# Verify it's enabled
cleo config get history.enabled
# → true`,
      },
      {
        title: 'Scaffold an agent and iterate',
        description:
          'Create an agent with cleo init. This writes a markdown file to .claude/agents/<name>.md with YAML frontmatter (model, tools, description) and a markdown body (the system prompt). Every init and install creates a snapshot in the history database.',
        code: `# Scaffold a code review agent
# -d sets the description, -t sets the allowed tools (comma-separated)
cleo init code-reviewer \\
  -d "Reviews PRs for correctness, performance, and style" \\
  -t "Read,Grep,Glob"

# This creates .claude/agents/code-reviewer.md:
# ---
# description: Reviews PRs for correctness, performance, and style
# tools: [Read, Grep, Glob]
# ---
#
# # Code Reviewer Agent
#
# (body content here — this is the system prompt)

# Create a skill the agent can reference
cleo create-skill code-review -d "Structured code review checklist"

# Install a bundled agent for comparison
cleo install security-scanner

# Validate that all agents parse correctly
cleo validate`,
      },
      {
        title: 'Edit and re-validate',
        description:
          'Open the agent markdown file in your editor and change the tools, model, or system prompt. Then run cleo validate — if history is enabled, validate snapshots the current state. This gives you a save-point before each experiment.',
        code: `# Edit the agent — add more tools, change the system prompt
# (use any editor)
$EDITOR .claude/agents/code-reviewer.md

# Validate captures a snapshot of the current state
cleo validate

# Make another change — try a different model
$EDITOR .claude/agents/code-reviewer.md
cleo validate

# Each validate creates a new event in history`,
      },
      {
        title: 'Browse history',
        description:
          'View history events as a table. Filter by target name (the agent/skill name) or by action type. Use --id with --detail to inspect the full config snapshot stored for any event.',
        code: `# Show all recent events (default: last 25)
cleo history

# Output:
#  ID  Timestamp               Action         Type    Name
#  5   2026-03-09 14:30:01     init           agent   code-reviewer
#  4   2026-03-09 14:29:45     create-skill   skill   code-review
#  3   2026-03-09 14:25:12     install        agent   security-scanner
#  ...

# Filter by target name
cleo history code-reviewer

# Filter by action type
cleo history --action install

# Show more events
cleo history --limit 50

# Inspect a specific event with full snapshot
cleo history --id 5 --detail
# Shows: timestamp, action, type, name, full config snapshot JSON,
# and metadata (e.g. restoredFromEvent for rollbacks)`,
      },
      {
        title: 'Rollback to a known-good state',
        description:
          'If an experiment breaks your agent, rollback restores the full markdown file — frontmatter and body — from a history snapshot. By default, it rolls back to the second-most-recent snapshot for that target (the one before your last change). Use --to <id> to target a specific event. The rollback itself is recorded in history, so you can always undo the undo.',
        code: `# Preview what would be restored (no file changes)
cleo rollback code-reviewer --dry-run
# Output shows the target, event ID, timestamp, and full config snapshot

# Rollback to the previous snapshot
cleo rollback code-reviewer

# Rollback to a specific event by ID
cleo rollback code-reviewer --to 3

# Rollback works for skills too
cleo rollback code-review --dry-run

# The rollback itself creates a new history event:
cleo history code-reviewer
#  ID  Timestamp               Action         Type    Name
#  8   2026-03-09 15:01:00     rollback       agent   code-reviewer
#  7   2026-03-09 14:55:00     init           agent   code-reviewer
#  ...`,
      },
      {
        title: 'Practical workflow: A/B test agent configs',
        description:
          'Combine history with the TUI to rapidly test different agent configurations. Create an agent, run a task, check the results, then tweak and re-run. If version B is worse, rollback to version A in seconds.',
        code: `# Version A: conservative reviewer
cleo init reviewer -d "Strict code reviewer" -t "Read,Grep,Glob"
cleo task "Review src/auth/ for security issues"
# → Check the output quality

# Version B: broader reviewer with write access
$EDITOR .claude/agents/reviewer.md
# Add Bash and Edit tools, change system prompt
cleo validate

cleo task "Review src/auth/ for security issues"
# → Compare output quality

# Version B was worse — rollback to version A
cleo rollback reviewer
# Restored! Version A's exact config is back.`,
      },
    ],
  },
  {
    id: 'custom-registry',
    title: 'Run a Custom Agent Registry',
    description:
      'Share agents and skills across your team with a custom registry. A cleo registry is a JSON index file hosted anywhere — GitHub raw, S3, a static site. Configure the URL, search across local and remote agents, and submit new ones via PR.',
    difficulty: 'intermediate',
    duration: '20 min',
    packages: ['@bundt/cleo'],
    tags: ['registry', 'sharing', 'teams', 'agents'],
    color: '#3b82f6',
    steps: [
      {
        title: 'Understand the registry format',
        description:
          'A cleo registry is a JSON file with two keys: version (always 1) and entries (an array of registry entries). Each entry has a qualifiedName object (namespace, name, tag, version), a type (agent or skill), a description (10-200 chars), an author, tags (1-10), and a path pointing to the actual markdown file relative to the registry root. The schema is validated with Zod — malformed entries are rejected at parse time.',
        code: `// registry.json — hosted at any HTTPS URL
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
      "description": "Team PR review agent with house style enforcement",
      "author": "myteam",
      "tags": ["review", "style", "ci"],
      "path": "agents/pr-reviewer/agent.md",
      "skills": ["code-standards"]
    },
    {
      "qualifiedName": {
        "namespace": "myteam",
        "name": "code-standards",
        "tag": "latest",
        "version": "1.0.0"
      },
      "type": "skill",
      "description": "Shared coding standards checklist for all reviewers",
      "author": "myteam",
      "tags": ["standards", "style"],
      "path": "skills/code-standards/SKILL.md"
    }
  ]
}`,
      },
      {
        title: 'Host the registry',
        description:
          'The registry can be hosted anywhere that serves JSON over HTTPS. The simplest approach is a GitHub repo with a registry.json at the root — the raw URL becomes your registry URL. For teams that want approval workflows, the repo also serves as the submission target for cleo submit.',
        code: `# Option 1: GitHub repo (recommended for teams)
# Create a repo: myteam/cleo-registry
# Add registry.json at the root
# Agents/skills go in directories referenced by "path"
#
# myteam/cleo-registry/
#   registry.json
#   agents/
#     pr-reviewer/
#       agent.md
#   skills/
#     code-standards/
#       SKILL.md

# Option 2: Any static hosting (S3, Cloudflare R2, etc.)
# Upload registry.json and the referenced files
# Ensure CORS allows the domain where cleo runs

# Option 3: Internal API
# Return the same JSON structure from any endpoint`,
      },
      {
        title: 'Configure your registry URL',
        description:
          'Set the registry URL in cleo config. This can be per-project (.claude/cleo.json) or global (~/.claude/cleo.json). For submission support, also configure the GitHub repo name and a personal access token with repo scope.',
        code: `# Point to your team's registry (global = applies to all projects)
cleo config set registry.url \\
  https://raw.githubusercontent.com/myteam/cleo-registry/main/registry.json \\
  --global

# For submission via cleo submit, configure the GitHub target
cleo config set registry.repo myteam/cleo-registry --global
cleo config set registry.token ghp_xxxxxxxxxxxx --global

# Verify the configuration
cleo config get registry.url --global
# → https://raw.githubusercontent.com/myteam/cleo-registry/main/registry.json`,
      },
      {
        title: 'Search across local and remote',
        description:
          'cleo search queries four sources in order: bundled agents (shipped with cleo), global agents (~/.claude/agents/), local agents (.claude/agents/), and your configured registry. Results show the source for each match. Use --deep for fuzzy matching against the full markdown body, and --type to filter by agent or skill.',
        code: `# Search by keyword — matches against name, description, and tags
cleo search reviewer

# Output:
#  Name                       Type    Source     Description
#  myteam/pr-reviewer:latest  agent   registry   Team PR review agent with house...
#  code-reviewer              agent   local      Reviews PRs for correctness...
#  security-scanner           agent   bundled    Scans code for security vulns...

# Deep search — fuzzy matches against full markdown body
cleo search "security audit" --deep
# Also shows match context (the line in the body that matched)

# Filter by type
cleo search testing --type skill`,
      },
      {
        title: 'Install from the registry',
        description:
          'When you cleo install a name that isn\'t bundled, cleo checks your configured registry. It downloads the agent markdown and any linked skills, writing them to .claude/agents/ and .claude/skills/ respectively.',
        code: `# Install a registry agent (fetches agent.md + linked skills)
cleo install myteam/pr-reviewer

# Verify it landed
cleo list
cleo info pr-reviewer

# The agent is now a local file you can edit:
cat .claude/agents/pr-reviewer.md`,
      },
      {
        title: 'Submit your agents to the registry',
        description:
          'cleo submit reads your local agent or skill, collects any linked skill files, and opens a PR on the configured registry repo via the GitHub API. The PR includes the markdown files and a submission metadata table. Your team reviews and merges. The qualified name format is namespace/name@version.',
        code: `# Submit an agent (auto-collects linked skills)
cleo submit agent myteam/pr-reviewer@1.0.0

# Submit a standalone skill
cleo submit skill myteam/code-standards@1.0.0

# The PR created on myteam/cleo-registry includes:
#   - The agent/skill markdown file(s)
#   - Updated registry.json entry
#   - Submission metadata table in the PR body
#
# After team review and merge, the agent is available
# to anyone with the registry URL configured.`,
      },
    ],
  },
  {
    id: 'prev-agent-dashboard',
    title: 'Agent-Composed Dashboard with prev',
    description:
      'Build a dashboard that assembles itself from natural language or structured composition objects. Define fragments (metric cards, charts, tables), register data sources, wire them through prev\'s composition engine — and get streaming server-rendered HTML with live WebSocket updates. No client JavaScript needed for initial display.',
    difficulty: 'intermediate',
    duration: '25 min',
    packages: ['@bundt/prev'],
    tags: ['prev', 'ssr', 'fragments', 'dashboard', 'websocket'],
    color: '#a78bfa',
    steps: [
      {
        title: 'Understand the architecture',
        description:
          'prev has four core concepts: Fragments are typed React components with declared data dependencies and interactions. Data Sources provide data to fragments via an async fetch function (with optional live subscriptions). The Composition Engine takes a request (natural language intent or structured composition) and produces a Frame — a snapshot of what fragments, data, and layout to render. The Server renders frames to streaming HTML and manages WebSocket connections for live updates.',
        code: `// The import surface:
// @bundt/prev        — defineFragment, defineDataSource, createPrevServer
// @bundt/prev/server — registries, engine, database, session, ssr, mcp

import { defineFragment, defineDataSource, createPrevServer } from '@bundt/prev';

// Or for fine-grained control:
import {
  createFragmentRegistry,
  createDataSourceRegistry,
  createCompositionEngine,
  createSessionManager,
  createDatabase,
  createWebSocketHandler,
  createSubscriptionManager,
  renderFrame,
} from '@bundt/prev/server';`,
      },
      {
        title: 'Define a fragment',
        description:
          'Fragments declare their shape via Zod schemas. props defines what the composition engine can pass in. data declares named data dependencies — each maps to a data source ID. interactions declares events the fragment can emit (used for cross-fragment bindings). layoutHints tells the layout solver about sizing preferences. The render function receives the resolved props, fetched data, and an emit callback.',
        code: `import { z } from 'zod';
import { defineFragment } from '@bundt/prev';

export const metricCard = defineFragment({
  id: 'metric-card',
  name: 'Metric Card',
  description: 'Large stat with label, value, and trend indicator',
  tags: ['analytics', 'dashboard', 'kpi'],

  // Props schema — the composition engine validates these
  props: z.object({
    label: z.string().optional(),
    valueKey: z.string().optional(),
  }),

  // Data dependencies — keys are arbitrary, values reference data source IDs
  data: {
    metrics: { source: 'analytics' },
  },

  // Interactions this fragment can emit (for cross-fragment bindings)
  interactions: {},

  // Hints for the layout solver
  layoutHints: { minWidth: '200px', resizable: true },

  // Render function — receives resolved props, fetched data, and emit
  // This runs on the server (renderToReadableStream) — no hooks, no state
  render: ({ props, data }) => {
    const metrics = data.metrics as Array<{
      label: string; value: string; change: number;
    }>;
    const item = metrics[0];
    return (
      <div style={{
        background: '#111827', borderRadius: '12px',
        padding: '20px', color: '#f3f4f6',
      }}>
        <div style={{ fontSize: '0.7rem', fontWeight: 600, color: '#6b7280' }}>
          {props.label ?? item?.label}
        </div>
        <div style={{ fontSize: '2rem', fontWeight: 700 }}>
          {item?.value ?? '—'}
        </div>
      </div>
    );
  },
});`,
      },
      {
        title: 'Define data sources',
        description:
          'Data sources declare their parameter schema, return schema, a TTL for caching, and an async fetch function. For live data, add a subscribe function that receives an emit callback — the subscription manager will wire this to WebSocket automatically. The TTL controls how often the fetch is re-executed for non-subscribed consumers.',
        code: `import { z } from 'zod';
import { defineDataSource } from '@bundt/prev';

// Static data source — fetched once, cached for 30s
export const analyticsSource = defineDataSource({
  id: 'analytics',
  name: 'Analytics Metrics',
  tags: ['analytics'],
  params: z.object({}),  // no parameters needed
  returns: z.array(z.object({
    label: z.string(),
    value: z.string(),
    change: z.number(),
  })),
  ttl: 30000,  // re-fetch after 30s
  fetch: async () => [
    { label: 'Revenue', value: '$48,290', change: 12.3 },
    { label: 'Orders', value: '1,284', change: 8.1 },
    { label: 'Conversion', value: '3.2%', change: -0.4 },
  ],
});

// Live data source — pushes updates via WebSocket
export const serverStats = defineDataSource({
  id: 'server-stats',
  name: 'Server Stats',
  tags: ['monitoring', 'live'],
  params: z.object({}),
  returns: z.array(z.object({
    label: z.string(),
    value: z.string(),
    change: z.number(),
  })),
  ttl: 5000,
  fetch: async () => generateStats(),  // initial fetch
  // subscribe is called once per active subscription
  // emit pushes new data to all connected WebSocket clients
  // return a cleanup function to stop the subscription
  subscribe: (_params, emit) => {
    const interval = setInterval(() => emit(generateStats()), 2000);
    return () => clearInterval(interval);
  },
});`,
      },
      {
        title: 'Compose from intent or structure',
        description:
          'The composition engine accepts two request types. Intent-based composition takes natural language — the built-in intent resolver tokenizes it and scores fragments/sources by keyword matching (no AI API key needed). Structured composition gives you explicit control over which fragments, props, data bindings, and layout to use. Both produce a CompositionResult containing a Frame, resolved data, and resolved bindings.',
        code: `import {
  createFragmentRegistry,
  createDataSourceRegistry,
  createCompositionEngine,
} from '@bundt/prev/server';

// Register all fragments and data sources
const fragments = createFragmentRegistry([metricCard, barChart, dataTable]);
const dataSources = createDataSourceRegistry([analyticsSource, serverStats]);
const engine = createCompositionEngine(fragments, dataSources);

const sessionId = crypto.randomUUID();

// Option 1: Intent-based (natural language → auto-selected fragments)
const result = await engine.composeFromRequest(
  {
    type: 'intent',
    composition: {
      description: 'show me revenue metrics and a trend chart',
      constraints: {
        layout: 'dashboard',           // optional layout hint
        interactivity: 'medium',        // low | medium | high
        preferredFragments: ['metric-card'],  // boost specific fragments
      },
    },
  },
  sessionId
);

// Option 2: Structured (explicit fragment + data binding control)
const result2 = await engine.compose(
  {
    layout: 'dashboard',
    fragments: [
      {
        fragmentId: 'metric-card',
        props: { label: 'Revenue' },
        data: { metrics: { source: 'analytics', params: {} } },
      },
      {
        fragmentId: 'bar-chart',
        props: { title: 'Monthly Revenue' },
        data: { series: { source: 'analytics', params: {} } },
      },
    ],
  },
  sessionId
);

// result.frame   — the Frame object (fragment instances, layout, bindings)
// result.resolvedData — Map<instanceId, Record<dataKey, fetchedData>>
// result.resolvedBindings — resolved cross-fragment bindings`,
      },
      {
        title: 'Render and serve',
        description:
          'renderFrame takes a Frame, the fragment registry, and resolved data — and returns a ReadableStream of HTML. Serve it as a streaming response. For live updates, create a WebSocket handler that manages interaction events and data subscription pushes. Or use createPrevServer for a batteries-included server that handles all routes.',
        code: `import { renderFrame, createWebSocketHandler } from '@bundt/prev/server';

// --- Option A: Manual server (fine-grained control) ---

// Render the frame to a streaming HTML response
const stream = await renderFrame(
  result.frame,
  fragments,       // the FragmentRegistry
  result.resolvedData
);

const response = new Response(stream, {
  headers: {
    'content-type': 'text/html; charset=utf-8',
    'x-prev-frame-id': result.frame.id,
  },
});

// WebSocket handler for live interactions + data subscriptions
const wsHandler = createWebSocketHandler(
  engine, sessionManager, database, fragments, dataSources
);

// --- Option B: createPrevServer (batteries-included) ---

import { createPrevServer } from '@bundt/prev';

const server = createPrevServer({
  port: 3000,
  fragments: [metricCard, barChart, dataTable],
  dataSources: [analyticsSource, serverStats],
  dbPath: ':memory:',  // or a file path for persistence
  devMode: true,       // enables /dev playground route
});

server.listen();

// Routes provided automatically:
//   GET  /                    → workspace shell HTML
//   GET  /dev                 → dev playground
//   POST /prev/compose        → compose from intent or structure
//   GET  /prev/frame/:id      → restore a saved frame
//   WS   /prev/ws             → interactions + live data
//   GET  /prev/api/registry   → fragment/source catalog
//   POST /mcp/tools           → MCP tool execution`,
      },
    ],
  },
  {
    id: 'support-dashboard',
    title: 'Full-Stack AI App: Support Dashboard',
    description:
      'Build a production support dashboard with prev: interactive fragment bindings (click a ticket to reveal the assignee), live server stats via WebSocket subscriptions, and streaming SSR. One Bun.serve() process, one port, zero client framework code.',
    difficulty: 'advanced',
    duration: '35 min',
    packages: ['@bundt/prev'],
    tags: ['prev', 'full-stack', 'websocket', 'ssr', 'interactions'],
    color: '#ec4899',
    steps: [
      {
        title: 'Define interactive fragments',
        description:
          'The support dashboard uses fragments that emit interactions. The status-list fragment renders tickets with colored status indicators. Its interactions declaration defines selectItem with a Zod payload schema. In the JSX, data-prev-interaction and data-prev-payload attributes mark clickable elements — prev\'s client runtime picks these up and sends them over WebSocket.',
        code: `import { z } from 'zod';
import { defineFragment } from '@bundt/prev';

export const statusList = defineFragment({
  id: 'status-list',
  name: 'Status List',
  description: 'Ticket list with colored status indicators',
  tags: ['list', 'status', 'support'],

  props: z.object({
    title: z.string().optional(),
  }),

  data: {
    items: { source: 'tickets' },
  },

  // Declare interactions with typed payloads
  interactions: {
    selectItem: {
      payload: z.object({ id: z.string() }),
    },
  },

  render: ({ props, data }) => {
    const items = data.items as Array<{
      id: string; title: string;
      status: 'open' | 'in-progress' | 'resolved';
      priority: string;
    }>;
    const colors: Record<string, string> = {
      open: '#f59e0b',
      'in-progress': '#3b82f6',
      resolved: '#10b981',
    };

    return (
      <div style={{ padding: '16px' }}>
        <h3 style={{ margin: '0 0 12px', color: '#e5e7eb' }}>
          {props.title ?? 'Tickets'}
        </h3>
        {items.map((item) => (
          <div
            key={item.id}
            // These data attributes wire the click to the interaction system
            data-prev-interaction="selectItem"
            data-prev-payload={JSON.stringify({ id: item.id })}
            style={{
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '8px 12px',
              borderRadius: '8px',
              marginBottom: '4px',
            }}
          >
            <div style={{
              width: 8, height: 8, borderRadius: '50%',
              background: colors[item.status] ?? '#6b7280',
            }} />
            <span style={{ color: '#d1d5db' }}>{item.title}</span>
            <span style={{
              marginLeft: 'auto', fontSize: '0.7rem',
              color: '#6b7280', textTransform: 'uppercase',
            }}>
              {item.status}
            </span>
          </div>
        ))}
      </div>
    );
  },
});

// Also define: user-card (shows assignee details),
// activity-feed (recent actions), alert-banner (system notifications)`,
      },
      {
        title: 'Wire cross-fragment bindings',
        description:
          'Bindings are declarative connections between fragments. When status-list emits selectItem, the binding routes the payload to user-card\'s userId prop. The binding uses __resolve_N__ placeholders that map to fragment array indices — the composition engine resolves these to actual instance IDs at compose time. targetType can be "prop" (sets a prop) or "dataParam" (changes a data source parameter).',
        code: `import type { StructuredComposition } from '@bundt/prev';

const supportDashboard: StructuredComposition = {
  layout: 'primary-detail',
  intent: 'Support queue with ticket list and assignee details',

  fragments: [
    {
      // Index 0 — referenced as __resolve_0__
      fragmentId: 'status-list',
      props: { title: 'Open Tickets' },
      data: { items: { source: 'tickets', params: {} } },
    },
    {
      // Index 1 — referenced as __resolve_1__
      fragmentId: 'user-card',
      props: {},
      data: { users: { source: 'users', params: {} } },
    },
    {
      // Index 2
      fragmentId: 'activity-feed',
      props: { title: 'Recent Activity' },
      data: { events: { source: 'activity', params: {} } },
    },
  ],

  // Bindings connect interactions across fragments
  bindings: [
    {
      id: 'ticket-to-user',
      // Source: when status-list (index 0) emits "selectItem"
      sourceFragmentInstanceId: '__resolve_0__',
      sourceInteraction: 'selectItem',
      // Target: set user-card's (index 1) "userId" prop
      targetFragmentInstanceId: '__resolve_1__',
      targetType: 'prop',    // 'prop' or 'dataParam'
      targetKey: 'userId',
      transform: 'id',       // extract the "id" field from the payload
    },
  ],
};

// Compose it
const result = await engine.compose(supportDashboard, sessionId);`,
      },
      {
        title: 'Add live data subscriptions',
        description:
          'Data sources with a subscribe function push live updates. The subscription manager (created internally by createPrevServer, or manually with createSubscriptionManager) sets up subscriptions for each fragment instance bound to a live source. When emit is called, the data is broadcast to all connected WebSocket clients as a subscription-update message. The client runtime swaps in the updated HTML without a full page reload.',
        code: `import { defineDataSource } from '@bundt/prev';

// Live server stats — emits every 2 seconds
export const serverStats = defineDataSource({
  id: 'server-stats',
  name: 'Server Stats',
  tags: ['monitoring', 'live'],
  params: z.object({}),
  returns: z.array(z.object({
    label: z.string(),
    value: z.string(),
    change: z.number(),
  })),
  ttl: 5000,
  fetch: async () => generateStats(),
  subscribe: (_params, emit) => {
    const interval = setInterval(() => emit(generateStats()), 2000);
    return () => clearInterval(interval);
  },
});

// The subscription lifecycle:
// 1. Frame is composed with a fragment bound to 'server-stats'
// 2. subscriptionManager.setupFrameSubscriptions() is called
// 3. subscribe() is invoked, returns cleanup fn
// 4. Every 2s, emit() fires → data is broadcast via WebSocket:
//    { type: 'subscription-update',
//      fragmentInstanceId: '...',
//      dataKey: 'stats',
//      data: [...] }
// 5. Client runtime receives the message, re-renders the fragment
// 6. When the frame is destroyed, cleanup fn is called`,
      },
      {
        title: 'Serve with createPrevServer',
        description:
          'createPrevServer is the simplest way to run a prev app. Pass your fragments and data sources — it wires up the composition engine, session manager, WebSocket handler, subscription manager, and MCP handler automatically. One Bun.serve() process handles HTTP (SSR frames, compose API) and WebSocket (interactions, live data) on a single port.',
        code: `import { createPrevServer, defineFragment, defineDataSource } from '@bundt/prev';

const server = createPrevServer({
  port: 3000,
  hostname: 'localhost',
  dbPath: ':memory:',  // SQLite for session/frame persistence
  devMode: true,       // exposes /dev playground

  fragments: [statusList, userCard, activityFeed, alertBanner, metricCard],
  dataSources: [ticketsSource, usersSource, activitySource, serverStats],
});

server.listen();

// What you get:
//
// HTTP Routes:
//   GET  /                    Workspace shell (HTML)
//   GET  /dev                 Dev playground with compose UI
//   POST /prev/compose        Accept: { type, composition } → frame
//   GET  /prev/frame/:id      Restore a previously composed frame
//   GET  /prev/frame/:id/glue.js   Client runtime for that frame
//   GET  /prev/client.js      Shared client runtime bundle
//   GET  /prev/api/registry   JSON catalog of fragments + sources
//   GET  /prev/api/session    Session state
//   POST /mcp/tools           MCP tool execution endpoint
//
// WebSocket:
//   WS   /prev/ws?sessionId=  Interaction events + subscription updates
//
// Client messages:
//   { type: 'interaction', frameId, fragmentInstanceId, interaction, payload }
//   { type: 'chat', sessionId, message }
//   { type: 'ping' }
//
// Server messages:
//   { type: 'fragment-update', fragmentInstanceId, html, data }
//   { type: 'subscription-update', fragmentInstanceId, dataKey, data }
//   { type: 'error', message }
//   { type: 'pong' }`,
      },
      {
        title: 'Test the interaction flow end-to-end',
        description:
          'With the server running, open the browser and compose the support dashboard. Click a ticket in the status list — the interaction fires via WebSocket, the binding resolves to set the user-card\'s userId prop, the server re-renders just that fragment, and the updated HTML is pushed back to the client. The entire round-trip happens without a page navigation.',
        code: `# Start the server
bun run server.ts

# In another terminal, compose the dashboard:
curl -X POST http://localhost:3000/prev/compose \\
  -H 'Content-Type: application/json' \\
  -d '{
    "type": "structured",
    "composition": {
      "layout": "primary-detail",
      "fragments": [
        { "fragmentId": "status-list", "props": { "title": "Tickets" }, "data": { "items": { "source": "tickets", "params": {} } } },
        { "fragmentId": "user-card", "props": {}, "data": { "users": { "source": "users", "params": {} } } }
      ],
      "bindings": [{
        "id": "ticket-user",
        "sourceFragmentInstanceId": "__resolve_0__",
        "sourceInteraction": "selectItem",
        "targetFragmentInstanceId": "__resolve_1__",
        "targetType": "prop",
        "targetKey": "userId",
        "transform": "id"
      }]
    }
  }'

# Response: { "frameId": "abc-123", ... }

# Open the frame in a browser:
open http://localhost:3000/prev/frame/abc-123

# Click a ticket → user card updates in real-time`,
      },
    ],
  },
  {
    id: 'full-sdlc',
    title: 'End-to-End AI SDLC Pipeline',
    description:
      'The complete AI-first software development lifecycle: write a spec, build task templates for each phase, dispatch implementation as a solo agent session, then parallelize testing + review + docs via the cleo TUI. You review and approve at each gate. History gives you rollback safety at every step.',
    difficulty: 'advanced',
    duration: '45 min',
    packages: ['@bundt/cleo', '@bundt/dxdocs'],
    tags: ['sdlc', 'pipeline', 'multi-agent', 'tasks'],
    color: '#10b981',
    steps: [
      {
        title: 'Write the spec',
        description:
          'The spec is the source of truth for every agent in the pipeline. Write it as a markdown file and place it in .claude/specs/ where cleo\'s task gather flow auto-detects it. When building task templates, reference the spec as a critical-priority document so it always survives BCP budget cuts.',
        code: `mkdir -p .claude/specs

cat > .claude/specs/user-auth.md << 'EOF'
# User Authentication Module

## Requirements
- Email/password registration with input validation
- Login with JWT token-based sessions (24h expiry, RS256)
- Password hashing with argon2id (memory=64MB, iterations=3)
- Rate limiting: 5 login attempts per minute per IP
- Account lockout after 10 consecutive failures

## API Contract
\`\`\`
POST /auth/register
  Body: { email: string, password: string }
  200: { token: string, expiresAt: number }
  400: { error: "invalid_email" | "weak_password" }
  409: { error: "email_exists" }

POST /auth/login
  Body: { email: string, password: string }
  200: { token: string, expiresAt: number }
  401: { error: "invalid_credentials" }
  429: { error: "rate_limited", retryAfter: number }

GET /auth/me
  Headers: Authorization: Bearer <token>
  200: { id: string, email: string, createdAt: string }
  401: { error: "unauthorized" }
\`\`\`

## Acceptance Criteria
- All endpoints return proper HTTP status codes
- Passwords never stored or logged in plaintext
- Token validation rejects expired/malformed tokens
- Rate limiter uses sliding window (not fixed window)
- 100% test coverage on auth logic (not HTTP layer)
EOF`,
      },
      {
        title: 'Build task templates for each phase',
        description:
          'Create one task template per pipeline phase. The interactive cleo task flow walks you through adding files (with glob patterns and priority levels), commands to capture output from, and external documents. Save each as a reusable template. The --save flag writes a JSON file to .claude/tasks/.',
        code: `# Phase 1: Implementation
# The interactive flow will ask for files, commands, docs, budget, model
cleo task "Implement user authentication per .claude/specs/user-auth.md. \\
Use Bun.serve() for the HTTP layer, argon2id for passwords, \\
jose for JWT. Write to src/auth/." --save impl-auth

# During the interactive gather, you'd add:
#   Files: src/auth/**/*.ts (critical), src/types.ts (normal)
#   Commands: bun test --filter auth (to capture existing test state)
#   Documents: .claude/specs/user-auth.md (critical)

# Phase 2: Testing
cleo task "Write comprehensive tests for src/auth/ covering all \\
acceptance criteria in .claude/specs/user-auth.md. Use bun:test. \\
Cover happy paths, error cases, rate limiting, and token expiry." \\
  --save test-auth

# Phase 3: Security Review
cleo task "Review src/auth/ against .claude/specs/user-auth.md. \\
Check: argon2 params, JWT validation, rate limiter implementation, \\
input sanitization, timing attack resistance, error message leakage." \\
  --save review-auth

# Phase 4: Documentation
cleo task "Generate API documentation for the auth module. \\
Include endpoint specs, error codes, authentication flow, \\
and usage examples. Output as markdown to docs/auth/." \\
  --save docs-auth

# List all saved templates
cleo task --list
# Output:
#   impl-auth     Implement user authentication per...
#   test-auth     Write comprehensive tests for src/auth/...
#   review-auth   Review src/auth/ against...
#   docs-auth     Generate API documentation for...`,
      },
      {
        title: 'Dry-run to verify context assembly',
        description:
          'Before spending tokens, use --dry-run to see exactly what context will be assembled for each template. This shows the resolved file list, command output previews, and document inclusions with their priority levels.',
        code: `# Preview impl-auth context without executing
cleo task -t impl-auth --dry-run

# Output shows:
#   Description: Implement user authentication per...
#   Model: claude-sonnet-4-6
#   Files (3):
#     [critical] src/auth/register.ts (doesn't exist yet — skipped)
#     [critical] src/auth/login.ts (doesn't exist yet — skipped)
#     [normal]   src/types.ts (142 tokens)
#   Commands (1):
#     [high] bun test --filter auth → (0 tests found)
#   Documents (1):
#     [critical] .claude/specs/user-auth.md (580 tokens)
#   Total context: ~722 tokens

# You can also override the prompt from CLI args:
cleo task -t impl-auth "Also add password strength validation" --dry-run`,
      },
      {
        title: 'Run Phase 1: Implementation',
        description:
          'Run the implementation template. You can run it headless (cleo task -t) for non-interactive execution, or load it into the TUI for live monitoring. The implementation phase should run solo — you want to review its output before dispatching parallel work.',
        code: `# Option A: Headless execution with budget cap
cleo task -t impl-auth --max-budget 2.00

# Option B: In the TUI with live monitoring
cleo tui
# In the TUI:
#   n           Open new session modal
#   Ctrl+T      Open template picker
#   j/k         Navigate to impl-auth
#   Enter       Load template (fills prompt and model)
#   Enter       Launch the session

# The TUI shows live output as Claude implements the module.
# When done, the session enters "waiting" state.
# Review the output, then press i to send a follow-up if needed:
#   "Move the rate limiter to middleware instead of inline"
#   "Use a sliding window algorithm, not fixed window"`,
      },
      {
        title: 'Dispatch Phases 2-4 in parallel',
        description:
          'Once you\'ve reviewed the implementation, dispatch testing, review, and docs as concurrent TUI sessions. Press D to open the dispatch modal, select templates with space, and press enter. Each launches as a separate Claude Code process with BCP-assembled context.',
        code: `# In the TUI:
#   D           Open dispatch modal
#   j/Space     Select test-auth
#   j/Space     Select review-auth
#   j/Space     Select docs-auth
#   Enter       Launch all three concurrently

# Three new sessions appear in the sidebar:
#   [test-auth] Write comprehensive...    ● running
#   [review-auth] Review src/auth/...     ● running
#   [docs-auth] Generate API docs...      ● running

# Navigate between sessions:
#   j/k         Move between sessions in sidebar
#   1-9         Jump to session by number
#   Tab         Switch focus between sidebar and output pane
#   g/G         Jump to top/bottom of output

# Each session has BCP-assembled context including:
#   - The spec (critical priority)
#   - The src/auth/ files written by Phase 1 (high priority)
#   - Test output from bun test (high priority)

# Follow up on any session:
#   (select session) → i → type message → Enter
# This resumes the claude session with --resume`,
      },
      {
        title: 'Build docs and verify',
        description:
          'The docs agent outputs markdown files to docs/auth/. Feed them to dxdocs to generate a zero-JavaScript static documentation site. Verify the output, then deploy.',
        code: `# Build the documentation site from generated markdown
bunx dxdocs build

# Preview locally
bunx dxdocs preview
# → http://localhost:4173

# Deploy (example: S3 + CloudFront)
aws s3 sync docs-dist/ s3://my-docs-bucket/ --delete
aws cloudfront create-invalidation --distribution-id E123 --paths "/*"`,
      },
      {
        title: 'Iterate safely with rollback',
        description:
          'If you modified an agent\'s configuration during the pipeline and it produced worse output, use history and rollback to restore the previous working config. The rollback itself is recorded, so you never lose a state.',
        code: `# What changed recently?
cleo history

# The review agent wasn't strict enough — you edited it
# but the new version missed the timing attack check.
# View the snapshot before your edit:
cleo history review-auth --detail

# Rollback to the previous config
cleo rollback review-auth --dry-run  # preview first
cleo rollback review-auth            # restore

# Re-run the review with the original config
cleo task -t review-auth

# Full pipeline summary:
#   Phase 1 (solo):     impl-auth      → src/auth/ written
#   Phase 2 (parallel): test-auth      → tests written
#   Phase 3 (parallel): review-auth    → security findings
#   Phase 4 (parallel): docs-auth      → docs/ written
#   Build:              dxdocs build   → static site
#   Safety net:         cleo rollback  → any config restored`,
      },
    ],
  },
];
