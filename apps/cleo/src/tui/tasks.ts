import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, basename, resolve } from 'node:path';
import { taskDefinitionSchema } from '../task/schema';
import type { TaskDefinition } from '../task/schema';
import { createContext, buildAndDecodeContext, isBcpAvailable } from '../integrations/bcp';
import type { TaskTemplateEntry } from './types';

const TASKS_DIR = 'tasks';

const getTasksDirs = (): { local: string; global: string } => ({
  local: join(process.cwd(), '.cleo', TASKS_DIR),
  global: join(process.env.HOME ?? '~', '.claude', TASKS_DIR),
});

const loadTemplatesFromDir = (
  dir: string,
  source: 'local' | 'global'
): TaskTemplateEntry[] => {
  if (!existsSync(dir)) return [];

  return readdirSync(dir)
    .filter(f => f.endsWith('.json'))
    .map(f => {
      try {
        const raw = JSON.parse(readFileSync(join(dir, f), 'utf8'));
        const parsed = taskDefinitionSchema.safeParse(raw);
        if (!parsed.success) return null;
        const task = parsed.data;
        return {
          name: basename(f, '.json'),
          description: task.description,
          model: task.model,
          source,
          fileCount: task.files.length,
          commandCount: task.commands.length,
          documentCount: task.documents.length,
        } satisfies TaskTemplateEntry;
      } catch {
        return null;
      }
    })
    .filter((e): e is TaskTemplateEntry => e !== null);
};

export const loadAllTemplates = (): TaskTemplateEntry[] => {
  const dirs = getTasksDirs();
  const local = loadTemplatesFromDir(dirs.local, 'local');
  const global = loadTemplatesFromDir(dirs.global, 'global');
  // Local templates shadow global ones with same name
  const seen = new Set(local.map(t => t.name));
  return [...local, ...global.filter(t => !seen.has(t.name))];
};

const loadTaskDefinition = (name: string): TaskDefinition | null => {
  const dirs = getTasksDirs();
  // Local first, then global
  for (const dir of [dirs.local, dirs.global]) {
    const filePath = join(dir, `${name}.json`);
    if (!existsSync(filePath)) continue;
    try {
      const raw = JSON.parse(readFileSync(filePath, 'utf8'));
      const parsed = taskDefinitionSchema.safeParse(raw);
      if (parsed.success) return parsed.data;
    } catch {
      // skip
    }
  }
  return null;
};

const runCommand = async (cmd: string): Promise<string> => {
  const proc = Bun.spawn(['sh', '-c', cmd], {
    stdout: 'pipe',
    stderr: 'pipe',
    cwd: process.cwd(),
  });
  const stdout = await new Response(proc.stdout).text();
  const stderr = await new Response(proc.stderr).text();
  await proc.exited;
  return stdout + (stderr ? `\n${stderr}` : '');
};

const expandPath = (filePath: string): string[] => {
  const absPath = resolve(process.cwd(), filePath);
  if (!existsSync(absPath)) return [];
  const stat = statSync(absPath);
  if (stat.isFile()) return [filePath];
  if (stat.isDirectory()) {
    const entries: string[] = [];
    const walk = (dir: string, relBase: string) => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const rel = relBase ? `${relBase}/${entry.name}` : entry.name;
        if (entry.isFile()) {
          entries.push(`${filePath}/${rel}`);
        } else if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
          walk(`${dir}/${entry.name}`, rel);
        }
      }
    };
    walk(absPath, '');
    return entries;
  }
  return [];
};

export const prepareBcpContextForTemplate = async (
  templateName: string
): Promise<string | null> => {
  const task = loadTaskDefinition(templateName);
  if (!task) return null;

  const hasBlocks = task.files.length > 0 || task.commands.length > 0 || task.documents.length > 0;
  if (!hasBlocks) return null;

  const available = await isBcpAvailable();
  if (!available) {
    return buildFallbackContext(task);
  }

  const ctx = createContext(`Task: ${task.description}`);

  for (const file of task.files) {
    const expanded = expandPath(file.path);
    for (const fp of expanded) {
      const absPath = resolve(process.cwd(), fp);
      const content = readFileSync(absPath, 'utf8');
      ctx.addFile(fp, content, {
        priority: file.priority,
        summary: file.summary,
      });
    }
  }

  for (const cmd of task.commands) {
    const output = await runCommand(cmd.run);
    ctx.addToolResult(cmd.run, output, undefined, {
      priority: cmd.priority,
      summary: cmd.summary,
    });
  }

  for (const doc of task.documents) {
    ctx.addDocument(doc.title, doc.content, {
      format: doc.format,
      priority: doc.priority,
      summary: doc.summary,
    });
  }

  if (ctx.blockCount === 0) return null;

  const result = await buildAndDecodeContext(ctx, {
    budget: task.budget,
    mode: 'xml',
  });

  return result?.text ?? null;
};

const buildFallbackContext = async (task: TaskDefinition): Promise<string> => {
  const parts: string[] = [];

  for (const file of task.files) {
    const expanded = expandPath(file.path);
    for (const fp of expanded) {
      const absPath = resolve(process.cwd(), fp);
      const content = readFileSync(absPath, 'utf8');
      parts.push(`<file path="${fp}">\n${content}\n</file>`);
    }
  }

  for (const cmd of task.commands) {
    const output = await runCommand(cmd.run);
    parts.push(`<tool_result command="${cmd.run}">\n${output}\n</tool_result>`);
  }

  for (const doc of task.documents) {
    parts.push(`<document title="${doc.title}">\n${doc.content}\n</document>`);
  }

  return parts.join('\n\n');
};

export const getTemplatePromptAndModel = (
  templateName: string
): { prompt: string; model: string } | null => {
  const task = loadTaskDefinition(templateName);
  if (!task) return null;
  return { prompt: task.description, model: task.model };
};
