/**
 * Example: A HATEOAS-compliant Task API.
 * Demonstrates all Fielding REST constraints:
 * - Identification of resources (URIs)
 * - Manipulation through representations (HAL+JSON/Siren)
 * - Self-descriptive messages (Content-Type, Link headers, ETag)
 * - HATEOAS (all state transitions discoverable via links/actions)
 */

import { createRouter, HttpError, resource, collection, serve } from '../src/server/index.ts';

// --- In-memory store ---

type Task = {
  id: string;
  title: string;
  completed: boolean;
  createdAt: string;
  updatedAt: string;
};

const tasks = new Map<string, Task>();
let nextId = 1;

function baseUrl(ctx: { url: URL }) {
  return `${ctx.url.origin}/api`;
}

// --- Router ---

const router = createRouter({
  basePath: '/api',
  corsOrigin: true
});

// API Root - the single entry point. All URLs are discovered from here.
router.get('/', (ctx) => ({
  resource: resource({
    title: 'Task API',
    version: '1.0.0',
    description: 'A HATEOAS-compliant task management API'
  })
    .self(`${baseUrl(ctx)}/`)
    .link('tasks', `${baseUrl(ctx)}/tasks`, { title: 'Task Collection' })
    .link('search', `${baseUrl(ctx)}/tasks{?q,completed}`, {
      templated: true,
      title: 'Search Tasks'
    })
    .link('profile', `${baseUrl(ctx)}/profile`, { title: 'API Profile' })
    .build(),
  maxAge: 3600
}));

// Task Collection
router.get('/tasks', (ctx) => {
  const page = parseInt(ctx.query.get('page') ?? '1', 10);
  const pageSize = parseInt(ctx.query.get('pageSize') ?? '20', 10);
  const q = ctx.query.get('q');
  const completedFilter = ctx.query.get('completed');

  let filtered = [...tasks.values()];

  if (q) {
    const lower = q.toLowerCase();
    filtered = filtered.filter((t) => t.title.toLowerCase().includes(lower));
  }

  if (completedFilter !== null) {
    const completed = completedFilter === 'true';
    filtered = filtered.filter((t) => t.completed === completed);
  }

  const start = (page - 1) * pageSize;
  const slice = filtered.slice(start, start + pageSize);

  const items = slice.map((task) => taskResource(task, ctx.url.origin));

  const col = collection(`${baseUrl(ctx)}/tasks`, items, {
    total: filtered.length,
    page,
    pageSize,
    baseHref: `${baseUrl(ctx)}/tasks`
  });

  // Add the create-task action to the collection
  col.actions.push({
    name: 'create-task',
    href: `${baseUrl(ctx)}/tasks`,
    method: 'POST',
    type: 'application/json',
    title: 'Create Task',
    fields: [
      { name: 'title', type: 'text', title: 'Title', required: true }
    ]
  });

  return { resource: col };
});

// Create Task
router.post('/tasks', async (ctx) => {
  const body = await ctx.request.json() as { title?: string };
  if (!body.title) throw HttpError.badRequest('Title is required');

  const id = String(nextId++);
  const now = new Date().toISOString();
  const task: Task = {
    id,
    title: body.title,
    completed: false,
    createdAt: now,
    updatedAt: now
  };

  tasks.set(id, task);

  return {
    resource: taskResource(task, ctx.url.origin),
    status: 201,
    headers: { Location: `${baseUrl(ctx)}/tasks/${id}` }
  };
});

// Get Task
router.get('/tasks/:id', (ctx) => {
  const task = tasks.get(ctx.params['id']!);
  if (!task) throw HttpError.notFound(`Task ${ctx.params['id']} not found`);

  return {
    resource: taskResource(task, ctx.url.origin),
    lastModified: new Date(task.updatedAt)
  };
});

// Update Task
router.put('/tasks/:id', async (ctx) => {
  const task = tasks.get(ctx.params['id']!);
  if (!task) throw HttpError.notFound(`Task ${ctx.params['id']} not found`);

  const body = await ctx.request.json() as Partial<Task>;
  if (body.title !== undefined) task.title = body.title;
  if (body.completed !== undefined) task.completed = body.completed;
  task.updatedAt = new Date().toISOString();

  return { resource: taskResource(task, ctx.url.origin) };
});

// Delete Task
router.delete('/tasks/:id', (ctx) => {
  const id = ctx.params['id']!;
  if (!tasks.has(id)) throw HttpError.notFound(`Task ${id} not found`);

  tasks.delete(id);

  // Return a resource pointing back to the collection
  return {
    resource: resource({ deleted: true })
      .link('collection', `${baseUrl(ctx)}/tasks`, { title: 'Back to Tasks' })
      .build()
  };
});

// API Profile (describes the API semantics)
router.get('/profile', (ctx) => ({
  resource: resource({
    name: 'Task API',
    description: 'RESTful task management following Fielding constraints',
    mediaTypes: ['application/hal+json', 'application/vnd.siren+json'],
    linkRelations: {
      tasks: 'Collection of all tasks',
      search: 'URI template for searching tasks by query and completion status',
      'toggle-complete': 'Toggle the completion status of a task',
      collection: 'Parent collection of a task'
    }
  })
    .self(`${baseUrl(ctx)}/profile`)
    .link('home', `${baseUrl(ctx)}/`)
    .build(),
  maxAge: 86400
}));

// --- Helper ---

function taskResource(task: Task, origin: string) {
  const base = `${origin}/api`;
  const builder = resource({
    id: task.id,
    title: task.title,
    completed: task.completed,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt
  })
    .self(`${base}/tasks/${task.id}`)
    .link('collection', `${base}/tasks`, { title: 'All Tasks' });

  // Actions are driven by state - the server tells the client what it CAN do
  builder.action('update', `${base}/tasks/${task.id}`, 'PUT', {
    title: 'Update Task',
    type: 'application/json',
    fields: [
      { name: 'title', type: 'text', title: 'Title', value: task.title },
      { name: 'completed', type: 'checkbox', title: 'Completed', value: task.completed }
    ]
  });

  builder.action('delete', `${base}/tasks/${task.id}`, 'DELETE', {
    title: 'Delete Task'
  });

  // State-dependent action: only show toggle when it makes sense
  builder.action(
    task.completed ? 'reopen' : 'complete',
    `${base}/tasks/${task.id}`,
    'PUT',
    {
      title: task.completed ? 'Reopen Task' : 'Complete Task',
      type: 'application/json',
      fields: [
        { name: 'completed', type: 'hidden', value: !task.completed }
      ]
    }
  );

  return builder.build();
}

// --- Start ---

serve({
  router,
  port: 3456,
  onStarted: (url) => {
    console.log(`\nTask API running at ${url}/api`);
    console.log(`\nTry: curl -H "Accept: application/hal+json" ${url}/api/\n`);
  }
});
