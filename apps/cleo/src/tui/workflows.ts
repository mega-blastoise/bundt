import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, basename } from 'node:path';
import type { Workflow, WorkflowStep } from './types';

const WORKFLOWS_DIR = 'workflows';

const getWorkflowDirs = (): { local: string; global: string } => ({
  local: join(process.cwd(), '.cleo', WORKFLOWS_DIR),
  global: join(process.env.HOME ?? '~', '.claude', WORKFLOWS_DIR),
});

export const loadWorkflow = (name: string): Workflow | null => {
  const dirs = getWorkflowDirs();
  for (const dir of [dirs.local, dirs.global]) {
    const filePath = join(dir, `${name}.json`);
    if (!existsSync(filePath)) continue;
    try {
      const raw = JSON.parse(readFileSync(filePath, 'utf8')) as {
        name?: string;
        steps?: WorkflowStep[];
      };
      if (!raw.name || !Array.isArray(raw.steps) || raw.steps.length === 0) continue;
      return { name: raw.name, steps: raw.steps };
    } catch {
      // skip
    }
  }
  return null;
};

export const listWorkflows = (): string[] => {
  const dirs = getWorkflowDirs();
  const names = new Set<string>();

  for (const dir of [dirs.local, dirs.global]) {
    if (!existsSync(dir)) continue;
    for (const f of readdirSync(dir)) {
      if (f.endsWith('.json')) names.add(basename(f, '.json'));
    }
  }

  return [...names].sort();
};

export const getReadySteps = (
  workflow: Workflow,
  completedSteps: Set<string>
): WorkflowStep[] => {
  return workflow.steps.filter(step => {
    if (completedSteps.has(step.template)) return false;
    if (!step.dependsOn || step.dependsOn.length === 0) return true;
    return step.dependsOn.every(dep => completedSteps.has(dep));
  });
};

export const isWorkflowComplete = (
  workflow: Workflow,
  completedSteps: Set<string>
): boolean => {
  return workflow.steps.every(step => completedSteps.has(step.template));
};
