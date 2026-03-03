import { join } from 'node:path';
import { writeFileSync, readFileSync, existsSync } from 'node:fs';
import { getConfigValue } from './config';
import { openDatabase } from '../history/db';
import { recordEvent } from '../history/recorder';
import { ensureDir, resolveTargetBase } from '../helpers';
import { heading, label, sep, success, error, warn, pc } from '../ui';

interface EventRow {
  id: number;
  timestamp: string;
  action: string;
  target_type: string;
  target_name: string;
  config_snapshot: string | null;
  metadata: string | null;
}

export function rollbackCommand(
  target: string,
  opts: { global?: boolean; to?: string; dryRun?: boolean }
) {
  const isGlobal = opts.global ?? false;

  if (getConfigValue(isGlobal, 'history.enabled') !== true) {
    error('History is not enabled. Run: cleo config set history.enabled true');
    process.exitCode = 1;
    return;
  }

  const targetBase = resolveTargetBase(isGlobal);
  const db = openDatabase(targetBase);
  if (!db) return;

  try {
    let row: EventRow | undefined;

    if (opts.to) {
      row = db.prepare(
        'SELECT * FROM events WHERE id = ? AND target_name = ? AND config_snapshot IS NOT NULL'
      ).get(Number(opts.to), target) as EventRow | undefined;
    } else {
      row = db.prepare(
        'SELECT * FROM events WHERE target_name = ? AND config_snapshot IS NOT NULL ORDER BY id DESC LIMIT 1 OFFSET 1'
      ).get(target) as EventRow | undefined;
    }

    if (!row || !row.config_snapshot) {
      error(`No snapshot found for "${target}"${opts.to ? ` at event #${opts.to}` : ''}.`);
      process.exitCode = 1;
      return;
    }

    const snapshot = JSON.parse(row.config_snapshot);

    if (opts.dryRun) {
      console.log();
      console.log(heading('Dry run — would restore:'));
      console.log(label('Target:', pc.bold(target)));
      console.log(label('Type:', row.target_type));
      console.log(label('From event:', `#${row.id} (${pc.dim(row.timestamp)})`));
      console.log();
      console.log(pc.dim(JSON.stringify(snapshot, null, 2)));
      return;
    }

    if (row.target_type === 'agent') {
      restoreAgent(targetBase, target, snapshot);
    } else {
      restoreSkill(targetBase, target, snapshot);
    }

    success(`Rolled back ${pc.bold(target)} to event #${row.id}`);

    recordEvent(targetBase, isGlobal, {
      action: 'rollback',
      targetType: row.target_type as 'agent' | 'skill',
      targetName: target,
      configSnapshot: snapshot,
      metadata: { restoredFromEvent: row.id }
    });
  } finally {
    db.close();
  }
}

function restoreAgent(targetBase: string, name: string, snapshot: Record<string, unknown>) {
  const agentPath = join(targetBase, 'agents', `${name}.md`);

  // Reconstruct frontmatter + body from snapshot
  // If snapshot has a 'body' key, use it; otherwise rebuild from frontmatter fields
  const body = typeof snapshot.body === 'string'
    ? snapshot.body
    : existsSync(agentPath)
      ? extractBody(readFileSync(agentPath, 'utf8'))
      : `\n# ${capitalize(name)} Agent\n`;

  const fm = { ...snapshot };
  delete fm.body;

  const content = buildMarkdown(fm, body);
  ensureDir(join(targetBase, 'agents'));
  writeFileSync(agentPath, content);
}

function restoreSkill(targetBase: string, name: string, snapshot: Record<string, unknown>) {
  const skillDir = join(targetBase, 'skills', name);
  const skillPath = join(skillDir, 'SKILL.md');

  const body = typeof snapshot.body === 'string'
    ? snapshot.body
    : existsSync(skillPath)
      ? extractBody(readFileSync(skillPath, 'utf8'))
      : `\n# ${capitalize(name)}\n`;

  const fm = { ...snapshot };
  delete fm.body;

  ensureDir(skillDir);
  writeFileSync(skillPath, buildMarkdown(fm, body));
}

function buildMarkdown(frontmatter: Record<string, unknown>, body: string): string {
  const lines = ['---'];
  for (const [key, val] of Object.entries(frontmatter)) {
    if (Array.isArray(val)) {
      lines.push(`${key}: [${val.join(', ')}]`);
    } else {
      lines.push(`${key}: ${val}`);
    }
  }
  lines.push('---');
  return lines.join('\n') + (body.startsWith('\n') ? body : '\n' + body);
}

function extractBody(raw: string): string {
  const match = raw.match(/^---[\s\S]*?---(.*)$/s);
  return match?.[1] ?? '';
}

function capitalize(s: string): string {
  return s.split(/[-_]/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}
