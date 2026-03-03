import { join } from 'node:path';
import { getAvailableAgents, getCliRoot, loadAgentMarkdown, resolveTargetBase } from '../helpers';
import { heading, label, sep, error, pc } from '../ui';

export function infoCommand(name: string) {
  const dirs = [
    join(getCliRoot(), 'resources', 'agents'),
    join(resolveTargetBase(true), 'agents'),
    join(resolveTargetBase(false), 'agents')
  ];

  let agent: ReturnType<typeof loadAgentMarkdown> = null;
  let source = '';

  for (const dir of dirs) {
    if (getAvailableAgents(dir).includes(name)) {
      agent = loadAgentMarkdown(dir, name);
      source = dir.includes('resources') ? 'bundled' : dir.includes(process.env.HOME ?? '~') ? 'global' : 'local';
      break;
    }
  }

  if (!agent) {
    error(`Agent "${name}" not found.`);
    process.exitCode = 1;
    return;
  }

  const { frontmatter: fm } = agent;

  console.log();
  console.log(heading(fm.name));
  console.log(label('Source:', pc.dim(source)));
  console.log(label('Description:', fm.description));
  if (fm.model) console.log(label('Model:', pc.magenta(fm.model)));
  console.log(label('Tools:', fm.tools.map(t => pc.cyan(t)).join(', ')));
  if (fm.permissionMode) console.log(label('Permissions:', fm.permissionMode));
  if (fm.skills?.length) console.log(label('Skills:', fm.skills.map(s => pc.yellow(s)).join(', ')));
  if (fm.memory) console.log(label('Memory:', fm.memory));
  console.log();
  console.log(sep());
  console.log(pc.dim(agent.body.trim().slice(0, 200) + (agent.body.trim().length > 200 ? '...' : '')));
}
