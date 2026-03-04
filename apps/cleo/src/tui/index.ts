import { enterTui, exitTui, write, ansi } from './terminal';
import { parseKey } from './keys';
import type { Key } from './keys';
import { render } from './render';
import { createState, createSession, activeSession, contentHeight } from './state';
import { launchSession, killSession, sendFollowUp } from './session';
import type { AppState } from './types';
import { MODELS, DEFAULT_MODEL } from './types';
import { nextTheme } from './themes';
import { loadAllTemplates, prepareBcpContextForTemplate, getTemplatePromptAndModel } from './tasks';

let renderScheduled = false;

function scheduleRender(state: AppState) {
  if (!state.running || renderScheduled) return;
  renderScheduled = true;
  queueMicrotask(() => {
    renderScheduled = false;
    if (!state.running) return;
    write(ansi.cursorTo(0, 0));
    render(state);
  });
}

function refreshTemplates(state: AppState) {
  state.templates = loadAllTemplates();
}

function handleKey(state: AppState, key: Key) {
  // Force quit
  if (key.name === 'char' && key.ctrl && key.char === 'c') {
    shutdown(state);
    return;
  }

  // Chat input mode
  if (state.inputMode === 'chat') {
    handleChatInput(state, key);
    scheduleRender(state);
    return;
  }

  // Modal handling
  if (state.modal) {
    handleModal(state, key);
    scheduleRender(state);
    return;
  }

  // Normal mode
  handleNormalMode(state, key);
  scheduleRender(state);
}

function handleNormalMode(state: AppState, key: Key) {
  if (key.name === 'char' && !key.ctrl) {
    switch (key.char) {
      case 'q':
        if (state.sessions.some(s => s.status === 'running' || s.status === 'waiting')) {
          state.modal = 'confirm-quit';
        } else {
          shutdown(state);
        }
        return;
      case '?':
        state.modal = 'help';
        return;
      case 'n':
        state.modal = 'new-session';
        state.inputBuffer = '';
        state.inputLabel = 'New Session';
        state.pendingModel = DEFAULT_MODEL;
        state.pendingAgent = '';
        state.pendingBcpContext = '';
        state.pendingTemplateName = '';
        state.modelSelectIndex = 0;
        state.agentSelectIndex = 0;
        return;
      case 'D':
        refreshTemplates(state);
        state.modal = 'dispatch-tasks';
        state.dispatchSelectIndex = 0;
        state.dispatchSelected = new Set();
        return;
      case 'R':
        refreshTemplates(state);
        return;
      case 'd': {
        const s = activeSession(state);
        if (s && s.status === 'running') {
          state.modal = 'confirm-kill';
        }
        return;
      }
      case 'x': {
        // Dismiss completed/errored sessions
        const s = activeSession(state);
        if (s && (s.status === 'done' || s.status === 'error')) {
          state.sessions.splice(state.activeIndex, 1);
          if (state.activeIndex >= state.sessions.length && state.sessions.length > 0) {
            state.activeIndex = state.sessions.length - 1;
          }
          state.scrollOffset = -1;
        }
        return;
      }
      case 't': {
        const next = nextTheme(state.themeName);
        state.themeName = next.name;
        return;
      }
      case 'i': {
        const s = activeSession(state);
        if (s && s.status === 'waiting') {
          state.inputMode = 'chat';
          state.inputBuffer = '';
          state.focus = 'main';
        }
        return;
      }
      case 'j':
        if (state.focus === 'sidebar') navigateDown(state);
        else scrollDown(state, 1);
        return;
      case 'k':
        if (state.focus === 'sidebar') navigateUp(state);
        else scrollUp(state, 1);
        return;
      case 'G':
        state.scrollOffset = -1;
        return;
      case 'g':
        state.scrollOffset = 0;
        return;
      case '/': {
        state.modal = 'new-session';
        const session = activeSession(state);
        state.inputBuffer = session?.name ?? '';
        state.inputLabel = 'Rename session';
        return;
      }
      default:
        if (key.char >= '1' && key.char <= '9') {
          const idx = Number(key.char) - 1;
          if (idx < state.sessions.length) {
            state.activeIndex = idx;
            state.scrollOffset = -1;
          }
        }
    }
    return;
  }

  if (key.name === 'tab') {
    state.focus = state.focus === 'sidebar' ? 'main' : 'sidebar';
    return;
  }

  if (key.name === 'escape') {
    if (state.focus === 'main') {
      state.focus = 'sidebar';
    }
    return;
  }

  if (key.name === 'up') {
    if (state.focus === 'sidebar') navigateUp(state);
    else scrollUp(state, 1);
    return;
  }
  if (key.name === 'down') {
    if (state.focus === 'sidebar') navigateDown(state);
    else scrollDown(state, 1);
    return;
  }

  if (key.name === 'pageup') {
    scrollUp(state, pageSize(state));
    return;
  }
  if (key.name === 'pagedown') {
    scrollDown(state, pageSize(state));
    return;
  }
}

function handleChatInput(state: AppState, key: Key) {
  if (key.name === 'escape') {
    state.inputMode = 'none';
    state.inputBuffer = '';
    return;
  }

  if (key.name === 'enter') {
    const msg = state.inputBuffer.trim();
    if (msg) {
      const session = activeSession(state);
      if (session) {
        state.scrollOffset = -1;
        void sendFollowUp(session, msg, state.themeName, () => scheduleRender(state));
      }
    }
    state.inputMode = 'none';
    state.inputBuffer = '';
    return;
  }

  if (key.name === 'backspace') {
    state.inputBuffer = state.inputBuffer.slice(0, -1);
    return;
  }

  if (key.name === 'char' && !key.ctrl) {
    state.inputBuffer += key.char;
  }
}

function handleModal(state: AppState, key: Key) {
  switch (state.modal) {
    case 'help':
      state.modal = null;
      return;

    case 'confirm-quit':
      if (key.name === 'char' && (key.char === 'y' || key.char === 'Y')) {
        shutdown(state);
      } else {
        state.modal = null;
      }
      return;

    case 'confirm-kill':
      if (key.name === 'char' && (key.char === 'y' || key.char === 'Y')) {
        const session = activeSession(state);
        if (session) killSession(session, state.themeName);
        state.modal = null;
      } else {
        state.modal = null;
      }
      return;

    case 'new-session':
      handleNewSessionModal(state, key);
      return;

    case 'select-model':
      handleSelectModal(state, key, 'model');
      return;

    case 'select-agent':
      handleSelectModal(state, key, 'agent');
      return;

    case 'select-template':
      handleTemplateSelectModal(state, key);
      return;

    case 'dispatch-tasks':
      handleDispatchModal(state, key);
      return;
  }
}

function handleNewSessionModal(state: AppState, key: Key) {
  if (key.name === 'escape') {
    state.modal = null;
    state.inputBuffer = '';
    state.pendingBcpContext = '';
    state.pendingTemplateName = '';
    return;
  }

  // Ctrl+T opens template picker
  if (key.name === 'char' && key.ctrl && key.char === 't') {
    refreshTemplates(state);
    state.templateSelectIndex = 0;
    state.modal = 'select-template';
    return;
  }

  if (key.name === 'tab') {
    // Tab cycles model, Shift+Tab opens agent selector
    if (key.shift) {
      state.modal = 'select-agent';
      state.agentSelectIndex = 0;
    } else {
      const idx = MODELS.indexOf(state.pendingModel as typeof MODELS[number]);
      state.pendingModel = MODELS[(idx + 1) % MODELS.length]!;
    }
    return;
  }

  if (key.name === 'enter') {
    const value = state.inputBuffer.trim();
    if (!value) return;

    if (state.inputLabel === 'Rename session') {
      const session = activeSession(state);
      if (session) session.name = value;
      state.modal = null;
      state.inputBuffer = '';
      return;
    }

    // Create and launch new session
    const session = createSession({
      prompt: value,
      model: state.pendingModel,
      agent: state.pendingAgent || undefined,
      bcpContext: state.pendingBcpContext || undefined,
      templateName: state.pendingTemplateName || undefined,
    });
    state.sessions.push(session);
    state.activeIndex = state.sessions.length - 1;
    state.scrollOffset = -1;
    state.focus = 'main';
    state.modal = null;
    state.inputBuffer = '';
    state.pendingBcpContext = '';
    state.pendingTemplateName = '';
    void launchSession(session, state.themeName, () => scheduleRender(state));
    return;
  }

  if (key.name === 'backspace') {
    state.inputBuffer = state.inputBuffer.slice(0, -1);
    return;
  }

  if (key.name === 'char' && !key.ctrl) {
    state.inputBuffer += key.char;
  }
}

function handleTemplateSelectModal(state: AppState, key: Key) {
  const templates = state.templates;
  const maxIdx = templates.length - 1;

  if (key.name === 'escape') {
    state.modal = 'new-session';
    return;
  }

  if (key.name === 'up' || (key.name === 'char' && key.char === 'k')) {
    state.templateSelectIndex = Math.max(0, state.templateSelectIndex - 1);
    return;
  }

  if (key.name === 'down' || (key.name === 'char' && key.char === 'j')) {
    state.templateSelectIndex = Math.min(maxIdx, state.templateSelectIndex + 1);
    return;
  }

  if (key.name === 'enter' && templates.length > 0) {
    const tpl = templates[state.templateSelectIndex];
    if (!tpl) return;

    const details = getTemplatePromptAndModel(tpl.name);
    if (details) {
      state.inputBuffer = details.prompt;
      state.pendingModel = details.model;
      state.pendingTemplateName = tpl.name;

      // Kick off BCP context preparation in background
      void prepareBcpContextForTemplate(tpl.name).then(ctx => {
        if (ctx) state.pendingBcpContext = ctx;
        scheduleRender(state);
      });
    }

    state.modal = 'new-session';
  }
}

function handleDispatchModal(state: AppState, key: Key) {
  const templates = state.templates;
  const maxIdx = templates.length - 1;

  if (key.name === 'escape') {
    state.modal = null;
    state.dispatchSelected = new Set();
    return;
  }

  if (key.name === 'up' || (key.name === 'char' && key.char === 'k')) {
    state.dispatchSelectIndex = Math.max(0, state.dispatchSelectIndex - 1);
    return;
  }

  if (key.name === 'down' || (key.name === 'char' && key.char === 'j')) {
    state.dispatchSelectIndex = Math.min(maxIdx, state.dispatchSelectIndex + 1);
    return;
  }

  // Space toggles selection
  if (key.name === 'char' && !key.ctrl && key.char === ' ') {
    const idx = state.dispatchSelectIndex;
    if (state.dispatchSelected.has(idx)) {
      state.dispatchSelected.delete(idx);
    } else {
      state.dispatchSelected.add(idx);
    }
    return;
  }

  // Enter launches all selected templates
  if (key.name === 'enter' && state.dispatchSelected.size > 0) {
    const selectedTemplates = [...state.dispatchSelected]
      .sort((a, b) => a - b)
      .map(idx => templates[idx])
      .filter((t): t is NonNullable<typeof t> => t !== undefined);

    state.modal = null;
    state.dispatchSelected = new Set();

    for (const tpl of selectedTemplates) {
      const details = getTemplatePromptAndModel(tpl.name);
      if (!details) continue;

      const session = createSession({
        prompt: details.prompt,
        model: details.model,
        templateName: tpl.name,
      });
      state.sessions.push(session);

      // Launch with BCP context preparation
      void (async () => {
        const ctx = await prepareBcpContextForTemplate(tpl.name);
        if (ctx) session.bcpContext = ctx;
        void launchSession(session, state.themeName, () => scheduleRender(state));
      })();
    }

    if (state.sessions.length > 0) {
      state.activeIndex = state.sessions.length - 1;
      state.scrollOffset = -1;
      state.focus = 'main';
    }
    scheduleRender(state);
  }
}

function handleSelectModal(state: AppState, key: Key, kind: 'model' | 'agent') {
  // For agent selection, use previously discovered agents or a fallback list
  const items = kind === 'model'
    ? [...MODELS]
    : getAvailableAgents(state);
  const maxIdx = items.length - 1;

  if (key.name === 'escape') {
    state.modal = 'new-session';
    return;
  }

  if (key.name === 'up' || (key.name === 'char' && key.char === 'k')) {
    if (kind === 'model') {
      state.modelSelectIndex = Math.max(0, state.modelSelectIndex - 1);
    } else {
      state.agentSelectIndex = Math.max(0, state.agentSelectIndex - 1);
    }
    return;
  }

  if (key.name === 'down' || (key.name === 'char' && key.char === 'j')) {
    if (kind === 'model') {
      state.modelSelectIndex = Math.min(maxIdx, state.modelSelectIndex + 1);
    } else {
      state.agentSelectIndex = Math.min(maxIdx, state.agentSelectIndex + 1);
    }
    return;
  }

  if (key.name === 'enter') {
    if (kind === 'model') {
      state.pendingModel = MODELS[state.modelSelectIndex] ?? DEFAULT_MODEL;
    } else if (items.length > 0) {
      const selected = items[state.agentSelectIndex];
      state.pendingAgent = selected === '(none)' ? '' : (selected ?? '');
    }
    state.modal = 'new-session';
  }
}

function getAvailableAgents(state: AppState): string[] {
  // Collect agents discovered from any previous session's init event
  const discovered = new Set<string>();
  for (const session of state.sessions) {
    if (session.availableAgents) {
      for (const a of session.availableAgents) discovered.add(a);
    }
  }
  const agents = ['(none)', ...discovered];
  return agents;
}

function navigateUp(state: AppState) {
  if (state.sessions.length === 0) return;
  state.activeIndex = (state.activeIndex - 1 + state.sessions.length) % state.sessions.length;
  state.scrollOffset = -1;
}

function navigateDown(state: AppState) {
  if (state.sessions.length === 0) return;
  state.activeIndex = (state.activeIndex + 1) % state.sessions.length;
  state.scrollOffset = -1;
}

function scrollUp(state: AppState, amount: number) {
  const session = activeSession(state);
  if (!session) return;

  const innerH = contentHeight(state);
  const totalLines = session.lines.length;
  const maxScroll = Math.max(0, totalLines - innerH);

  if (state.scrollOffset < 0) {
    state.scrollOffset = maxScroll;
  }
  state.scrollOffset = Math.max(0, state.scrollOffset - amount);
}

function scrollDown(state: AppState, amount: number) {
  const session = activeSession(state);
  if (!session) return;

  const innerH = contentHeight(state);
  const totalLines = session.lines.length;
  const maxScroll = Math.max(0, totalLines - innerH);

  if (state.scrollOffset < 0) return; // already auto-scrolling

  state.scrollOffset += amount;
  if (state.scrollOffset >= maxScroll) {
    state.scrollOffset = -1; // re-engage auto-scroll
  }
}

function pageSize(state: AppState): number {
  return Math.max(1, contentHeight(state) - 2);
}

function shutdown(state: AppState) {
  state.running = false;
  for (const session of state.sessions) {
    if (session.status === 'running') {
      killSession(session, state.themeName);
    }
  }
  exitTui();
  process.exit(0);
}

export async function startTui() {
  const state = createState();

  // Load templates at startup
  refreshTemplates(state);

  enterTui();

  process.stdout.on('resize', () => scheduleRender(state));

  process.stdin.on('data', (data: Buffer) => {
    const key = parseKey(data);
    handleKey(state, key);
  });

  scheduleRender(state);

  // Keep alive + periodic re-render for elapsed time in status bar
  await new Promise<void>((resolve) => {
    const timer = setInterval(() => {
      if (!state.running) {
        clearInterval(timer);
        resolve();
        return;
      }
      if (state.sessions.some(s => s.status === 'running')) {
        scheduleRender(state);
      }
    }, 1000);
  });
}
