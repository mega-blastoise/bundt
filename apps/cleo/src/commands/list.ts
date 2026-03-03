import { join } from 'node:path';
import { getAvailableAgents, getCliRoot, resolveTargetBase } from '../helpers';
import { heading, info, pc } from '../ui';

export function listCommand() {
  const root = getCliRoot();
  const bundledDir = join(root, 'resources', 'agents');
  const localDir = join(resolveTargetBase(false), 'agents');
  const globalDir = join(resolveTargetBase(true), 'agents');

  const bundled = getAvailableAgents(bundledDir);
  const local = getAvailableAgents(localDir);
  const global = getAvailableAgents(globalDir);

  if (bundled.length === 0 && local.length === 0 && global.length === 0) {
    info('No agents found.');
    return;
  }

  if (bundled.length > 0) {
    console.log(heading('Bundled'));
    for (const a of bundled) console.log(`  ${pc.cyan('•')} ${a}`);
    console.log();
  }

  if (global.length > 0) {
    console.log(heading('Global (~/.claude/agents)'));
    for (const a of global) console.log(`  ${pc.green('•')} ${a}`);
    console.log();
  }

  if (local.length > 0) {
    console.log(heading('Local (.claude/agents)'));
    for (const a of local) console.log(`  ${pc.blue('•')} ${a}`);
    console.log();
  }
}
