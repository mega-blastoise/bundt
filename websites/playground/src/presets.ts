import type { StructuredComposition } from '@bundt/prev';

export interface Preset {
  id: string;
  name: string;
  description: string;
  fragmentCount: number;
  composition: StructuredComposition;
}

// ── 1. Analytics Dashboard ──

const analyticsDashboard: Preset = {
  id: 'analytics-dashboard',
  name: 'Analytics Dashboard',
  description: 'KPI overview with revenue trends and detailed metrics table',
  fragmentCount: 3,
  composition: {
    layout: 'dashboard',
    intent: 'Analytics dashboard with KPIs, revenue chart, and data table',
    fragments: [
      {
        fragmentId: 'kpi-grid',
        props: { title: 'Key Metrics' },
        data: { metrics: { source: 'analytics', params: {} } },
      },
      {
        fragmentId: 'bar-chart',
        props: { title: 'Monthly Revenue' },
        data: { series: { source: 'analytics-timeseries', params: {} } },
      },
      {
        fragmentId: 'data-table',
        props: { title: 'Support Tickets', columns: ['title', 'status', 'priority', 'assignee'] },
        data: { rows: { source: 'tickets', params: {} } },
      },
    ],
  },
};

// ── 2. Support Queue ──

const supportQueue: Preset = {
  id: 'support-queue',
  name: 'Support Queue',
  description: 'Ticket tracker with assignee details and team activity',
  fragmentCount: 3,
  composition: {
    layout: 'primary-detail',
    intent: 'Support queue with ticket list, user details, and activity feed',
    fragments: [
      {
        fragmentId: 'status-list',
        props: { title: 'Open Tickets' },
        data: { items: { source: 'tickets', params: {} } },
      },
      {
        fragmentId: 'user-card',
        props: {},
        data: { users: { source: 'users', params: {} } },
      },
      {
        fragmentId: 'activity-feed',
        props: { title: 'Recent Activity' },
        data: { events: { source: 'activity', params: {} } },
      },
    ],
    bindings: [
      {
        id: 'ticket-to-user',
        sourceFragmentInstanceId: '__resolve_0__',
        sourceInteraction: 'selectItem',
        targetFragmentInstanceId: '__resolve_1__',
        targetType: 'prop',
        targetKey: 'userId',
        transform: 'id',
      },
    ],
  },
};

// ── 3. System Monitor ──

const systemMonitor: Preset = {
  id: 'system-monitor',
  name: 'System Monitor',
  description: 'Live server metrics with CPU, memory, and request rates',
  fragmentCount: 4,
  composition: {
    layout: 'dashboard',
    intent: 'System monitoring dashboard with live server stats',
    fragments: [
      {
        fragmentId: 'metric-card',
        props: { label: 'CPU Usage', valueKey: 'cpu' },
        data: { metrics: { source: 'server-stats', params: {} } },
      },
      {
        fragmentId: 'metric-card',
        props: { label: 'Memory', valueKey: 'memory' },
        data: { metrics: { source: 'server-stats', params: {} } },
      },
      {
        fragmentId: 'metric-card',
        props: { label: 'Requests/sec', valueKey: 'req/sec' },
        data: { metrics: { source: 'server-stats', params: {} } },
      },
      {
        fragmentId: 'activity-feed',
        props: { title: 'System Events' },
        data: { events: { source: 'activity', params: {} } },
      },
    ],
  },
};

// ── 4. Code Review ──

const codeReview: Preset = {
  id: 'code-review',
  name: 'Code Review',
  description: 'Code display with documentation and status alerts',
  fragmentCount: 3,
  composition: {
    layout: 'split-horizontal',
    intent: 'Code review workspace with code, documentation, and alerts',
    fragments: [
      {
        fragmentId: 'code-block',
        props: {
          title: 'server.ts',
          language: 'typescript',
          code: [
            'import { createServer } from "@bundt/prev/server";',
            '',
            'const server = createServer({',
            '  port: 3000,',
            '  fragments: allFragments,',
            '  dataSources: allDataSources,',
            '});',
            '',
            'server.listen();',
            'console.log("prev server running on :3000");',
          ].join('\n'),
        },
      },
      {
        fragmentId: 'markdown-block',
        props: {
          title: 'Review Notes',
          content: [
            '## Changes',
            '- Added server initialization with fragment registry',
            '- Configured 10 fragments and 7 data sources',
            '- WebSocket handler wired for live interactions',
            '',
            '## Review Checklist',
            '- Verify fragment render output matches specs',
            '- Confirm data source TTL values are appropriate',
            '- Test WebSocket reconnection behavior',
            '',
            '> This composition was built entirely by prev\'s intent resolver.',
          ].join('\n'),
        },
      },
      {
        fragmentId: 'alert-banner',
        props: { title: 'Status' },
        data: { alerts: { source: 'notifications', params: {} } },
      },
    ],
  },
};

// ── 5. DevOps Pipeline ──

const devopsPipeline: Preset = {
  id: 'devops-pipeline',
  name: 'DevOps Pipeline',
  description: 'Deployment progress, environment health, and live logs',
  fragmentCount: 4,
  composition: {
    layout: 'dashboard',
    intent: 'DevOps dashboard with deployment pipeline, environments, and logs',
    fragments: [
      {
        fragmentId: 'progress-tracker',
        props: { title: 'Deploy Pipeline' },
        data: { steps: { source: 'deployment-steps', params: {} } },
      },
      {
        fragmentId: 'environment-status',
        props: { title: 'Environments' },
        data: { environments: { source: 'environments', params: {} } },
      },
      {
        fragmentId: 'log-viewer',
        props: { title: 'Application Logs' },
        data: { entries: { source: 'logs', params: {} } },
      },
      {
        fragmentId: 'alert-banner',
        props: { title: 'Alerts' },
        data: { alerts: { source: 'notifications', params: {} } },
      },
    ],
  },
};

// ── 6. Project Overview ──

const projectOverview: Preset = {
  id: 'project-overview',
  name: 'Project Overview',
  description: 'Team grid, timeline, tag cloud, and traffic distribution',
  fragmentCount: 4,
  composition: {
    layout: 'dashboard',
    intent: 'Project overview with team, timeline, tags, and analytics',
    fragments: [
      {
        fragmentId: 'team-grid',
        props: { title: 'Team' },
        data: { members: { source: 'users', params: {} } },
      },
      {
        fragmentId: 'timeline-card',
        props: { title: 'Release History' },
        data: { events: { source: 'timeline', params: {} } },
      },
      {
        fragmentId: 'pie-chart',
        props: { title: 'Traffic Sources' },
        data: { slices: { source: 'distribution', params: {} } },
      },
      {
        fragmentId: 'tag-cloud',
        props: { title: 'Technologies' },
        data: { tags: { source: 'tags', params: {} } },
      },
    ],
  },
};

export const presets: Preset[] = [
  analyticsDashboard,
  supportQueue,
  systemMonitor,
  codeReview,
  devopsPipeline,
  projectOverview,
];

export const presetsById = new Map(presets.map((p) => [p.id, p]));
