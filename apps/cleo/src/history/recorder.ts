import { getConfigValue } from '../commands/config';
import { openDatabase } from './db';

export type HistoryAction = 'install' | 'uninstall' | 'init' | 'create-skill' | 'rollback';

export interface HistoryEvent {
  action: HistoryAction;
  targetType: 'agent' | 'skill';
  targetName: string;
  configSnapshot?: object;
  metadata?: object;
}

export function recordEvent(targetBase: string, isGlobal: boolean, event: HistoryEvent) {
  try {
    const enabled = getConfigValue(isGlobal, 'history.enabled');
    if (enabled !== true) return;

    const db = openDatabase(targetBase);
    if (!db) return;

    try {
      db.prepare(
        `INSERT INTO events (action, target_type, target_name, config_snapshot, metadata)
         VALUES (?, ?, ?, ?, ?)`
      ).run(
        event.action,
        event.targetType,
        event.targetName,
        event.configSnapshot ? JSON.stringify(event.configSnapshot) : null,
        event.metadata ? JSON.stringify(event.metadata) : null
      );
    } finally {
      db.close();
    }
  } catch {
    // History failures never block primary operations
  }
}
