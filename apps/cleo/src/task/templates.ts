import { existsSync, readFileSync, writeFileSync, readdirSync, mkdirSync } from 'node:fs';
import { join, basename } from 'node:path';
import { resolveTargetBase } from '../helpers';
import { taskDefinitionSchema, type TaskDefinition } from './schema';

const TASKS_DIR = 'tasks';

const getTasksDir = (isGlobal: boolean): string => {
  return join(resolveTargetBase(isGlobal), TASKS_DIR);
};

export const saveTemplate = (
  name: string,
  task: TaskDefinition,
  isGlobal: boolean = false
): string => {
  const dir = getTasksDir(isGlobal);
  mkdirSync(dir, { recursive: true });

  const filePath = join(dir, `${name}.json`);
  const toSave = { ...task, name };
  writeFileSync(filePath, JSON.stringify(toSave, null, 2) + '\n');
  return filePath;
};

export const loadTemplate = (
  name: string,
  isGlobal: boolean = false
): TaskDefinition | null => {
  const dir = getTasksDir(isGlobal);
  const filePath = join(dir, `${name}.json`);

  if (!existsSync(filePath)) return null;

  try {
    const raw = JSON.parse(readFileSync(filePath, 'utf8'));
    const parsed = taskDefinitionSchema.safeParse(raw);
    if (!parsed.success) return null;
    return parsed.data;
  } catch {
    return null;
  }
};

export const listTemplates = (isGlobal: boolean = false): string[] => {
  const dir = getTasksDir(isGlobal);
  if (!existsSync(dir)) return [];

  return readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => basename(f, '.json'))
    .sort();
};

export const templateExists = (name: string, isGlobal: boolean = false): boolean => {
  const dir = getTasksDir(isGlobal);
  return existsSync(join(dir, `${name}.json`));
};
