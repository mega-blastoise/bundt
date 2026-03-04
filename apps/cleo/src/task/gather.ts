import { input, select, confirm, number } from '@inquirer/prompts';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, relative } from 'node:path';
import { pc, info, warn, sep } from '../ui';
import { PRIORITY_VALUES, type TaskDefinition, type TaskFile, type TaskCommand, type TaskDocument, type Priority } from './schema';

const priorityChoices = PRIORITY_VALUES.map((p) => ({
  name: p === 'critical' ? pc.red(p) : p === 'high' ? pc.yellow(p) : p === 'background' ? pc.dim(p) : p,
  value: p
}));

const promptPriority = async (label: string, defaultValue: Priority = 'normal'): Promise<Priority> => {
  return select({
    message: `Priority for ${pc.cyan(label)}:`,
    choices: priorityChoices,
    default: defaultValue
  });
};

const resolveGlob = async (pattern: string): Promise<string[]> => {
  const glob = new Bun.Glob(pattern);
  const matches: string[] = [];
  for await (const path of glob.scan({ cwd: process.cwd(), absolute: false })) {
    matches.push(path);
  }
  return matches.sort();
};

const addFiles = async (files: TaskFile[]): Promise<void> => {
  let adding = true;
  while (adding) {
    const pattern = await input({
      message: 'File path or glob pattern (empty to finish):',
    });

    if (!pattern.trim()) {
      adding = false;
      continue;
    }

    const resolved = pattern.includes('*') ? await resolveGlob(pattern) : [pattern];

    if (resolved.length === 0) {
      warn(`No files matched: ${pattern}`);
      continue;
    }

    const missing = resolved.filter((f) => !existsSync(resolve(process.cwd(), f)));
    if (missing.length > 0) {
      warn(`Not found: ${missing.join(', ')}`);
    }

    const valid = resolved.filter((f) => existsSync(resolve(process.cwd(), f)));
    if (valid.length === 0) continue;

    if (valid.length === 1) {
      info(`Adding: ${valid[0]}`);
    } else {
      info(`Adding ${valid.length} files from ${pattern}`);
    }

    const priority = await promptPriority(
      valid.length === 1 ? valid[0]! : `${valid.length} files`,
      'normal'
    );

    const summary = valid.length > 3
      ? await input({ message: 'Brief summary for this group (optional):', default: '' })
      : undefined;

    for (const f of valid) {
      files.push({
        path: f,
        priority,
        ...(summary ? { summary } : {})
      });
    }
  }
};

const addCommands = async (commands: TaskCommand[]): Promise<void> => {
  let adding = true;
  while (adding) {
    const cmd = await input({
      message: 'Command to capture output from (empty to finish):',
    });

    if (!cmd.trim()) {
      adding = false;
      continue;
    }

    const priority = await promptPriority(cmd, 'high');

    const summary = await input({
      message: 'Brief summary of what this captures (optional):',
      default: ''
    });

    commands.push({
      run: cmd,
      priority,
      ...(summary ? { summary } : {})
    });
  }
};

const addDocuments = async (documents: TaskDocument[]): Promise<void> => {
  let adding = true;
  while (adding) {
    const source = await select({
      message: 'Add external context:',
      choices: [
        { name: 'From file path', value: 'file' },
        { name: 'Paste text', value: 'paste' },
        { name: 'Done adding context', value: 'done' }
      ]
    });

    if (source === 'done') {
      adding = false;
      continue;
    }

    const title = await input({ message: 'Title for this context:' });

    let content: string;
    if (source === 'file') {
      const filePath = await input({ message: 'File path:' });
      const resolved = resolve(process.cwd(), filePath);
      if (!existsSync(resolved)) {
        warn(`File not found: ${filePath}`);
        continue;
      }
      content = readFileSync(resolved, 'utf8');
    } else {
      content = await input({ message: 'Paste content (single line — use file path for multi-line):' });
    }

    const priority = await promptPriority(title, 'normal');

    documents.push({
      title,
      content,
      format: 'markdown',
      priority
    });
  }
};

export const gatherTask = async (initialDescription?: string): Promise<TaskDefinition> => {
  console.log();
  console.log(pc.bold(pc.cyan('cleo task')) + pc.dim(' — build token-efficient context for Claude'));
  console.log(sep());
  console.log();

  // Step 1: Task description
  const description = initialDescription ?? await input({
    message: 'What do you need Claude to do?',
  });

  console.log();

  // Step 2: Files
  console.log(pc.bold('Files'));
  console.log(pc.dim('Add source files relevant to this task. Use glob patterns for multiple files.'));
  console.log();

  const files: TaskFile[] = [];

  // Auto-suggest CLAUDE.md if it exists
  const claudeMd = findClaudeMd();
  if (claudeMd) {
    const include = await confirm({
      message: `Found ${pc.cyan(claudeMd)} — include as critical context?`,
      default: true
    });
    if (include) {
      files.push({ path: claudeMd, priority: 'critical' });
    }
  }

  await addFiles(files);
  console.log();

  // Step 3: Commands
  console.log(pc.bold('Commands'));
  console.log(pc.dim('Capture output from commands (build errors, test results, git diff, etc.)'));
  console.log();

  const commands: TaskCommand[] = [];

  // Suggest git diff if there are changes
  if (hasGitChanges()) {
    const includeGit = await confirm({
      message: `Detected uncommitted changes — include ${pc.cyan('git diff')} output?`,
      default: true
    });
    if (includeGit) {
      commands.push({ run: 'git diff', priority: 'high' });
    }
  }

  await addCommands(commands);
  console.log();

  // Step 4: External context
  console.log(pc.bold('External Context'));
  console.log(pc.dim('Add specs, error logs, API docs, or other reference material.'));
  console.log();

  const documents: TaskDocument[] = [];
  await addDocuments(documents);
  console.log();

  // Step 5: Budget
  console.log(pc.bold('Budget'));
  const budget = await number({
    message: 'Token budget for context (leave empty for no limit):',
    default: undefined
  });

  console.log();

  // Step 6: Model
  const model = await select({
    message: 'Model:',
    choices: [
      { name: 'claude-sonnet-4-6', value: 'claude-sonnet-4-6' },
      { name: 'claude-opus-4-6', value: 'claude-opus-4-6' },
      { name: 'claude-sonnet-4-5', value: 'claude-sonnet-4-5' },
      { name: 'claude-opus-4', value: 'claude-opus-4' }
    ],
    default: 'claude-sonnet-4-6'
  });

  return {
    description,
    files,
    commands,
    documents,
    budget: budget ?? undefined,
    model
  };
};

const findClaudeMd = (): string | null => {
  const candidates = ['CLAUDE.md', '.claude/CLAUDE.md'];
  for (const c of candidates) {
    if (existsSync(resolve(process.cwd(), c))) return c;
  }
  return null;
};

const hasGitChanges = (): boolean => {
  try {
    const proc = Bun.spawnSync(['git', 'status', '--porcelain'], {
      stdout: 'pipe',
      stderr: 'pipe'
    });
    return proc.stdout.toString().trim().length > 0;
  } catch {
    return false;
  }
};
