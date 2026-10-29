import { z } from 'zod';
import { defineDataSource } from '@bundt/prev';
import { colors } from './fragments/styles';

// ── 1. Analytics ──

export const analyticsSource = defineDataSource({
  id: 'analytics',
  name: 'Analytics Metrics',
  description: 'Key business metrics: revenue, orders, customers, conversion',
  tags: ['analytics', 'dashboard'],
  params: z.object({}),
  returns: z.array(z.object({ label: z.string(), value: z.string(), change: z.number() })),
  ttl: 30000,
  fetch: async () => [
    { label: 'Revenue', value: '$48,290', change: 12.3 },
    { label: 'Orders', value: '1,284', change: 8.1 },
    { label: 'Customers', value: '3,029', change: -2.4 },
    { label: 'Conversion', value: '3.2%', change: 0.8 },
  ],
});

// ── 2. Analytics Timeseries ──

export const analyticsTimeseriesSource = defineDataSource({
  id: 'analytics-timeseries',
  name: 'Analytics Timeseries',
  description: 'Monthly revenue data points for charts',
  tags: ['analytics', 'chart'],
  params: z.object({}),
  returns: z.array(z.object({ label: z.string(), value: z.number() })),
  ttl: 60000,
  fetch: async () => [
    { label: 'Jan', value: 32400 }, { label: 'Feb', value: 28700 },
    { label: 'Mar', value: 35200 }, { label: 'Apr', value: 41800 },
    { label: 'May', value: 38100 }, { label: 'Jun', value: 44500 },
    { label: 'Jul', value: 39200 }, { label: 'Aug', value: 47800 },
    { label: 'Sep', value: 43100 }, { label: 'Oct', value: 51200 },
    { label: 'Nov', value: 48900 }, { label: 'Dec', value: 55300 },
  ],
});

// ── 3. Users ──

export const usersSource = defineDataSource({
  id: 'users',
  name: 'Users',
  description: 'Team member profiles with roles and status',
  tags: ['users', 'team'],
  params: z.object({ role: z.string().optional() }),
  returns: z.array(z.object({ id: z.string(), name: z.string(), role: z.string(), email: z.string(), status: z.string() })),
  ttl: 60000,
  fetch: async (params) => {
    const users = [
      { id: 'u1', name: 'Sarah Chen', role: 'Engineering Lead', email: 'sarah@example.com', status: 'active' },
      { id: 'u2', name: 'Marcus Rodriguez', role: 'Senior Engineer', email: 'marcus@example.com', status: 'active' },
      { id: 'u3', name: 'Aisha Patel', role: 'Product Manager', email: 'aisha@example.com', status: 'active' },
      { id: 'u4', name: 'James Kim', role: 'DevOps Engineer', email: 'james@example.com', status: 'away' },
      { id: 'u5', name: 'Elena Volkov', role: 'Designer', email: 'elena@example.com', status: 'active' },
      { id: 'u6', name: 'David Okonkwo', role: 'Backend Engineer', email: 'david@example.com', status: 'offline' },
    ];
    if (params.role) return users.filter((u) => u.role.toLowerCase().includes(params.role!.toLowerCase()));
    return users;
  },
});

// ── 4. Tickets ──

export const ticketsSource = defineDataSource({
  id: 'tickets',
  name: 'Support Tickets',
  description: 'Support tickets with status, priority, and assignee',
  tags: ['support', 'tickets'],
  params: z.object({ status: z.string().optional() }),
  returns: z.array(z.object({ id: z.string(), title: z.string(), status: z.string(), priority: z.string(), assignee: z.string() })),
  ttl: 15000,
  fetch: async (params) => {
    const tickets = [
      { id: 't1', title: 'Login page returns 500 on mobile', status: 'open', priority: 'critical', assignee: 'u1' },
      { id: 't2', title: 'Dashboard charts not loading for EU users', status: 'in-progress', priority: 'high', assignee: 'u2' },
      { id: 't3', title: 'Export CSV missing header row', status: 'open', priority: 'medium', assignee: 'u2' },
      { id: 't4', title: 'Dark mode toggle persists incorrectly', status: 'in-progress', priority: 'low', assignee: 'u5' },
      { id: 't5', title: 'API rate limiting not enforced on /search', status: 'open', priority: 'high', assignee: 'u6' },
      { id: 't6', title: 'Webhook delivery retries exceeding SLA', status: 'resolved', priority: 'critical', assignee: 'u4' },
      { id: 't7', title: 'User avatar upload fails for PNG > 2MB', status: 'resolved', priority: 'medium', assignee: 'u2' },
      { id: 't8', title: 'Notification emails landing in spam', status: 'open', priority: 'high', assignee: 'u3' },
    ];
    if (params.status) return tickets.filter((t) => t.status === params.status);
    return tickets;
  },
});

// ── 5. Activity ──

export const activitySource = defineDataSource({
  id: 'activity',
  name: 'Activity Feed',
  description: 'Recent activity events with actors and timestamps',
  tags: ['activity', 'feed'],
  params: z.object({}),
  returns: z.array(z.object({ id: z.string(), action: z.string(), actor: z.string(), target: z.string(), time: z.string() })),
  ttl: 10000,
  fetch: async () => [
    { id: 'a1', action: 'resolved', actor: 'Sarah Chen', target: 'Webhook delivery retries', time: '2 min ago' },
    { id: 'a2', action: 'commented on', actor: 'Marcus Rodriguez', target: 'Dashboard charts issue', time: '5 min ago' },
    { id: 'a3', action: 'deployed', actor: 'James Kim', target: 'v2.4.1 to production', time: '12 min ago' },
    { id: 'a4', action: 'merged PR', actor: 'David Okonkwo', target: '#847 — Add rate limiting', time: '28 min ago' },
    { id: 'a5', action: 'opened ticket', actor: 'Aisha Patel', target: 'Notification emails in spam', time: '45 min ago' },
    { id: 'a6', action: 'assigned', actor: 'Elena Volkov', target: 'Dark mode toggle fix', time: '1 hr ago' },
    { id: 'a7', action: 'pushed to', actor: 'Marcus Rodriguez', target: 'feature/csv-export', time: '1.5 hr ago' },
    { id: 'a8', action: 'reviewed', actor: 'Sarah Chen', target: 'PR #851 — Auth refactor', time: '2 hr ago' },
  ],
});

// ── 6. Server Stats (live) ──

export const serverStatsSource = defineDataSource({
  id: 'server-stats',
  name: 'Server Stats',
  description: 'Live server metrics: CPU, memory, requests/sec, uptime',
  tags: ['monitoring', 'live', 'dashboard'],
  params: z.object({}),
  returns: z.array(z.object({ label: z.string(), value: z.string(), change: z.number() })),
  ttl: 5000,
  fetch: async () => generateServerStats(),
  subscribe: (_params, emit) => {
    const interval = setInterval(() => emit(generateServerStats()), 2000);
    return () => clearInterval(interval);
  },
});

function generateServerStats() {
  return [
    { label: 'CPU', value: `${(35 + Math.random() * 30).toFixed(1)}%`, change: Math.round((Math.random() - 0.5) * 10) },
    { label: 'Memory', value: `${(62 + Math.random() * 15).toFixed(1)}%`, change: Math.round((Math.random() - 0.3) * 6) },
    { label: 'Req/sec', value: `${Math.round(1200 + Math.random() * 400)}`, change: Math.round((Math.random() - 0.4) * 20) },
    { label: 'Uptime', value: '14d 7h', change: 0 },
  ];
}

// ── 7. Notifications ──

export const notificationsSource = defineDataSource({
  id: 'notifications',
  name: 'Notifications',
  description: 'System alerts and notifications of varying severity',
  tags: ['alerts', 'notifications'],
  params: z.object({}),
  returns: z.array(z.object({ id: z.string(), severity: z.string(), title: z.string(), message: z.string() })),
  ttl: 30000,
  fetch: async () => [
    { id: 'n1', severity: 'error', title: 'Database connection pool exhausted', message: 'Max connections reached on primary replica. Consider scaling or optimizing queries.' },
    { id: 'n2', severity: 'warning', title: 'SSL certificate expiring', message: 'Certificate for api.example.com expires in 14 days. Renew before March 21.' },
    { id: 'n3', severity: 'info', title: 'Deployment scheduled', message: 'v2.5.0 deployment scheduled for tonight at 02:00 UTC.' },
    { id: 'n4', severity: 'success', title: 'Backup completed', message: 'Daily database backup completed successfully. 2.4 GB compressed.' },
  ],
});

// ── 8. Deployment Steps ──

export const deploymentStepsSource = defineDataSource({
  id: 'deployment-steps',
  name: 'Deployment Steps',
  description: 'CI/CD pipeline stages with completion status',
  tags: ['devops', 'pipeline', 'progress'],
  params: z.object({}),
  returns: z.array(z.object({ id: z.string(), label: z.string(), status: z.string(), description: z.string().optional() })),
  ttl: 15000,
  fetch: async () => [
    { id: 's1', label: 'Build', status: 'complete', description: 'TypeScript compiled, 0 errors' },
    { id: 's2', label: 'Lint', status: 'complete', description: 'ESLint passed, 0 warnings' },
    { id: 's3', label: 'Test', status: 'complete', description: '89/89 tests passing' },
    { id: 's4', label: 'Docker Build', status: 'active', description: 'Building prev-playground:latest' },
    { id: 's5', label: 'Push to Registry', status: 'pending' },
    { id: 's6', label: 'Deploy to EC2', status: 'pending' },
    { id: 's7', label: 'Health Check', status: 'pending' },
  ],
});

// ── 9. Tags ──

export const tagsSource = defineDataSource({
  id: 'tags',
  name: 'Tags',
  description: 'Weighted tag data for cloud visualization',
  tags: ['tags', 'metadata'],
  params: z.object({}),
  returns: z.array(z.object({ label: z.string(), count: z.number(), color: z.string().optional() })),
  ttl: 60000,
  fetch: async () => [
    { label: 'react', count: 42, color: '#61dafb' },
    { label: 'typescript', count: 38, color: '#3178c6' },
    { label: 'bun', count: 35, color: '#fbf0df' },
    { label: 'ssr', count: 28, color: colors.violet },
    { label: 'websocket', count: 24, color: colors.green },
    { label: 'fragments', count: 22, color: colors.pink },
    { label: 'streaming', count: 18, color: colors.blue },
    { label: 'zod', count: 15, color: '#3068b7' },
    { label: 'docker', count: 12, color: '#2496ed' },
    { label: 'mcp', count: 10, color: colors.amber },
  ],
});

// ── 10. Commands ──

export const commandsSource = defineDataSource({
  id: 'commands',
  name: 'Commands',
  description: 'Available commands with descriptions and shortcuts',
  tags: ['commands', 'actions'],
  params: z.object({}),
  returns: z.array(z.object({ id: z.string(), name: z.string(), description: z.string(), shortcut: z.string().optional(), category: z.string() })),
  ttl: 60000,
  fetch: async () => [
    { id: 'c1', name: 'Compose Frame', description: 'Create a new workspace from fragments', shortcut: 'Ctrl+K', category: 'Workspace' },
    { id: 'c2', name: 'Add Fragment', description: 'Add a fragment to the current frame', shortcut: 'Ctrl+Shift+A', category: 'Workspace' },
    { id: 'c3', name: 'Remove Fragment', description: 'Remove a fragment from the frame', category: 'Workspace' },
    { id: 'c4', name: 'Toggle Theme', description: 'Switch between dark and light mode', shortcut: 'Ctrl+T', category: 'View' },
    { id: 'c5', name: 'View Registry', description: 'Browse available fragments and data sources', shortcut: 'Ctrl+R', category: 'View' },
    { id: 'c6', name: 'Export Frame', description: 'Export current frame as JSON', category: 'Data' },
    { id: 'c7', name: 'Query Data', description: 'Run a data source query', category: 'Data' },
    { id: 'c8', name: 'Frame History', description: 'Navigate workspace history', shortcut: 'Ctrl+Z', category: 'Navigation' },
  ],
});

// ── 11. Analytics Sparkline ──

export const analyticsSparklineSource = defineDataSource({
  id: 'analytics-sparkline',
  name: 'Analytics Sparkline',
  description: 'Metric with inline sparkline data',
  tags: ['analytics', 'chart', 'sparkline'],
  params: z.object({}),
  returns: z.object({ value: z.string(), change: z.number(), sparkline: z.array(z.number()) }),
  ttl: 15000,
  fetch: async () => ({
    value: '$48.3k',
    change: 12.3,
    sparkline: [32, 28, 35, 41, 38, 44, 39, 47, 43, 51, 48, 55],
  }),
});

// ── 12. Distribution ──

export const distributionSource = defineDataSource({
  id: 'distribution',
  name: 'Distribution',
  description: 'Category distribution for pie/donut charts',
  tags: ['analytics', 'chart', 'distribution'],
  params: z.object({}),
  returns: z.array(z.object({ label: z.string(), value: z.number(), color: z.string() })),
  ttl: 60000,
  fetch: async () => [
    { label: 'Direct', value: 4200, color: colors.violet },
    { label: 'Organic', value: 3100, color: colors.green },
    { label: 'Referral', value: 1800, color: colors.blue },
    { label: 'Social', value: 1200, color: colors.pink },
    { label: 'Email', value: 900, color: colors.amber },
  ],
});

// ── 13. Timeline ──

export const timelineSource = defineDataSource({
  id: 'timeline',
  name: 'Timeline',
  description: 'Project timeline events with dates and types',
  tags: ['timeline', 'history', 'release'],
  params: z.object({}),
  returns: z.array(z.object({ id: z.string(), date: z.string(), title: z.string(), description: z.string(), type: z.string() })),
  ttl: 60000,
  fetch: async () => [
    { id: 'tl1', date: '2026-03-09', title: 'Playground v1.0', description: '19 fragments, 15 data sources, Claude chat integration', type: 'release' },
    { id: 'tl2', date: '2026-03-07', title: 'prev 0.1.1', description: 'Server exports, MCP handler, subscription manager', type: 'release' },
    { id: 'tl3', date: '2026-03-05', title: 'Composition engine', description: 'Intent resolver, layout solver, data binder', type: 'feature' },
    { id: 'tl4', date: '2026-03-03', title: 'Fragment system', description: 'defineFragment API, registry, SSR rendering', type: 'feature' },
    { id: 'tl5', date: '2026-02-28', title: 'Production deploy', description: 'Docker + EC2 + CloudFront pipeline', type: 'deploy' },
    { id: 'tl6', date: '2026-02-25', title: 'WebSocket binding fix', description: 'Resolved __resolve_N__ placeholder resolution', type: 'bugfix' },
  ],
});

// ── 14. Environments ──

export const environmentsSource = defineDataSource({
  id: 'environments',
  name: 'Environments',
  description: 'Service environment status with health, version, and region',
  tags: ['monitoring', 'devops', 'environments'],
  params: z.object({}),
  returns: z.array(z.object({ id: z.string(), name: z.string(), status: z.string(), version: z.string(), lastDeploy: z.string(), region: z.string() })),
  ttl: 30000,
  fetch: async () => [
    { id: 'e1', name: 'Production', status: 'healthy', version: '2.4.1', lastDeploy: '2 hours ago', region: 'us-east-1' },
    { id: 'e2', name: 'Staging', status: 'healthy', version: '2.5.0-rc.1', lastDeploy: '45 min ago', region: 'us-east-1' },
    { id: 'e3', name: 'Preview', status: 'degraded', version: '2.5.0-alpha.3', lastDeploy: '1 day ago', region: 'eu-west-1' },
    { id: 'e4', name: 'Development', status: 'healthy', version: '2.5.0-dev', lastDeploy: '5 min ago', region: 'us-west-2' },
  ],
});

// ── 15. Logs (live) ──

export const logsSource = defineDataSource({
  id: 'logs',
  name: 'Logs',
  description: 'Application log entries with timestamps and levels',
  tags: ['logs', 'monitoring', 'debugging'],
  params: z.object({}),
  returns: z.array(z.object({ id: z.string(), timestamp: z.string(), level: z.string(), message: z.string(), source: z.string().optional() })),
  ttl: 5000,
  fetch: async () => generateLogs(),
  subscribe: (_params, emit) => {
    const interval = setInterval(() => emit(generateLogs()), 3000);
    return () => clearInterval(interval);
  },
});

let logCounter = 0;
function generateLogs() {
  const sources = ['api', 'worker', 'scheduler', 'auth', 'db'];
  const messages = [
    ['info', 'Request processed in 42ms'],
    ['info', 'Cache hit for user session'],
    ['warn', 'Rate limit approaching for 10.0.1.42'],
    ['error', 'Connection timeout to replica-3'],
    ['debug', 'Query plan: sequential scan on users'],
    ['info', 'WebSocket connection established'],
    ['warn', 'Deprecated API version in use by client v1.2'],
    ['info', 'Background job completed: email-digest'],
    ['error', 'Failed to parse webhook payload from Stripe'],
    ['info', 'Health check passed, all services healthy'],
  ];
  const now = new Date();
  return messages.map(([level, msg], i) => {
    const ts = new Date(now.getTime() - i * 1200);
    return {
      id: `log-${++logCounter}`,
      timestamp: ts.toISOString().slice(11, 23),
      level: level!,
      message: msg!,
      source: sources[i % sources.length],
    };
  });
}

export const allDataSources = [
  analyticsSource, analyticsTimeseriesSource, usersSource,
  ticketsSource, activitySource, serverStatsSource, notificationsSource,
  deploymentStepsSource, tagsSource, commandsSource,
  analyticsSparklineSource, distributionSource, timelineSource,
  environmentsSource, logsSource,
];
