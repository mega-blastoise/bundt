import { afterEach, describe, expect, test } from 'bun:test';
import { createDatabase, type PrevDatabase } from './database';
import type { Frame, Session } from '../types';

let db: PrevDatabase;

afterEach(() => {
  db?.close();
});

function makeSession(): Session {
  return {
    id: crypto.randomUUID(),
    agentId: 'agent-1',
    currentFrameId: undefined,
    frameHistory: [],
    historyIndex: -1,
    metadata: {},
    createdAt: Date.now(),
    lastActiveAt: Date.now()
  };
}

function makeFrame(sessionId: string): Frame {
  return {
    id: crypto.randomUUID(),
    sessionId,
    layout: {
      type: 'single',
      gap: '0',
      padding: '0',
      columns: 1,
      rows: 1,
      positions: new Map([['inst-1', { row: 1, col: 1, rowSpan: 1, colSpan: 1 }]])
    },
    fragments: [
      { instanceId: 'inst-1', fragmentId: 'test', props: {}, dataBindings: {} }
    ],
    bindings: [],
    createdAt: Date.now()
  };
}

describe('Database', () => {
  test('session CRUD', () => {
    db = createDatabase(':memory:');
    const session = makeSession();
    db.sessions.create(session);

    const retrieved = db.sessions.get(session.id);
    expect(retrieved).toBeDefined();
    expect(retrieved!.id).toBe(session.id);
    expect(retrieved!.agentId).toBe('agent-1');
  });

  test('session update', () => {
    db = createDatabase(':memory:');
    const session = makeSession();
    db.sessions.create(session);

    db.sessions.update(session.id, { currentFrameId: 'frame-1', metadata: { key: 'value' } });
    const updated = db.sessions.get(session.id);
    expect(updated!.currentFrameId).toBe('frame-1');
    expect(updated!.metadata).toEqual({ key: 'value' });
  });

  test('session touch updates lastActiveAt', () => {
    db = createDatabase(':memory:');
    const session = makeSession();
    session.lastActiveAt = 1000;
    db.sessions.create(session);

    db.sessions.touch(session.id);
    const updated = db.sessions.get(session.id);
    expect(updated!.lastActiveAt).toBeGreaterThan(1000);
  });

  test('frame CRUD', () => {
    db = createDatabase(':memory:');
    const session = makeSession();
    db.sessions.create(session);

    const frame = makeFrame(session.id);
    db.frames.create(frame);

    const retrieved = db.frames.get(frame.id);
    expect(retrieved).toBeDefined();
    expect(retrieved!.id).toBe(frame.id);
    expect(retrieved!.layout.type).toBe('single');
    expect(retrieved!.layout.positions.get('inst-1')).toEqual({ row: 1, col: 1, rowSpan: 1, colSpan: 1 });
  });

  test('frames by session', () => {
    db = createDatabase(':memory:');
    const session = makeSession();
    db.sessions.create(session);

    db.frames.create(makeFrame(session.id));
    db.frames.create(makeFrame(session.id));

    const frames = db.frames.getBySession(session.id);
    expect(frames).toHaveLength(2);
  });

  test('frame history', () => {
    db = createDatabase(':memory:');
    const session = makeSession();
    db.sessions.create(session);

    const frame1 = makeFrame(session.id);
    const frame2 = makeFrame(session.id);
    db.frames.create(frame1);
    db.frames.create(frame2);
    db.frameHistory.push(session.id, frame1.id);
    db.frameHistory.push(session.id, frame2.id);

    const history = db.frameHistory.get(session.id);
    expect(history).toHaveLength(2);
    expect(history[0]).toBe(frame1.id);
    expect(history[1]).toBe(frame2.id);
  });

  test('fragment state', () => {
    db = createDatabase(':memory:');
    db.fragmentState.set('frame-1', 'inst-1', { selected: true });
    const state = db.fragmentState.get('frame-1', 'inst-1');
    expect(state).toEqual({ selected: true });
  });

  test('data cache with TTL', () => {
    db = createDatabase(':memory:');
    db.dataCache.set('source-1', 'hash-1', { data: 'test' }, 60000);
    const cached = db.dataCache.get('source-1', 'hash-1');
    expect(cached).toEqual({ data: 'test' });
  });

  test('data cache expired', () => {
    db = createDatabase(':memory:');
    db.dataCache.set('source-1', 'hash-1', { data: 'test' }, -1);
    const cached = db.dataCache.get('source-1', 'hash-1');
    expect(cached).toBeUndefined();
  });

  test('returns undefined for missing session', () => {
    db = createDatabase(':memory:');
    expect(db.sessions.get('nonexistent')).toBeUndefined();
  });

  test('returns undefined for missing frame', () => {
    db = createDatabase(':memory:');
    expect(db.frames.get('nonexistent')).toBeUndefined();
  });
});
