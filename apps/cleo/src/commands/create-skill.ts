import { join } from 'node:path';
import { existsSync, writeFileSync } from 'node:fs';
import { ensureDir } from '../helpers';
import { success, error, file, pc } from '../ui';
import { recordEvent } from '../history/recorder';
import { resolveTargetBase } from '../helpers';

export function createSkillCommand(name: string, opts: { description?: string; output?: string }) {
  const outDir = opts.output ?? join(process.cwd(), '.claude', 'skills', name);
  const filePath = join(outDir, 'SKILL.md');

  if (existsSync(filePath)) {
    error(`Skill "${name}" already exists at ${filePath}`);
    process.exitCode = 1;
    return;
  }

  const description = opts.description ?? `Skill: ${name}`;
  const heading = name.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

  const content = `---
name: ${name}
description: ${description}
tags: []
---

# ${heading}

## Key Concepts

<!-- TODO: Define core knowledge this skill provides -->

## Best Practices

<!-- TODO: Define best practices and patterns -->

## Common Patterns

<!-- TODO: Add code examples and usage patterns -->
`;

  ensureDir(outDir);
  writeFileSync(filePath, content);

  success(`Created skill ${pc.bold(name)}`);
  console.log(`  ${file(filePath)}`);
  console.log(pc.dim(`  Reference in an agent via: skills: [${name}]`));

  recordEvent(resolveTargetBase(false), false, {
    action: 'create-skill',
    targetType: 'skill',
    targetName: name,
    configSnapshot: { name, description }
  });
}
