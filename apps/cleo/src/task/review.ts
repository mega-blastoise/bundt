import { confirm } from '@inquirer/prompts';
import { pc, info, sep } from '../ui';
import type { TaskDefinition } from './schema';

const priorityColor = (p: string): string => {
  if (p === 'critical') return pc.red(p);
  if (p === 'high') return pc.yellow(p);
  if (p === 'background') return pc.dim(p);
  if (p === 'low') return pc.dim(p);
  return p;
};

export const reviewTask = async (task: TaskDefinition): Promise<boolean> => {
  console.log();
  console.log(pc.bold(pc.cyan('Task Summary')));
  console.log(sep());
  console.log();

  console.log(`  ${pc.bold('Description:')} ${task.description}`);
  console.log(`  ${pc.bold('Model:')}       ${task.model}`);

  if (task.budget) {
    console.log(`  ${pc.bold('Budget:')}      ${task.budget.toLocaleString()} tokens`);
  }

  if (task.files.length > 0) {
    console.log();
    console.log(`  ${pc.bold('Files')} (${task.files.length}):`);
    for (const f of task.files) {
      const prio = priorityColor(f.priority);
      console.log(`    ${pc.cyan(f.path)} ${pc.dim('[')}${prio}${pc.dim(']')}${f.summary ? pc.dim(` — ${f.summary}`) : ''}`);
    }
  }

  if (task.commands.length > 0) {
    console.log();
    console.log(`  ${pc.bold('Commands')} (${task.commands.length}):`);
    for (const c of task.commands) {
      const prio = priorityColor(c.priority);
      console.log(`    ${pc.green('$')} ${c.run} ${pc.dim('[')}${prio}${pc.dim(']')}${c.summary ? pc.dim(` — ${c.summary}`) : ''}`);
    }
  }

  if (task.documents.length > 0) {
    console.log();
    console.log(`  ${pc.bold('Documents')} (${task.documents.length}):`);
    for (const d of task.documents) {
      const prio = priorityColor(d.priority);
      const size = d.content.length > 200 ? `${Math.round(d.content.length / 1024)}kb` : `${d.content.length}b`;
      console.log(`    ${pc.magenta(d.title)} ${pc.dim(`(${size})`)} ${pc.dim('[')}${prio}${pc.dim(']')}`);
    }
  }

  const totalItems = task.files.length + task.commands.length + task.documents.length;
  if (totalItems === 0) {
    console.log();
    console.log(pc.dim('  No context items added. Claude will work with the task description only.'));
  }

  console.log();

  return confirm({
    message: 'Proceed with this task?',
    default: true
  });
};
