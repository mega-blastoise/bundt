import { join } from 'node:path';
import { existsSync, writeFileSync } from 'node:fs';
import { ensureDir } from '../helpers';
import { success, error, file, pc } from '../ui';
import { recordEvent } from '../history/recorder';
import { resolveTargetBase } from '../helpers';

const DEFAULT_TOOLS = ['Read', 'Write', 'Edit', 'Bash', 'Grep', 'Glob'];

export function initCommand(name: string, opts: { description?: string; tools?: string; output?: string }) {
  const outDir = opts.output ?? join(process.cwd(), '.claude', 'agents');
  const filePath = join(outDir, `${name}.md`);

  if (existsSync(filePath)) {
    error(`Agent "${name}" already exists at ${filePath}`);
    process.exitCode = 1;
    return;
  }

  const tools = opts.tools ? opts.tools.split(',').map(t => t.trim()) : DEFAULT_TOOLS;
  const description = opts.description ?? `Custom agent: ${name}`;

  const content = `---
name: ${name}
description: ${description}
tools: [${tools.join(', ')}]
model: inherit
---

# ${capitalize(name)} Agent

## Identity

You are a specialized agent for ${description.toLowerCase()}.

## Core Competencies

<!-- TODO: Define what this agent excels at -->

## Development Patterns

<!-- TODO: Define step-by-step workflows -->

## Critical Constraints

- **ALWAYS**: <!-- TODO -->
- **NEVER**: <!-- TODO -->
`;

  ensureDir(outDir);
  writeFileSync(filePath, content);

  success(`Created agent ${pc.bold(name)}`);
  console.log(`  ${file(filePath)}`);
  console.log(pc.dim(`  Edit the file to customize the agent prompt.`));

  recordEvent(resolveTargetBase(false), false, {
    action: 'init',
    targetType: 'agent',
    targetName: name,
    configSnapshot: { name, description, tools }
  });
}

function capitalize(s: string): string {
  return s.split(/[-_]/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}
