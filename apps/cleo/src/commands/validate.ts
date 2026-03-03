import { join } from 'node:path';
import { existsSync } from 'node:fs';
import { getAvailableAgents, loadAgentMarkdown, resolveTargetBase, getCliRoot } from '../helpers';
import { AgentFrontmatterSchema } from '../types';
import type { ValidationResult } from '../types';
import { pc, error as uiError } from '../ui';

export function validateCommand(names?: string[], opts?: { global?: boolean }) {
  const dirs = [
    join(getCliRoot(), 'resources', 'agents'),
    join(resolveTargetBase(opts?.global ?? false), 'agents')
  ];

  const allNames = names?.length
    ? names
    : dirs.flatMap(d => getAvailableAgents(d));

  const unique = [...new Set(allNames)];

  if (unique.length === 0) {
    uiError('No agents found to validate.');
    process.exitCode = 1;
    return;
  }

  let errorCount = 0;

  for (const name of unique) {
    const result = validate(name, dirs, opts?.global ?? false);
    const icon = result.errors.length > 0 ? pc.red('✗') : pc.green('✓');
    console.log(`${icon} ${name}`);

    for (const e of result.errors) console.log(pc.red(`    ${e}`));
    for (const w of result.warnings) console.log(pc.dim(pc.yellow(`    ${w}`)));

    if (result.errors.length > 0) errorCount++;
  }

  console.log();
  console.log(pc.dim(`Checked ${unique.length} agent(s), ${errorCount} with errors.`));
  if (errorCount > 0) process.exitCode = 1;
}

function validate(name: string, agentDirs: string[], isGlobal: boolean): ValidationResult {
  const result: ValidationResult = { agent: name, errors: [], warnings: [] };

  let agent: ReturnType<typeof loadAgentMarkdown> = null;
  for (const dir of agentDirs) {
    agent = loadAgentMarkdown(dir, name);
    if (agent) break;
  }

  if (!agent) {
    result.errors.push('Agent file not found or unreadable');
    return result;
  }

  const parsed = AgentFrontmatterSchema.safeParse(agent.frontmatter);
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      result.errors.push(`frontmatter.${issue.path.join('.')}: ${issue.message}`);
    }
    return result;
  }

  const fm = parsed.data;

  if (!fm.model) result.warnings.push('No model specified (will use default)');

  const skillsDir = join(resolveTargetBase(isGlobal), 'skills');
  const bundledSkillsDir = join(getCliRoot(), 'resources', 'skills');

  for (const skill of fm.skills ?? []) {
    const installed = existsSync(join(skillsDir, skill, 'SKILL.md'));
    const bundled = existsSync(join(bundledSkillsDir, skill, 'SKILL.md'));
    if (!installed && !bundled) {
      result.errors.push(`Referenced skill "${skill}" not found`);
    }
  }

  if (agent.body.trim().length < 50) {
    result.warnings.push('Agent prompt body is very short');
  }

  return result;
}
