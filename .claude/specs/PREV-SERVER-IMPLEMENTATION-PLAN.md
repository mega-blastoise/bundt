# Prev Playground — Implementation Plan

What We're Building

A single-port Bun server that showcases prev's agent-composed UI. Visitors
type natural language (or click preset examples), and a workspace
materializes in real-time — fragments laid out by prev's composition engine,
data fetched from registered sources, interactions wired via WebSocket. One
Docker container, one process, one port.

Architecture

┌─────────────────────────────────────────────────┐
│  Bun.serve()  :3000                             │
│                                                 │
│  GET /           → Playground HTML (prompt UI)   │
│  POST /api/compose  → Intent or Claude → frame  │
│  GET /frame/:id  → SSR'd workspace HTML          │
│  GET /prev/client.js  → Client runtime bundle    │
│  GET /prev/frame/:id/glue.js  → WS glue script  │
│  WS /ws          → Interactions + live updates   │
│  GET /api/registry  → Fragment/source catalog    │
│                                                 │
│  ┌────────────┐ ┌──────────────┐ ┌───────────┐  │
│  │ Fragment   │ │ DataSource   │ │Composition│  │
│  │ Registry   │ │ Registry     │ │ Engine    │  │
│  │ (10 frags) │ │ (7 sources)  │ │           │  │
│  └────────────┘ └──────────────┘ └───────────┘  │
│  ┌────────────┐ ┌──────────────┐ ┌───────────┐  │
│  │ Session    │ │ Subscription │ │ MCP       │  │
│  │ Manager    │ │ Manager      │ │ Handler   │  │
│  └────────────┘ └──────────────┘ └───────────┘  │
└─────────────────────────────────────────────────┘

Why a Custom Server (Not createPrevServer)

createPrevServer returns { listen, close } — it owns the Bun.serve() instance
  and all routes. No extension points for custom routes. The playground needs:
- A polished public-facing HTML page (not the dev playground)
- A /api/compose endpoint that bridges natural language → composition
- Rate limiting for public access

So we import prev's building blocks directly from source paths (monorepo
internal imports). This is the same code createPrevServer uses — we're just
wiring it ourselves.

Import Strategy

// All from prev's internal source paths (monorepo workspace resolution)
import { createFragmentRegistry } from
'../../packages/prev/src/registry/fragment-registry';
import { createDataSourceRegistry } from
'../../packages/prev/src/registry/data-source-registry';
import { createCompositionEngine } from
'../../packages/prev/src/composition/engine';
import { createDatabase } from '../../packages/prev/src/server/database';
import { createSessionManager } from
'../../packages/prev/src/server/session';
import { createWebSocketHandler } from
'../../packages/prev/src/server/websocket';
import { createSubscriptionManager } from
'../../packages/prev/src/server/subscription-manager';
import { createMcpHandler } from '../../packages/prev/src/server/mcp';
import { renderFrame } from '../../packages/prev/src/server/ssr';

In Docker, the full monorepo is in the build context so these paths resolve.

---
File Plan

websites/playground/
├── package.json
├── tsconfig.json
├── Dockerfile
├── .dockerignore
└── src/
    ├── server.ts            # Main entry — Bun.serve(), all routes,
WebSocket
    ├── fragments.tsx         # 10 fragment definitions (defineFragment)
    ├── data-sources.ts       # 7 data source definitions (defineDataSource)
    ├── compose.ts            # Composition logic: presets + Claude proxy
    ├── playground-html.ts    # HTML template string for the playground page
    └── presets.ts            # Pre-built StructuredComposition objects

---
Fragments (10)

All render with a dark theme (gray-900 bg, gray-100 text, violet accents).
Inline styles per prev convention.

┌─────────────┬─────────────────┬─────────────┬────────────┬────────────┐
│  Fragment   │   Description   │ Data Source │ Interactio │    Tags    │
│             │                 │             │     ns     │            │
├─────────────┼─────────────────┼─────────────┼────────────┼────────────┤
│ metric-card │ Big number +    │ analytics   │ —          │ analytics, │
│             │ label + trend % │             │            │  dashboard │
├─────────────┼─────────────────┼─────────────┼────────────┼────────────┤
│ data-table  │ Striped rows,   │ any         │ selectRow  │ table,     │
│             │ column headers  │ (generic)   │            │ data       │
├─────────────┼─────────────────┼─────────────┼────────────┼────────────┤
│ bar-chart   │ Horizontal CSS  │ analytics   │ selectBar  │ chart,     │
│             │ bars            │             │            │ analytics  │
├─────────────┼─────────────────┼─────────────┼────────────┼────────────┤
│             │ Items with      │             │            │ list,      │
│ status-list │ colored status  │ tickets     │ selectItem │ status     │
│             │ dots            │             │            │            │
├─────────────┼─────────────────┼─────────────┼────────────┼────────────┤
│             │ Avatar circle,  │             │            │ user,      │
│ user-card   │ name, role,     │ users       │ selectUser │ profile    │
│             │ email           │             │            │            │
├─────────────┼─────────────────┼─────────────┼────────────┼────────────┤
│ activity-fe │ Timeline with   │             │            │ feed,      │
│ ed          │ dots +          │ activity    │ —          │ timeline   │
│             │ timestamps      │             │            │            │
├─────────────┼─────────────────┼─────────────┼────────────┼────────────┤
│             │ Monospace code  │             │            │ code,      │
│ code-block  │ with language   │ (via props) │ —          │ display    │
│             │ label           │             │            │            │
├─────────────┼─────────────────┼─────────────┼────────────┼────────────┤
│ alert-banne │ Colored bar:    │ notificatio │            │ alert, not │
│ r           │ info/warning/er │ ns          │ dismiss    │ ification  │
│             │ ror             │             │            │            │
├─────────────┼─────────────────┼─────────────┼────────────┼────────────┤
│ kpi-grid    │ Grid of small   │ analytics   │ —          │ analytics, │
│             │ metric tiles    │             │            │  overview  │
├─────────────┼─────────────────┼─────────────┼────────────┼────────────┤
│ markdown-bl │ Renders         │             │            │ content,   │
│ ock         │ markdown        │ (via props) │ —          │ markdown   │
│             │ content as HTML │             │            │            │
└─────────────┴─────────────────┴─────────────┴────────────┴────────────┘

Data Sources (7)

Source: analytics
Description: Revenue, orders, conversion, sessions (4 metrics)
Subscription: No
Tags: analytics
────────────────────────────────────────
Source: analytics-timeseries
Description: 12 data points for bar/line charts
Subscription: No
Tags: analytics, chart
────────────────────────────────────────
Source: users
Description: 6 mock users with name, role, email, status
Subscription: No
Tags: users
────────────────────────────────────────
Source: tickets
Description: 8 support tickets with status, priority, assignee
Subscription: No
Tags: support, tickets
────────────────────────────────────────
Source: activity
Description: 10 activity feed events with timestamps
Subscription: No
Tags: activity, feed
────────────────────────────────────────
Source: server-stats
Description: CPU %, memory %, requests/sec, uptime
Subscription: Yes (2s interval)
Tags: monitoring, live
────────────────────────────────────────
Source: notifications
Description: 4 alerts of varying severity
Subscription: No
Tags: alerts, notifications

Presets (4)

Pre-built StructuredComposition objects that compose instantly (no Claude
call). These are the "example" buttons visitors click.

1. "Analytics Dashboard" — kpi-grid + bar-chart + data-table with analytics
data, dashboard layout
1. "Support Queue" — status-list (tickets) + user-card + activity-feed,
primary-detail layout, with binding: selectItem on tickets → user-card shows
assignee
1. "System Monitor" — metric-card (CPU) + metric-card (memory) + metric-card
(requests/sec) + activity-feed, dashboard layout, server-stats subscription
for live updates
1. "Code Review" — code-block + markdown-block + alert-banner,
split-horizontal layout, all prop-driven (no data source)

---
Composition Flow

Two paths:

Preset (instant, free):
Click preset → POST /api/compose { preset: "analytics-dashboard" }
            → Server looks up StructuredComposition from presets.ts
            → compositionEngine.compose(preset, sessionId)
            → Returns { frameId, sessionId }
            → Client sets iframe src to /frame/{frameId}

Intent (via prev's built-in intent resolver):
Type prompt → POST /api/compose { intent: "show me ticket status and user
info" }
            → compositionEngine.composeFromRequest({ type: 'intent', ... })
            → Intent resolver scores fragments by keyword match
            → Returns { frameId, sessionId }
            → Client sets iframe src to /frame/{frameId}

Claude (optional upgrade, if ANTHROPIC_API_KEY is set):
Type prompt → POST /api/compose { prompt: "...", useAI: true }
            → Server sends prompt + MCP tool defs to Claude Messages API
            → Claude returns tool_use for compose_frame
            → Server executes tool call via mcpHandler
            → Returns { frameId, sessionId }
            → Client sets iframe src to /frame/{frameId}

The intent resolver is the default. Claude is an optional enhancement. The
playground works fully without an API key — this is important for the public
demo.

---
Playground HTML Page

Single-page, no framework, served as a template string. Dark theme matching
bundt-dev.io.

Layout:
┌──────────────────────────────────────────────┐
│  bundt logo    Playground         bundt-dev.io│  ← 48px header
├──────────────────────────────────────────────┤
│                                              │
│  ┌──────────────────────────────────────┐    │
│  │  🔮  Describe the UI you want...    │    │  ← Prompt input
│  └──────────────────────────────────────┘    │
│                                              │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌───┐ │
│  │Analytics│ │ Support │ │ System  │ │...│ │  ← Preset cards
│  │Dashboard│ │ Queue   │ │ Monitor │ │   │ │
│  └─────────┘ └─────────┘ └─────────┘ └───┘ │
│                                              │
│  ┌──────────────────────────────────────┐    │
│  │                                      │    │
│  │        Workspace (iframe)            │    │  ← Appears after compose
│  │        /frame/{frameId}              │    │
│  │                                      │    │
│  └──────────────────────────────────────┘    │
│                                              │
│  Available: 10 fragments, 7 data sources     │  ← Footer info
└──────────────────────────────────────────────┘

Features:
- Prompt input with glowing violet border on focus
- 4 preset cards with name, description, fragment count, click to compose
- Loading state with animation while composing
- Workspace iframe appears after first composition, stays visible for
subsequent ones
- "View Source" link showing the fragment definitions
- Fragment catalog drawer (expandable) listing all 10 fragments with
descriptions
- Mobile-responsive (stacks vertically)

---
Docker

FROM oven/bun:1.3-alpine
WORKDIR /app
COPY package.json bun.lock ./
COPY packages/prev/ packages/prev/
COPY internal/ internal/
COPY websites/playground/ websites/playground/
RUN bun install --frozen-lockfile
WORKDIR /app/websites/playground
EXPOSE 3000
ENV NODE_ENV=production
CMD ["bun", "run", "src/server.ts"]

Copies only the packages the playground depends on (prev + internal/shared).
.dockerignore excludes node_modules, dist, .git, other packages.

Image size: ~150MB (bun:alpine base + deps).

---
What's NOT in V1

- No authentication / user accounts
- No persistent sessions (in-memory SQLite via :memory:)
- No Claude integration in V1 — intent resolver only (we add Claude in V2
once it's deployed and we've verified the base works)
- No asciinema recording (that's the Cleo Live Terminal showcase, separate)
- No editing fragments in-browser
- No mobile-optimized workspace (workspace renders at desktop width in
iframe)

---
Build Order

1. fragments.tsx + data-sources.ts — the fragment library is the core value
2. presets.ts — preset compositions that demonstrate the fragments
3. server.ts — wire up prev internals, route handling, WebSocket
4. playground-html.ts — the public-facing page
5. compose.ts — composition endpoint logic (intent resolver bridge)
6. Config files — package.json, tsconfig.json, Dockerfile, .dockerignore
7. Test locally — bun run src/server.ts, verify presets work, interactions
fire
8. Docker build + test — docker build, docker run, verify in browser

