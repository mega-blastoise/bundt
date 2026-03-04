#!/usr/bin/env bun
import cac from 'cac';
import { BANNER } from './ui';
import { runCommand } from './commands/run';
import { listCommand } from './commands/list';
import { infoCommand } from './commands/info';
import { installCommand } from './commands/install';
import { uninstallCommand } from './commands/uninstall';
import { initCommand } from './commands/init';
import { createSkillCommand } from './commands/create-skill';
import { validateCommand } from './commands/validate';
import { configCommand } from './commands/config';
import { historyCommand } from './commands/history';
import { rollbackCommand } from './commands/rollback';
import { searchCommand } from './commands/search';
import { submitCommand } from './commands/submit';
import { taskCommand } from './commands/task';
import { startTui } from './tui/index';

const cli = cac('cleo');

cli
  .command('run [...task]', 'Run a task through Claude Code (headless, structured output)')
  .option('--model <model>', 'Model to use', { default: 'claude-sonnet-4-6' })
  .option('--max-budget <usd>', 'Maximum dollar budget for the run')
  .option('--bcp <file>', 'Path to .bcp file for token-efficient context')
  .option('--budget <tokens>', 'Token budget for BCP adaptive rendering')
  .action(async (task: string[], options: { model: string; maxBudget?: string; bcp?: string; budget?: string }) => {
    try {
      await runCommand(task, options);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`Failed: ${message}`);
      process.exit(1);
    }
  });

cli
  .command('list', 'List available agents (bundled, global, local)')
  .action(() => listCommand());

cli
  .command('info <agent>', 'Show details for an agent')
  .action((agent: string) => infoCommand(agent));

cli
  .command('install [...agents]', 'Install bundled agents to .claude/agents/')
  .option('--global', 'Install to ~/.claude instead of .claude')
  .action((agents: string[], opts: { global?: boolean }) => installCommand(agents, opts));

cli
  .command('uninstall <...agents>', 'Remove installed agents and orphaned skills')
  .option('--global', 'Remove from ~/.claude instead of .claude')
  .action((agents: string[], opts: { global?: boolean }) => uninstallCommand(agents, opts));

cli
  .command('init <name>', 'Scaffold a new agent markdown file')
  .option('-d, --description <desc>', 'Agent description')
  .option('-t, --tools <tools>', 'Comma-separated tool list')
  .option('-o, --output <dir>', 'Output directory')
  .action((name: string, opts: { description?: string; tools?: string; output?: string }) => initCommand(name, opts));

cli
  .command('create-skill <name>', 'Scaffold a new skill directory with SKILL.md')
  .option('-d, --description <desc>', 'Skill description')
  .option('-o, --output <dir>', 'Output directory')
  .action((name: string, opts: { description?: string; output?: string }) => createSkillCommand(name, opts));

cli
  .command('validate [...agents]', 'Validate agent structure and references')
  .option('--global', 'Validate global agents')
  .action((agents: string[], opts: { global?: boolean }) => validateCommand(agents.length ? agents : undefined, opts));

cli
  .command('config <...args>', 'Get or set configuration values')
  .option('--global', 'Use global config (~/.claude)')
  .action((args: string[], opts: { global?: boolean }) => configCommand(args, opts));

cli
  .command('history [target]', 'View history of agent/skill operations')
  .option('--global', 'Use global history')
  .option('-a, --action <action>', 'Filter by action (install, uninstall, init, create-skill)')
  .option('-l, --limit <n>', 'Max events to show (default 25)')
  .option('--id <id>', 'Show details for a specific event')
  .option('--detail', 'Show full config snapshot and metadata')
  .action((target: string | undefined, opts: { global?: boolean; action?: string; limit?: string; id?: string; detail?: boolean }) =>
    historyCommand(target, opts)
  );

cli
  .command('rollback <target>', 'Restore an agent or skill to a previous snapshot')
  .option('--global', 'Use global history')
  .option('--to <id>', 'Restore to a specific event ID')
  .option('--dry-run', 'Show what would be restored without writing')
  .action((target: string, opts: { global?: boolean; to?: string; dryRun?: boolean }) =>
    rollbackCommand(target, opts)
  );

cli
  .command('search <query>', 'Search for agents and skills (local + registry)')
  .option('--deep', 'Enable fuzzy body search')
  .option('--type <type>', 'Filter by type (agent or skill)')
  .action(async (query: string, opts: { deep?: boolean; type?: string }) => searchCommand(query, opts));

cli
  .command('submit <type> <qualified-name>', 'Submit an agent or skill to the registry')
  .action(async (type: string, qualifiedName: string) => submitCommand(type, qualifiedName));

cli
  .command('task [...description]', 'Build token-efficient context and run a task through Claude')
  .option('-t, --template <name>', 'Load a saved task template')
  .option('-s, --save <name>', 'Save this task as a reusable template')
  .option('-l, --list', 'List saved task templates')
  .option('--global', 'Use global templates (~/.claude/tasks/)')
  .option('--dry-run', 'Review context without executing')
  .option('--max-budget <usd>', 'Maximum dollar budget for the run')
  .action(async (
    description: string[] | undefined,
    opts: { template?: string; save?: string; list?: boolean; global?: boolean; dryRun?: boolean; maxBudget?: string }
  ) => {
    try {
      await taskCommand(description, opts);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`Failed: ${message}`);
      process.exit(1);
    }
  });

cli
  .command('tui', 'Launch interactive TUI for managing multiple Claude Code sessions')
  .action(async () => {
    try {
      await startTui();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`Failed: ${message}`);
      process.exit(1);
    }
  });

cli.help(() => {
  console.log(BANNER);
});

cli.version('0.1.0-alpha.0');
cli.parse();
