import { join } from 'node:path';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { getAvailableAgents, getCliRoot, loadAgentMarkdown, ensureDir, copyIfExists, resolveTargetBase } from '../helpers';
import { success, error, warn, info, pc } from '../ui';
import { recordEvent } from '../history/recorder';

export function installCommand(agents: string[], opts: { global?: boolean }) {
  const root = getCliRoot();
  const bundledAgentsDir = join(root, 'resources', 'agents');
  const bundledSkillsDir = join(root, 'resources', 'skills');
  const targetBase = resolveTargetBase(opts.global ?? false);
  const targetAgentsDir = join(targetBase, 'agents');
  const targetSkillsDir = join(targetBase, 'skills');

  const available = getAvailableAgents(bundledAgentsDir);

  if (available.length === 0) {
    info('No bundled agents available. Add agents to resources/agents/ first.');
    return;
  }

  const names = agents.length > 0 ? agents : available;

  for (const name of names) {
    if (!available.includes(name)) {
      error(`Agent "${name}" not found in bundled resources.`);
      process.exitCode = 1;
      continue;
    }

    const agent = loadAgentMarkdown(bundledAgentsDir, name);
    if (!agent) {
      error(`Failed to load agent "${name}".`);
      process.exitCode = 1;
      continue;
    }

    ensureDir(targetAgentsDir);

    const src = join(bundledAgentsDir, `${name}.md`);
    const dest = join(targetAgentsDir, `${name}.md`);
    copyIfExists(src, dest);

    const skills = agent.frontmatter.skills ?? [];
    for (const skill of skills) {
      const skillSrc = join(bundledSkillsDir, skill, 'SKILL.md');
      const skillDest = join(targetSkillsDir, skill, 'SKILL.md');
      if (existsSync(skillSrc)) {
        ensureDir(join(targetSkillsDir, skill));
        copyIfExists(skillSrc, skillDest);
      } else {
        warn(`Skill "${skill}" referenced by ${name} not found in bundled resources.`);
      }
    }

    const label = opts.global ? '~/.claude' : '.claude';
    success(`Installed ${pc.bold(name)} → ${pc.dim(label + '/agents/')}`);

    recordEvent(targetBase, opts.global ?? false, {
      action: 'install',
      targetType: 'agent',
      targetName: name,
      configSnapshot: agent.frontmatter,
      metadata: { skills }
    });
  }
}
