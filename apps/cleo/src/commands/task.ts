import { input, confirm } from '@inquirer/prompts';
import { pc, info, success, error, warn, sep, heading } from '../ui';
import { gatherTask } from '../task/gather';
import { reviewTask } from '../task/review';
import { executeTask } from '../task/execute';
import { saveTemplate, loadTemplate, listTemplates, templateExists } from '../task/templates';
import type { TaskDefinition } from '../task/schema';

export interface TaskCommandOptions {
  template?: string;
  save?: string;
  list?: boolean;
  global?: boolean;
  dryRun?: boolean;
  maxBudget?: string;
}

export const taskCommand = async (
  description: string[] | undefined,
  options: TaskCommandOptions
) => {
  // List templates
  if (options.list) {
    return listTaskTemplates(options.global ?? false);
  }

  let task: TaskDefinition;

  // Load from template
  if (options.template) {
    const loaded = loadTemplate(options.template, options.global);
    if (!loaded) {
      error(`Template not found: ${options.template}`);
      const available = listTemplates(options.global);
      if (available.length > 0) {
        console.log(pc.dim(`Available: ${available.join(', ')}`));
      }
      process.exit(1);
    }
    info(`Loaded template: ${pc.cyan(options.template)}`);
    task = loaded;

    // Allow overriding description from CLI args
    if (description && description.length > 0) {
      task = { ...task, description: description.join(' ') };
    }
  } else {
    // Interactive gather
    const initialDesc = description && description.length > 0
      ? description.join(' ')
      : undefined;
    task = await gatherTask(initialDesc);
  }

  // Override max budget from CLI
  if (options.maxBudget) {
    task = { ...task, maxBudgetUsd: Number(options.maxBudget) };
  }

  // Review
  const proceed = await reviewTask(task);
  if (!proceed) {
    console.log(pc.dim('Cancelled.'));
    return;
  }

  // Save as template
  if (options.save) {
    const path = saveTemplate(options.save, task, options.global);
    success(`Saved template: ${pc.cyan(options.save)} (${path})`);
  } else {
    const shouldSave = await confirm({
      message: 'Save this as a reusable template?',
      default: false
    });

    if (shouldSave) {
      const name = await input({
        message: 'Template name:',
        validate: (v: string) => v.trim().length > 0 || 'Name is required'
      });

      if (templateExists(name, options.global)) {
        const overwrite = await confirm({
          message: `Template ${pc.cyan(name)} exists. Overwrite?`,
          default: false
        });
        if (!overwrite) {
          warn('Template not saved.');
        } else {
          const path = saveTemplate(name, task, options.global);
          success(`Saved template: ${pc.cyan(name)} (${path})`);
        }
      } else {
        const path = saveTemplate(name, task, options.global);
        success(`Saved template: ${pc.cyan(name)} (${path})`);
      }
    }
  }

  // Dry run — stop before execution
  if (options.dryRun) {
    info('Dry run — skipping execution.');
    return;
  }

  // Execute
  console.log();
  try {
    const result = await executeTask(task);
    printResult(result);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    error(`Task failed: ${msg}`);
    process.exit(1);
  }
};

const printResult = (result: {
  summary: string;
  filesChanged: string[];
  errors: string[];
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  durationMs: number;
  bcpStats?: { blockCount: number; totalSize: number };
}) => {
  console.log();
  console.log(heading('Result'));
  console.log(sep());
  console.log(result.summary);

  if (result.filesChanged.length > 0) {
    console.log();
    console.log(pc.bold('Files changed:'));
    for (const f of result.filesChanged) {
      console.log(pc.green(`  + ${f}`));
    }
  }

  if (result.errors.length > 0) {
    console.log();
    console.log(pc.bold(pc.red('Errors:')));
    for (const e of result.errors) {
      console.log(pc.red(`  - ${e}`));
    }
  }

  console.log();
  console.log(heading('Stats'));
  console.log(sep());
  console.log(`${pc.bold('Tokens:')}   ${pc.yellow(result.inputTokens.toLocaleString())} in / ${pc.yellow(result.outputTokens.toLocaleString())} out`);

  const costStr = result.costUsd > 0 ? `$${result.costUsd.toFixed(4)}` : 'N/A';
  console.log(`${pc.bold('Cost:')}     ${pc.yellow(costStr)}`);
  console.log(`${pc.bold('Duration:')} ${pc.yellow(`${(result.durationMs / 1000).toFixed(1)}s`)}`);

  if (result.bcpStats) {
    console.log(`${pc.bold('BCP:')}      ${pc.yellow(String(result.bcpStats.blockCount))} blocks, ${pc.yellow(String(result.bcpStats.totalSize))} bytes packed`);
  }
};

const listTaskTemplates = (isGlobal: boolean) => {
  const local = isGlobal ? [] : listTemplates(false);
  const global = listTemplates(true);

  if (local.length === 0 && global.length === 0) {
    console.log(pc.dim('No saved task templates.'));
    console.log(pc.dim('Run `cleo task` interactively and save a template, or use --save <name>.'));
    return;
  }

  if (local.length > 0) {
    console.log(pc.bold('Local templates') + pc.dim(` (.cleo/tasks/)`));
    for (const name of local) {
      const t = loadTemplate(name, false);
      console.log(`  ${pc.cyan(name)}${t?.description ? pc.dim(` — ${t.description}`) : ''}`);
    }
  }

  if (global.length > 0) {
    if (local.length > 0) console.log();
    console.log(pc.bold('Global templates') + pc.dim(` (~/.claude/tasks/)`));
    for (const name of global) {
      const t = loadTemplate(name, true);
      console.log(`  ${pc.cyan(name)}${t?.description ? pc.dim(` — ${t.description}`) : ''}`);
    }
  }
};
