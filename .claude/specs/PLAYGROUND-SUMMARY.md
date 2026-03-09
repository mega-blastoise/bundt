verything is clean. Here's the summary:

  ---
  What Was Done

  1. Playground — Phases 8 & 10 Complete

  - Phase 8 (Local testing): Server starts, all 5 routes verified:
    - GET / → 200 (playground HTML)
    - GET /api/presets → 200 (4 presets: Analytics, Support, System Monitor, Code Review)
    - GET /api/registry → 200 (10 fragments, 7 data sources)
    - POST /api/compose (preset) → 200 (streaming SSR)
    - POST /api/compose (intent) → 200 (keyword-matched composition)
  - Phase 10 (Docker): Fixed Dockerfile for monorepo subset (no lockfile, granular COPY, removed NODE_ENV=production to avoid
  jsxDEV/production React mismatch). Image builds, container serves all endpoints at 200.

  2. EC2 Deployment

  - Created .github/workflows/deploy-playground.yml — builds Docker image on push, pushes to GHCR, SSHs to EC2 to pull and restart
  - Created .claude/specs/EC2_PLAYGROUND_DEPLOY.md — step-by-step manual deploy guide with 3 SSL options (direct, CloudFront, ALB)

  3. New Cookbook Recipes (3 added → 8 total)

  - Agent-Composed Dashboard with prev — fragments, data sources, composition engine, streaming SSR
  - Deploy the prev Playground — clone → run → docker → EC2
  - Full-Stack AI App: Support Dashboard — interactive bindings, live WebSocket subscriptions, production patterns

  4. Landing Site Updates

  - Added Showcase section to homepage (links to playground + cookbook)
  - Added "Playground" link to nav bar (playground.bundt-dev.io)
  - Landing site builds clean (verified)

  ---
  What Remains

  ┌───────────────────────────────┬──────────────────────────────────────────────────────────────────────────────┐
  │             Task              │                               Action Required                                │
  ├───────────────────────────────┼──────────────────────────────────────────────────────────────────────────────┤
  │ ACM cert for bundt-dev.io     │ Manual: Request cert in AWS Console (us-east-1), DNS validate in Route53     │
  ├───────────────────────────────┼──────────────────────────────────────────────────────────────────────────────┤
  │ CloudFront for landing + docs │ Manual: Attach cert + CNAME to the 2 bundt distributions                     │
  ├───────────────────────────────┼──────────────────────────────────────────────────────────────────────────────┤
  │ Route53 A records             │ bundt-dev.io → landing CF dist, docs.bundt-dev.io → docs CF dist             │
  ├───────────────────────────────┼──────────────────────────────────────────────────────────────────────────────┤
  │ EC2 for playground            │ Launch t3.micro/t4g.small, install Docker, configure security group (80/443) │
  ├───────────────────────────────┼──────────────────────────────────────────────────────────────────────────────┤
  │ Playground DNS                │ playground.bundt-dev.io → EC2 IP or CloudFront origin                        │
  ├───────────────────────────────┼──────────────────────────────────────────────────────────────────────────────┤
  │ prev 0.2.0 publish            │ Build with production JSX, publish to npm (Phase 9)                          │
  ├───────────────────────────────┼──────────────────────────────────────────────────────────────────────────────┤
  │ S3 sync landing + docs        │ aws s3 sync the dist dirs once CloudFront is configured                      │
  ├───────────────────────────────┼──────────────────────────────────────────────────────────────────────────────┤
  │ GitHub secrets                │ Set PLAYGROUND_EC2_HOST, PLAYGROUND_EC2_USER, PLAYGROUND_EC2_KEY for CI/CD   │
  ├───────────────────────────────┼──────────────────────────────────────────────────────────────────────────────┤
  │ Git commits                   │ All changes uncommitted — you handle this                                    │
  └───────────────────────────────┴──────────────────────────────────────────────────────────────────────────────┘

✻ Cooked for 8m 6s


● prev Playground — Usage Guide

  What It Is

  A live demo where you describe a UI in natural language (or click a preset) and watch a server-rendered workspace materialize
  instantly. No API key needed — prev's built-in intent resolver handles composition.

  Starting It

  # From monorepo root
  bun run websites/playground/src/server.ts
  # Open http://localhost:3000

  Two Ways to Compose

  1. Presets (instant)
  Click any of the 4 preset cards:
  - Analytics Dashboard — KPI grid + revenue bar chart + tickets table
  - Support Queue — ticket list + user card + activity feed (click a ticket → user card updates)
  - System Monitor — 3 live metric cards (CPU, memory, req/sec) + activity feed with real-time WebSocket updates
  - Code Review — code block + markdown notes + alert banners

  2. Free-form Intent (type anything)
  Type a description in the prompt bar and hit Compose. Examples:
  show me revenue metrics and a trend chart
  display support tickets with team activity
  show server stats and notifications
  give me a code review workspace
  show me user profiles and recent activity

  The intent resolver scores your input against the 10 registered fragments by keyword match, selects the best fits, binds their data
  sources, picks a layout, and returns a streaming SSR frame.

  What You're Looking At

  After composing, an iframe loads the rendered workspace at /frame/{frameId}. The workspace contains:
  - Fragments — self-contained UI components (cards, charts, tables, feeds)
  - Live data — data sources feed fragments; some update in real-time via WebSocket (server-stats pushes every 2s)
  - Interactions — clickable rows/items emit events via data-prev-interaction attributes; bindings route those events to other
  fragments

  The Fragment Catalog

  Click the expandable "Fragment Catalog" at the bottom to see all 10 fragments and 7 data sources with descriptions and tags. Sources
  marked live support WebSocket subscriptions.

  API Endpoints

  ┌───────────────┬────────┬───────────────────────────────────────────────────────────────┐
  │   Endpoint    │ Method │                         What it does                          │
  ├───────────────┼────────┼───────────────────────────────────────────────────────────────┤
  │ /             │ GET    │ Playground HTML page                                          │
  ├───────────────┼────────┼───────────────────────────────────────────────────────────────┤
  │ /api/compose  │ POST   │ {"preset":"analytics-dashboard"} or {"intent":"show tickets"} │
  ├───────────────┼────────┼───────────────────────────────────────────────────────────────┤
  │ /api/presets  │ GET    │ List available presets                                        │
  ├───────────────┼────────┼───────────────────────────────────────────────────────────────┤
  │ /api/registry │ GET    │ Full fragment + data source catalog                           │
  ├───────────────┼────────┼───────────────────────────────────────────────────────────────┤
  │ /frame/:id    │ GET    │ SSR'd workspace HTML                                          │
  ├───────────────┼────────┼───────────────────────────────────────────────────────────────┤
  │ /ws           │ WS     │ Live interactions + data subscription updates                 │
  └───────────────┴────────┴───────────────────────────────────────────────────────────────┘

  Docker

  docker build -f websites/playground/Dockerfile -t prev-playground .
  docker run -d -p 80:3000 prev-playground

  