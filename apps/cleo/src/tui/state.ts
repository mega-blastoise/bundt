import type { AppState, Session, SessionStatus } from './types';
import { DEFAULT_MODEL } from './types';
import { fg } from './themes';
import type { Theme } from './themes';
import { getTermSize } from './terminal';

let idCounter = 0;

export function createState(): AppState {
  return {
    sessions: [],
    activeIndex: 0,
    focus: 'sidebar',
    inputMode: 'none',
    modal: null,
    inputBuffer: '',
    inputLabel: '',
    scrollOffset: -1,
    sidebarWidth: 28,
    running: true,
    themeName: 'dark',
    pendingModel: DEFAULT_MODEL,
    pendingAgent: '',
    pendingBcpContext: '',
    pendingTemplateName: '',
    modelSelectIndex: 0,
    agentSelectIndex: 0,
    templates: [],
    templateSelectIndex: 0,
    dispatchSelectIndex: 0,
    dispatchSelected: new Set(),
  };
}

export interface CreateSessionOptions {
  prompt: string;
  model: string;
  agent?: string;
  bcpContext?: string;
  templateName?: string;
}

export function createSession(opts: CreateSessionOptions): Session;
export function createSession(prompt: string, model: string, agent?: string): Session;
export function createSession(
  promptOrOpts: string | CreateSessionOptions,
  model?: string,
  agent?: string
): Session {
  idCounter++;
  const opts: CreateSessionOptions = typeof promptOrOpts === 'string'
    ? { prompt: promptOrOpts, model: model!, agent }
    : promptOrOpts;

  const shortName = opts.prompt.length > 22 ? opts.prompt.slice(0, 22) + '\u2026' : opts.prompt;
  const prefix = opts.templateName ? `[${opts.templateName}] ` : '';
  return {
    id: `s${idCounter}`,
    name: prefix ? prefix + shortName : shortName,
    prompt: opts.prompt,
    status: 'running',
    model: opts.model,
    agent: opts.agent || undefined,
    bcpContext: opts.bcpContext || undefined,
    templateName: opts.templateName || undefined,
    lines: [],
    startedAt: Date.now(),
    turnCount: 0,
  };
}

export function addLine(session: Session, line: string) {
  session.lines.push(line);
  if (session.lines.length > 2000) {
    session.lines = session.lines.slice(-1500);
  }
}

export function setStatus(session: Session, status: SessionStatus) {
  session.status = status;
  if (status === 'done' || status === 'error') {
    session.finishedAt = Date.now();
  }
}

export function statusIcon(status: SessionStatus, theme: Theme): string {
  const colorMap: Record<SessionStatus, [number, number, number]> = {
    running: theme.warning,
    waiting: theme.info,
    done: theme.success,
    error: theme.error,
  };
  return fg(colorMap[status], theme.statusIcons[status]);
}

export function activeSession(state: AppState): Session | undefined {
  return state.sessions[state.activeIndex];
}

export function contentHeight(state: AppState): number {
  const { rows } = getTermSize();
  const contentH = rows - 3; // header + gradient bar + status bar
  const mainH = contentH - 2; // box borders
  const session = activeSession(state);
  const hasInputBar = session && (state.inputMode === 'chat' || session.status === 'waiting');
  return mainH - (hasInputBar ? 2 : 0);
}
