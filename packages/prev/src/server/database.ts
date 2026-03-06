import { Database } from 'bun:sqlite';

import type { Frame, Session } from '../types';

export interface PrevDatabase {
  sessions: {
    create(session: Session): void;
    get(id: string): Session | undefined;
    update(id: string, fields: Partial<Session>): void;
    touch(id: string): void;
  };
  frames: {
    create(frame: Frame): void;
    get(id: string): Frame | undefined;
    getBySession(sessionId: string): Frame[];
  };
  frameHistory: {
    push(sessionId: string, frameId: string): void;
    get(sessionId: string): string[];
  };
  fragmentState: {
    set(frameId: string, instanceId: string, state: Record<string, unknown>): void;
    get(frameId: string, instanceId: string): Record<string, unknown> | undefined;
  };
  dataCache: {
    get(sourceId: string, paramsHash: string): unknown | undefined;
    set(sourceId: string, paramsHash: string, result: unknown, ttl: number): void;
  };
  close(): void;
}

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    agent_id TEXT,
    current_frame_id TEXT,
    frame_history TEXT NOT NULL DEFAULT '[]',
    history_index INTEGER NOT NULL DEFAULT -1,
    metadata TEXT NOT NULL DEFAULT '{}',
    created_at INTEGER NOT NULL,
    last_active_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS frames (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    layout TEXT NOT NULL,
    fragments TEXT NOT NULL,
    bindings TEXT NOT NULL DEFAULT '[]',
    created_at INTEGER NOT NULL,
    intent TEXT,
    FOREIGN KEY (session_id) REFERENCES sessions(id)
  );

  CREATE TABLE IF NOT EXISTS frame_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    frame_id TEXT NOT NULL,
    created_at INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000),
    FOREIGN KEY (session_id) REFERENCES sessions(id),
    FOREIGN KEY (frame_id) REFERENCES frames(id)
  );

  CREATE TABLE IF NOT EXISTS fragment_state (
    frame_id TEXT NOT NULL,
    instance_id TEXT NOT NULL,
    state TEXT NOT NULL DEFAULT '{}',
    updated_at INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000),
    PRIMARY KEY (frame_id, instance_id)
  );

  CREATE TABLE IF NOT EXISTS data_cache (
    source_id TEXT NOT NULL,
    params_hash TEXT NOT NULL,
    result TEXT NOT NULL,
    expires_at INTEGER NOT NULL,
    PRIMARY KEY (source_id, params_hash)
  );

  CREATE INDEX IF NOT EXISTS idx_frames_session ON frames(session_id);
  CREATE INDEX IF NOT EXISTS idx_frame_history_session ON frame_history(session_id);
`;

function serializeLayout(layout: Frame['layout']): string {
  return JSON.stringify({
    ...layout,
    positions: Array.from(layout.positions.entries())
  });
}

function deserializeLayout(json: string): Frame['layout'] {
  const parsed = JSON.parse(json) as Record<string, unknown>;
  return {
    ...parsed,
    positions: new Map(parsed['positions'] as Array<[string, unknown]>)
  } as Frame['layout'];
}

export function createDatabase(path: string): PrevDatabase {
  const db = new Database(path, { create: true });
  db.run('PRAGMA journal_mode = WAL');
  db.run('PRAGMA foreign_keys = ON');
  db.run(SCHEMA);

  const stmts = {
    sessionInsert: db.prepare(
      'INSERT INTO sessions (id, agent_id, current_frame_id, frame_history, history_index, metadata, created_at, last_active_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    ),
    sessionGet: db.prepare('SELECT * FROM sessions WHERE id = ?'),
    sessionUpdate: db.prepare(
      'UPDATE sessions SET current_frame_id = ?, frame_history = ?, history_index = ?, metadata = ?, last_active_at = ? WHERE id = ?'
    ),
    sessionTouch: db.prepare('UPDATE sessions SET last_active_at = ? WHERE id = ?'),

    frameInsert: db.prepare(
      'INSERT INTO frames (id, session_id, layout, fragments, bindings, created_at, intent) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ),
    frameGet: db.prepare('SELECT * FROM frames WHERE id = ?'),
    framesBySession: db.prepare('SELECT * FROM frames WHERE session_id = ? ORDER BY created_at DESC'),

    historyPush: db.prepare('INSERT INTO frame_history (session_id, frame_id) VALUES (?, ?)'),
    historyGet: db.prepare('SELECT frame_id FROM frame_history WHERE session_id = ? ORDER BY id ASC'),

    stateSet: db.prepare(
      'INSERT OR REPLACE INTO fragment_state (frame_id, instance_id, state, updated_at) VALUES (?, ?, ?, ?)'
    ),
    stateGet: db.prepare('SELECT state FROM fragment_state WHERE frame_id = ? AND instance_id = ?'),

    cacheGet: db.prepare('SELECT result, expires_at FROM data_cache WHERE source_id = ? AND params_hash = ?'),
    cacheSet: db.prepare(
      'INSERT OR REPLACE INTO data_cache (source_id, params_hash, result, expires_at) VALUES (?, ?, ?, ?)'
    )
  };

  function rowToSession(row: Record<string, unknown>): Session {
    return {
      id: row['id'] as string,
      agentId: row['agent_id'] as string | undefined,
      currentFrameId: row['current_frame_id'] as string | undefined,
      frameHistory: JSON.parse(row['frame_history'] as string) as string[],
      historyIndex: row['history_index'] as number,
      metadata: JSON.parse(row['metadata'] as string) as Record<string, unknown>,
      createdAt: row['created_at'] as number,
      lastActiveAt: row['last_active_at'] as number
    };
  }

  function rowToFrame(row: Record<string, unknown>): Frame {
    return {
      id: row['id'] as string,
      sessionId: row['session_id'] as string,
      layout: deserializeLayout(row['layout'] as string),
      fragments: JSON.parse(row['fragments'] as string) as Frame['fragments'],
      bindings: JSON.parse(row['bindings'] as string) as Frame['bindings'],
      createdAt: row['created_at'] as number,
      intent: row['intent'] as string | undefined
    };
  }

  const sessions = {
    create(session: Session): void {
      stmts.sessionInsert.run(
        session.id,
        session.agentId ?? null,
        session.currentFrameId ?? null,
        JSON.stringify(session.frameHistory),
        session.historyIndex,
        JSON.stringify(session.metadata),
        session.createdAt,
        session.lastActiveAt
      );
    },
    get(id: string): Session | undefined {
      const row = stmts.sessionGet.get(id) as Record<string, unknown> | null;
      return row ? rowToSession(row) : undefined;
    },
    update(id: string, fields: Partial<Session>): void {
      const current = sessions.get(id);
      if (!current) throw new Error(`Session "${id}" not found`);
      const merged = { ...current, ...fields };
      stmts.sessionUpdate.run(
        merged.currentFrameId ?? null,
        JSON.stringify(merged.frameHistory),
        merged.historyIndex,
        JSON.stringify(merged.metadata),
        merged.lastActiveAt,
        id
      );
    },
    touch(id: string): void {
      stmts.sessionTouch.run(Date.now(), id);
    }
  };

  const frames = {
    create(frame: Frame): void {
      stmts.frameInsert.run(
        frame.id,
        frame.sessionId,
        serializeLayout(frame.layout),
        JSON.stringify(frame.fragments),
        JSON.stringify(frame.bindings),
        frame.createdAt,
        frame.intent ?? null
      );
    },
    get(id: string): Frame | undefined {
      const row = stmts.frameGet.get(id) as Record<string, unknown> | null;
      return row ? rowToFrame(row) : undefined;
    },
    getBySession(sessionId: string): Frame[] {
      const rows = stmts.framesBySession.all(sessionId) as Record<string, unknown>[];
      return rows.map(rowToFrame);
    }
  };

  const frameHistory = {
    push(sessionId: string, frameId: string): void {
      stmts.historyPush.run(sessionId, frameId);
    },
    get(sessionId: string): string[] {
      const rows = stmts.historyGet.all(sessionId) as Array<{ frame_id: string }>;
      return rows.map((r) => r.frame_id);
    }
  };

  const fragmentState = {
    set(frameId: string, instanceId: string, state: Record<string, unknown>): void {
      stmts.stateSet.run(frameId, instanceId, JSON.stringify(state), Date.now());
    },
    get(frameId: string, instanceId: string): Record<string, unknown> | undefined {
      const row = stmts.stateGet.get(frameId, instanceId) as { state: string } | null;
      return row ? (JSON.parse(row.state) as Record<string, unknown>) : undefined;
    }
  };

  const dataCache = {
    get(sourceId: string, paramsHash: string): unknown | undefined {
      const row = stmts.cacheGet.get(sourceId, paramsHash) as { result: string; expires_at: number } | null;
      if (!row) return undefined;
      if (row.expires_at < Date.now()) return undefined;
      return JSON.parse(row.result) as unknown;
    },
    set(sourceId: string, paramsHash: string, result: unknown, ttl: number): void {
      stmts.cacheSet.run(sourceId, paramsHash, JSON.stringify(result), Date.now() + ttl);
    }
  };

  function close(): void {
    db.close();
  }

  return { sessions, frames, frameHistory, fragmentState, dataCache, close };
}
