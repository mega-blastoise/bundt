import { createRequire } from "node:module";
import { join } from "node:path";
import { ensureDir } from "../helpers";

var require = createRequire(import.meta.url);

export interface PreparedStatement {
  run(...params: unknown[]): { changes: number; lastInsertRowid: number };
  all(...params: unknown[]): unknown[];
  get(...params: unknown[]): unknown | undefined;
}

export interface DatabaseHandle {
  exec(sql: string): void;
  prepare(sql: string): PreparedStatement;
  close(): void;
}

const SCHEMA = `
CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp TEXT NOT NULL DEFAULT (datetime('now')),
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_name TEXT NOT NULL,
  config_snapshot TEXT,
  metadata TEXT
);
CREATE INDEX IF NOT EXISTS idx_events_target ON events(target_type, target_name);
CREATE INDEX IF NOT EXISTS idx_events_action ON events(action);
CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(timestamp);
`;

let warned = false;

export function openDatabase(targetBase: string): DatabaseHandle | null {
  const dbPath = join(targetBase, "cleo-history.db");
  ensureDir(targetBase);

  // Try bun:sqlite first
  if (globalThis.Bun) {
    try {
      const { Database } = require("bun:sqlite");
      const db = new Database(dbPath);
      db.exec(SCHEMA);
      return wrapBunDatabase(db);
    } catch {
      /* fall through */
    }
  }

  // Try node:sqlite
  try {
    const { DatabaseSync } = require("node:sqlite");
    const db = new DatabaseSync(dbPath);
    db.exec(SCHEMA);
    return wrapNodeDatabase(db);
  } catch {
    /* fall through */
  }

  if (!warned) {
    warned = true;
    console.warn(
      "Warning: No SQLite runtime available. History tracking disabled.",
    );
  }
  return null;
}

function wrapBunDatabase(db: any): DatabaseHandle {
  return {
    exec: (sql: string) => db.exec(sql),
    prepare: (sql: string) => {
      const stmt = db.prepare(sql);
      return {
        run: (...params: unknown[]) => stmt.run(...params),
        all: (...params: unknown[]) => stmt.all(...params),
        get: (...params: unknown[]) => stmt.get(...params),
      };
    },
    close: () => db.close(),
  };
}

function wrapNodeDatabase(db: any): DatabaseHandle {
  return {
    exec: (sql: string) => db.exec(sql),
    prepare: (sql: string) => {
      const stmt = db.prepare(sql);
      return {
        run: (...params: unknown[]) => {
          const result = stmt.run(...params);
          return {
            changes: Number(result.changes),
            lastInsertRowid: Number(result.lastInsertRowid),
          };
        },
        all: (...params: unknown[]) => stmt.all(...params),
        get: (...params: unknown[]) => stmt.get(...params),
      };
    },
    close: () => db.close(),
  };
}
