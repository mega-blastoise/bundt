/**
 * Example: React client that consumes the Task API.
 * Demonstrates pure HATEOAS navigation — the only hardcoded URL is the entry point.
 * All subsequent navigation is driven by link relations and actions from the server.
 */

import { useState, useCallback } from 'react';
import {
  HypermediaProvider,
  useRoot,
  useLink,
  useAction,
  ResourceView,
  ActionForm,
  IfAction,
  IfLink,
  EmbeddedList,
  HypermediaNav,
  type HypermediaResource
} from '../src/index.ts';

// --- App Entry Point ---

export function App() {
  return (
    <HypermediaProvider entryPoint="http://localhost:3456/api/">
      <TaskApp />
    </HypermediaProvider>
  );
}

// --- Main App ---

function TaskApp() {
  const root = useRoot<{ title: string; version: string }>();
  const [selectedTask, setSelectedTask] = useState<HypermediaResource | null>(null);

  if (root.status === 'loading') return <div className="loading">Discovering API...</div>;
  if (root.status === 'error') return <div className="error-msg">Error: {root.error.message}</div>;
  if (root.status !== 'success') return null;

  const rootResource = root.resource;

  return (
    <div>
      <ResourceView
        resource={rootResource}
        render={({ properties }) => (
          <header>
            <h1>{properties.title}</h1>
            <span>v{properties.version}</span>
          </header>
        )}
      />

      {selectedTask ? (
        <TaskDetail
          resource={selectedTask}
          onBack={() => setSelectedTask(null)}
        />
      ) : (
        <IfLink resource={rootResource} rel="tasks">
          <TaskList
            root={rootResource}
            onSelect={setSelectedTask}
          />
        </IfLink>
      )}
    </div>
  );
}

// --- Task List ---

type TaskListProps = {
  root: HypermediaResource;
  onSelect: (task: HypermediaResource) => void;
};

function TaskList({ root, onSelect }: TaskListProps) {
  const tasksState = useLink<{ total: number; page: number }>(root, 'tasks');

  if (tasksState.status === 'loading') return <div className="loading">Loading tasks...</div>;
  if (tasksState.status === 'error') return <div className="error-msg">Error: {tasksState.error.message}</div>;
  if (tasksState.status !== 'success') return null;

  const tasksResource = tasksState.resource;

  return (
    <section>
      <h2>Tasks ({tasksResource.properties.total})</h2>

      <IfAction resource={tasksResource} name="create-task">
        <ActionForm
          resource={tasksResource}
          actionName="create-task"
          onSuccess={() => tasksState.refresh()}
        >
          {({ loading, error }) => (
            <div className="create-form">
              <input name="title" placeholder="New task..." required />
              <button type="submit" className="btn--primary" disabled={loading}>
                {loading ? 'Creating...' : 'Add Task'}
              </button>
              {error && <span className="error-msg">{error.message}</span>}
            </div>
          )}
        </ActionForm>
      </IfAction>

      <EmbeddedList<{ id: string; title: string; completed: boolean }>
        resource={tasksResource}
        rel="items"
        empty={<p className="empty">No tasks yet. Create one above!</p>}
        renderItem={(task) => (
          <div key={task.properties.id} className="task-item">
            <span className={`status ${task.properties.completed ? 'status--done' : ''}`}>
              {task.properties.completed ? '[x]' : '[ ]'}
            </span>
            <span className={`title ${task.properties.completed ? 'title--done' : ''}`}>
              {task.properties.title}
            </span>
            <HypermediaNav resource={task} rel="self" onNavigate={onSelect}>
              View
            </HypermediaNav>
          </div>
        )}
      />

      <nav>
        <HypermediaNav resource={tasksResource} rel="prev" onNavigate={() => tasksState.refresh()}>
          Previous
        </HypermediaNav>
        <HypermediaNav resource={tasksResource} rel="next" onNavigate={() => tasksState.refresh()}>
          Next
        </HypermediaNav>
      </nav>
    </section>
  );
}

// --- Task Detail ---

type TaskDetailProps = {
  resource: HypermediaResource;
  onBack: () => void;
};

function TaskDetail({ resource: initialResource, onBack }: TaskDetailProps) {
  const [taskResource, setTaskResource] = useState(initialResource);

  const completeAction = useAction(taskResource, 'complete');
  const reopenAction = useAction(taskResource, 'reopen');
  const deleteAction = useAction(taskResource, 'delete');

  const handleToggle = useCallback(async () => {
    const action = completeAction.available ? completeAction : reopenAction;
    if (!action.available) return;
    const result = await action.execute();
    setTaskResource(result);
  }, [completeAction, reopenAction]);

  const handleDelete = useCallback(async () => {
    if (!deleteAction.available) return;
    await deleteAction.execute();
    onBack();
  }, [deleteAction, onBack]);

  return (
    <ResourceView<{ id: string; title: string; completed: boolean; createdAt: string }>
      resource={taskResource as HypermediaResource<{ id: string; title: string; completed: boolean; createdAt: string }>}
      render={({ properties }) => (
        <article>
          <h2>{properties.title}</h2>
          <p>Status: {properties.completed ? 'Completed' : 'Pending'}</p>
          <p>Created: {new Date(properties.createdAt).toLocaleDateString()}</p>

          <div className="detail-actions">
            <IfAction resource={taskResource} name="complete">
              <button onClick={handleToggle}>Complete</button>
            </IfAction>

            <IfAction resource={taskResource} name="reopen">
              <button onClick={handleToggle}>Reopen</button>
            </IfAction>

            <div className="spacer" />

            <IfAction resource={taskResource} name="delete">
              <button className="btn--danger" onClick={handleDelete}>Delete</button>
            </IfAction>
          </div>

          <HypermediaNav resource={taskResource} rel="collection" onNavigate={onBack}>
            Back to Tasks
          </HypermediaNav>
        </article>
      )}
    />
  );
}
