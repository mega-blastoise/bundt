import type { PrevDatabase } from './database';
import type { Frame, Session } from '../types';

export interface SessionManager {
  createSession(agentId?: string, metadata?: Record<string, unknown>): Session;
  getOrCreateSession(sessionId?: string): Session;
  touchSession(id: string): void;
  getSessionFrame(sessionId: string): Frame | undefined;
  pushFrame(sessionId: string, frame: Frame): void;
  navigateHistory(sessionId: string, direction: 'back' | 'forward', steps?: number): Frame | undefined;
}

export function createSessionManager(database: PrevDatabase): SessionManager {
  function createSession(agentId?: string, metadata?: Record<string, unknown>): Session {
    const session: Session = {
      id: crypto.randomUUID(),
      agentId,
      currentFrameId: undefined,
      frameHistory: [],
      historyIndex: -1,
      metadata: metadata ?? {},
      createdAt: Date.now(),
      lastActiveAt: Date.now()
    };
    database.sessions.create(session);
    return session;
  }

  function getOrCreateSession(sessionId?: string): Session {
    if (sessionId) {
      const existing = database.sessions.get(sessionId);
      if (existing) {
        database.sessions.touch(sessionId);
        return existing;
      }
    }
    return createSession();
  }

  function touchSession(id: string): void {
    database.sessions.touch(id);
  }

  function getSessionFrame(sessionId: string): Frame | undefined {
    const session = database.sessions.get(sessionId);
    if (!session?.currentFrameId) return undefined;
    return database.frames.get(session.currentFrameId);
  }

  function pushFrame(sessionId: string, frame: Frame): void {
    database.frames.create(frame);
    database.frameHistory.push(sessionId, frame.id);

    const session = database.sessions.get(sessionId);
    if (!session) throw new Error(`Session "${sessionId}" not found`);

    const history = [...session.frameHistory.slice(0, session.historyIndex + 1), frame.id];
    database.sessions.update(sessionId, {
      currentFrameId: frame.id,
      frameHistory: history,
      historyIndex: history.length - 1,
      lastActiveAt: Date.now()
    });
  }

  function navigateHistory(sessionId: string, direction: 'back' | 'forward', steps = 1): Frame | undefined {
    const session = database.sessions.get(sessionId);
    if (!session) throw new Error(`Session "${sessionId}" not found`);

    const delta = direction === 'back' ? -steps : steps;
    const newIndex = session.historyIndex + delta;

    if (newIndex < 0 || newIndex >= session.frameHistory.length) return undefined;

    const frameId = session.frameHistory[newIndex];
    if (!frameId) return undefined;

    database.sessions.update(sessionId, {
      currentFrameId: frameId,
      historyIndex: newIndex,
      lastActiveAt: Date.now()
    });

    return database.frames.get(frameId);
  }

  return { createSession, getOrCreateSession, touchSession, getSessionFrame, pushFrame, navigateHistory };
}
