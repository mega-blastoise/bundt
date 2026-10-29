import { defineFragment } from '@bundt/prev';
import { z } from 'zod';

import { ActivityFeed } from './components/ActivityFeed';
import { AlertBanner } from './components/AlertBanner';
import { BarChart } from './components/BarChart';
import { CodeBlock } from './components/CodeBlock';
import { CommandPalette } from './components/CommandPalette';
import { DataTable } from './components/DataTable';
import { EnvironmentStatus } from './components/EnvironmentStatus';
import { KpiGrid } from './components/KpiGrid';
import { LogViewer } from './components/LogViewer';
import { MarkdownBlock } from './components/MarkdownBlock';
import { MetricCard } from './components/MetricCard';
import { PieChart } from './components/PieChart';
import { ProgressTracker } from './components/ProgressTracker';
import { SparklineCard } from './components/SparklineCard';
import { StatusList } from './components/StatusList';
import { TagCloud } from './components/TagCloud';
import { TeamGrid } from './components/TeamGrid';
import { TimelineCard } from './components/TimelineCard';
import { UserCard } from './components/UserCard';

// ── 1. Metric Card ──

export const metricCard = defineFragment({
  id: 'metric-card',
  name: 'Metric Card',
  description: 'Large stat value with label and trend percentage',
  tags: ['analytics', 'dashboard'],
  props: z.object({ label: z.string().optional(), valueKey: z.string().optional() }),
  data: { metrics: { source: 'analytics' } },
  interactions: {},
  layoutHints: { minWidth: '200px', resizable: true },
  render: ({ props, data }) => {
    const metrics = (data.metrics ?? []) as Array<{ label: string; value: string; change: number }>;
    return <MetricCard label={props.label} valueKey={props.valueKey} metrics={metrics} />;
  },
});

// ── 2. Data Table ──

export const dataTable = defineFragment({
  id: 'data-table',
  name: 'Data Table',
  description: 'Sortable data table with column headers and striped rows',
  tags: ['table', 'data'],
  props: z.object({ title: z.string().optional(), columns: z.array(z.string()).optional() }),
  data: { rows: { source: 'tickets' } },
  interactions: { selectRow: { payload: z.object({ id: z.string() }) } },
  layoutHints: { minWidth: '400px', resizable: true },
  render: ({ props, data }) => {
    const rows = (data.rows ?? []) as Array<Record<string, unknown>>;
    return <DataTable title={props.title} columns={props.columns} rows={rows} />;
  },
});

// ── 3. Bar Chart ──

export const barChart = defineFragment({
  id: 'bar-chart',
  name: 'Bar Chart',
  description: 'Horizontal bar chart with labels and values',
  tags: ['chart', 'analytics'],
  props: z.object({ title: z.string().optional() }),
  data: { series: { source: 'analytics-timeseries' } },
  interactions: { selectBar: { payload: z.object({ label: z.string(), value: z.number() }) } },
  layoutHints: { minWidth: '300px', resizable: true },
  render: ({ props, data }) => {
    const series = (data.series ?? []) as Array<{ label: string; value: number }>;
    return <BarChart title={props.title} series={series} />;
  },
});

// ── 4. Status List ──

export const statusList = defineFragment({
  id: 'status-list',
  name: 'Status List',
  description: 'Items with colored status indicators and priority badges',
  tags: ['list', 'status', 'support'],
  props: z.object({ title: z.string().optional() }),
  data: { items: { source: 'tickets' } },
  interactions: { selectItem: { payload: z.object({ id: z.string() }) } },
  layoutHints: { minWidth: '280px', resizable: true },
  render: ({ props, data }) => {
    const items = (data.items ?? []) as Array<{ id: string; title: string; status: string; priority: string }>;
    return <StatusList title={props.title} items={items} />;
  },
});

// ── 5. User Card ──

export const userCard = defineFragment({
  id: 'user-card',
  name: 'User Card',
  description: 'User profile with avatar, name, role, email, and online status',
  tags: ['user', 'profile'],
  props: z.object({ userId: z.string().optional() }),
  data: { users: { source: 'users' } },
  interactions: { selectUser: { payload: z.object({ userId: z.string() }) } },
  layoutHints: { minWidth: '260px' },
  render: ({ props, data }) => {
    const users = (data.users ?? []) as Array<{ id: string; name: string; role: string; email: string; status: string }>;
    return <UserCard userId={props.userId} users={users} />;
  },
});

// ── 6. Activity Feed ──

export const activityFeed = defineFragment({
  id: 'activity-feed',
  name: 'Activity Feed',
  description: 'Chronological timeline of events with timestamps',
  tags: ['feed', 'timeline', 'activity'],
  props: z.object({ title: z.string().optional() }),
  data: { events: { source: 'activity' } },
  interactions: {},
  layoutHints: { minWidth: '280px', resizable: true },
  render: ({ props, data }) => {
    const events = (data.events ?? []) as Array<{ id: string; action: string; actor: string; target: string; time: string }>;
    return <ActivityFeed title={props.title} events={events} />;
  },
});

// ── 7. Code Block ──

export const codeBlock = defineFragment({
  id: 'code-block',
  name: 'Code Block',
  description: 'Monospace code display with line numbers and language label',
  tags: ['code', 'display'],
  props: z.object({ code: z.string().default('// no code provided'), language: z.string().optional(), title: z.string().optional() }),
  data: {},
  interactions: {},
  layoutHints: { minWidth: '300px' },
  render: ({ props }) => <CodeBlock code={props.code} language={props.language} title={props.title} />,
});

// ── 8. Alert Banner ──

export const alertBanner = defineFragment({
  id: 'alert-banner',
  name: 'Alert Banner',
  description: 'Colored alerts with severity icons and dismissal',
  tags: ['alert', 'notification'],
  props: z.object({ title: z.string().optional() }),
  data: { alerts: { source: 'notifications' } },
  interactions: { dismiss: { payload: z.object({ id: z.string() }) } },
  render: ({ props, data }) => {
    const alerts = (data.alerts ?? []) as Array<{ id: string; severity: string; title: string; message: string }>;
    return <AlertBanner title={props.title} alerts={alerts} />;
  },
});

// ── 9. KPI Grid ──

export const kpiGrid = defineFragment({
  id: 'kpi-grid',
  name: 'KPI Grid',
  description: 'Grid of metric tiles for overview dashboards',
  tags: ['analytics', 'overview', 'dashboard'],
  props: z.object({ title: z.string().optional() }),
  data: { metrics: { source: 'analytics' } },
  interactions: {},
  layoutHints: { minWidth: '400px', resizable: true },
  render: ({ props, data }) => {
    const metrics = (data.metrics ?? []) as Array<{ label: string; value: string; change: number }>;
    return <KpiGrid title={props.title} metrics={metrics} />;
  },
});

// ── 10. Markdown Block ──

export const markdownBlock = defineFragment({
  id: 'markdown-block',
  name: 'Markdown Block',
  description: 'Renders markdown-like content with headings, lists, and blockquotes',
  tags: ['content', 'markdown', 'display'],
  props: z.object({ content: z.string().default('No content provided.'), title: z.string().optional() }),
  data: {},
  interactions: {},
  layoutHints: { minWidth: '300px' },
  render: ({ props }) => <MarkdownBlock content={props.content} title={props.title} />,
});

// ── 11. Progress Tracker ──

export const progressTracker = defineFragment({
  id: 'progress-tracker',
  name: 'Progress Tracker',
  description: 'Multi-step progress bar with status indicators',
  tags: ['progress', 'workflow', 'status'],
  props: z.object({ title: z.string().optional() }),
  data: { steps: { source: 'deployment-steps' } },
  interactions: {},
  layoutHints: { minWidth: '280px', resizable: true },
  render: ({ props, data }) => {
    const steps = (data.steps ?? []) as Array<{ id: string; label: string; status: 'complete' | 'active' | 'pending'; description?: string }>;
    return <ProgressTracker title={props.title} steps={steps} />;
  },
});

// ── 12. Tag Cloud ──

export const tagCloud = defineFragment({
  id: 'tag-cloud',
  name: 'Tag Cloud',
  description: 'Weighted tag cloud with counts and colors',
  tags: ['tags', 'navigation', 'filter'],
  props: z.object({ title: z.string().optional() }),
  data: { tags: { source: 'tags' } },
  interactions: { selectTag: { payload: z.object({ label: z.string() }) } },
  layoutHints: { minWidth: '240px' },
  render: ({ props, data }) => {
    const tags = (data.tags ?? []) as Array<{ label: string; count: number; color?: string }>;
    return <TagCloud title={props.title} tags={tags} />;
  },
});

// ── 13. Command Palette ──

export const commandPalette = defineFragment({
  id: 'command-palette',
  name: 'Command Palette',
  description: 'Categorized command list with keyboard shortcuts',
  tags: ['commands', 'actions', 'tools'],
  props: z.object({ title: z.string().optional() }),
  data: { commands: { source: 'commands' } },
  interactions: { runCommand: { payload: z.object({ id: z.string() }) } },
  layoutHints: { minWidth: '300px' },
  render: ({ props, data }) => {
    const commands = (data.commands ?? []) as Array<{ id: string; name: string; description: string; shortcut?: string; category: string }>;
    return <CommandPalette title={props.title} commands={commands} />;
  },
});

// ── 14. Sparkline Card ──

export const sparklineCard = defineFragment({
  id: 'sparkline-card',
  name: 'Sparkline Card',
  description: 'Metric card with inline sparkline chart',
  tags: ['analytics', 'chart', 'dashboard'],
  props: z.object({ title: z.string().default('Metric'), valueKey: z.string().optional() }),
  data: { metrics: { source: 'analytics-sparkline' } },
  interactions: {},
  layoutHints: { minWidth: '280px' },
  render: ({ props, data }) => {
    const metrics = (data.metrics ?? {}) as { value: string; change: number; sparkline: number[] };
    return <SparklineCard title={props.title} value={metrics.value ?? '—'} change={metrics.change ?? 0} sparkline={metrics.sparkline ?? []} />;
  },
});

// ── 15. Pie Chart ──

export const pieChart = defineFragment({
  id: 'pie-chart',
  name: 'Pie Chart',
  description: 'Donut chart with legend showing distribution',
  tags: ['chart', 'analytics', 'distribution'],
  props: z.object({ title: z.string().optional() }),
  data: { slices: { source: 'distribution' } },
  interactions: {},
  layoutHints: { minWidth: '300px' },
  render: ({ props, data }) => {
    const slices = (data.slices ?? []) as Array<{ label: string; value: number; color: string }>;
    return <PieChart title={props.title} slices={slices} />;
  },
});

// ── 16. Team Grid ──

export const teamGrid = defineFragment({
  id: 'team-grid',
  name: 'Team Grid',
  description: 'Avatar grid of team members with online status',
  tags: ['team', 'users', 'grid'],
  props: z.object({ title: z.string().optional() }),
  data: { members: { source: 'users' } },
  interactions: { selectUser: { payload: z.object({ userId: z.string() }) } },
  layoutHints: { minWidth: '320px', resizable: true },
  render: ({ props, data }) => {
    const members = (data.members ?? []) as Array<{ id: string; name: string; role: string; status: string }>;
    return <TeamGrid title={props.title} members={members} />;
  },
});

// ── 17. Timeline Card ──

export const timelineCard = defineFragment({
  id: 'timeline-card',
  name: 'Timeline Card',
  description: 'Vertical timeline of dated events with type badges',
  tags: ['timeline', 'history', 'release'],
  props: z.object({ title: z.string().optional() }),
  data: { events: { source: 'timeline' } },
  interactions: {},
  layoutHints: { minWidth: '300px', resizable: true },
  render: ({ props, data }) => {
    const events = (data.events ?? []) as Array<{ id: string; date: string; title: string; description: string; type: string }>;
    return <TimelineCard title={props.title} events={events} />;
  },
});

// ── 18. Environment Status ──

export const environmentStatus = defineFragment({
  id: 'environment-status',
  name: 'Environment Status',
  description: 'Service health overview with version and region info',
  tags: ['monitoring', 'devops', 'status'],
  props: z.object({ title: z.string().optional() }),
  data: { environments: { source: 'environments' } },
  interactions: {},
  layoutHints: { minWidth: '340px', resizable: true },
  render: ({ props, data }) => {
    const environments = (data.environments ?? []) as Array<{ id: string; name: string; status: 'healthy' | 'degraded' | 'down'; version: string; lastDeploy: string; region: string }>;
    return <EnvironmentStatus title={props.title} environments={environments} />;
  },
});

// ── 19. Log Viewer ──

export const logViewer = defineFragment({
  id: 'log-viewer',
  name: 'Log Viewer',
  description: 'Scrollable log output with level-colored entries',
  tags: ['logs', 'monitoring', 'debugging'],
  props: z.object({ title: z.string().optional() }),
  data: { entries: { source: 'logs' } },
  interactions: {},
  layoutHints: { minWidth: '400px', resizable: true },
  render: ({ props, data }) => {
    const entries = (data.entries ?? []) as Array<{ id: string; timestamp: string; level: string; message: string; source?: string }>;
    return <LogViewer title={props.title} entries={entries} />;
  },
});

export const allFragments = [
  metricCard, dataTable, barChart, statusList, userCard,
  activityFeed, codeBlock, alertBanner, kpiGrid, markdownBlock,
  progressTracker, tagCloud, commandPalette, sparklineCard, pieChart,
  teamGrid, timelineCard, environmentStatus, logViewer,
];
