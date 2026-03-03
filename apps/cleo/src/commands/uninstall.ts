import { join } from 'node:path';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import fm from 'front-matter';
import { loadAgentMarkdown, removeIfExists, resolveTargetBase } from '../helpers';
import { success, error, pc } from '../ui';
import { recordEvent } from '../history/recorder';
import type { AgentFrontmatter } from '../types';

export function uninstallCommand(names: string[], opts: { global?: boolean }) {
  if (names.length === 0) {
    error('No agent names provided.');
    process.exitCode = 1;
    return;
  }

  const targetBase = resolveTargetBase(opts.global ?? false);
  const agentsDir = join(targetBase, 'agents');
  const skillsDir = join(targetBase, 'skills');

  for (const name of names) {
    const agentPath = join(agentsDir, `${name}.md`);
    if (!existsSync(agentPath)) {
      error(`Agent "${name}" is not installed.`);
      process.exitCode = 1;
      continue;
    }

    const agent = loadAgentMarkdown(agentsDir, name);
    const removedSkills = agent?.frontmatter.skills ?? [];

    removeIfExists(agentPath);

    const stillUsed = new Set<string>();
    if (existsSync(agentsDir)) {
      for (const file of readdirSync(agentsDir).filter(f => f.endsWith('.md'))) {
        try {
          const raw = readFileSync(join(agentsDir, file), 'utf8');
          const parsed = fm<AgentFrontmatter>(raw);
          for (const s of parsed.attributes.skills ?? []) stillUsed.add(s);
        } catch { /* skip invalid */ }
      }
    }

    for (const skill of removedSkills) {
      if (!stillUsed.has(skill)) {
        removeIfExists(join(skillsDir, skill), { recursive: true });
      }
    }

    const label = opts.global ? '~/.claude' : '.claude';
    success(`Uninstalled ${pc.bold(name)} from ${pc.dim(label + '/agents/')}`);

    recordEvent(targetBase, opts.global ?? false, {
      action: 'uninstall',
      targetType: 'agent',
      targetName: name,
      configSnapshot: agent?.frontmatter
    });
  }
}
