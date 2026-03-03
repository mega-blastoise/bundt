import { getConfigValue } from './config';
import { openDatabase } from '../history/db';
import { resolveTargetBase } from '../helpers';
import { heading, table, sep, label, error, pc } from '../ui';

interface EventRow {
  id: number;
  timestamp: string;
  action: string;
  target_type: string;
  target_name: string;
  config_snapshot: string | null;
  metadata: string | null;
}

const ACTION_COLORS: Record<string, (s: string) => string> = {
  install: pc.green,
  uninstall: pc.red,
  init: pc.blue,
  'create-skill': pc.blue,
  rollback: pc.yellow
};

function colorAction(action: string): string {
  return (ACTION_COLORS[action] ?? pc.white)(action);
}

export function historyCommand(
  target: string | undefined,
  opts: { global?: boolean; action?: string; limit?: string; id?: string; detail?: boolean }
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
    if (opts.id) {
      const row = db.prepare('SELECT * FROM events WHERE id = ?').get(Number(opts.id)) as EventRow | undefined;
      if (!row) {
        error(`Event #${opts.id} not found.`);
        process.exitCode = 1;
        return;
      }

      console.log();
      console.log(heading(`Event #${row.id}`));
      console.log(label('Timestamp:', pc.dim(row.timestamp)));
      console.log(label('Action:', colorAction(row.action)));
      console.log(label('Type:', row.target_type));
      console.log(label('Name:', pc.bold(row.target_name)));

      if (opts.detail && row.config_snapshot) {
        console.log();
        console.log(heading('Config Snapshot'));
        console.log(pc.dim(JSON.stringify(JSON.parse(row.config_snapshot), null, 2)));
      }

      if (opts.detail && row.metadata) {
        console.log();
        console.log(heading('Metadata'));
        console.log(pc.dim(JSON.stringify(JSON.parse(row.metadata), null, 2)));
      }
      return;
    }

    const conditions: string[] = [];
    const params: unknown[] = [];

    if (target) {
      conditions.push('target_name = ?');
      params.push(target);
    }
    if (opts.action) {
      conditions.push('action = ?');
      params.push(opts.action);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const limit = Number(opts.limit) || 25;
    params.push(limit);

    const rows = db.prepare(
      `SELECT id, timestamp, action, target_type, target_name FROM events ${where} ORDER BY id DESC LIMIT ?`
    ).all(...params) as EventRow[];

    if (rows.length === 0) {
      console.log(pc.dim('No history events found.'));
      return;
    }

    table(
      ['ID', 'Timestamp', 'Action', 'Type', 'Name'],
      rows.map(r => [
        String(r.id),
        pc.dim(r.timestamp),
        colorAction(r.action),
        r.target_type,
        pc.bold(r.target_name)
      ]),
      [6, 22, 14, 8, 20]
    );

    console.log();
    console.log(pc.dim(`${rows.length} event(s)`));
  } finally {
    db.close();
  }
}
