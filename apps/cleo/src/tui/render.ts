import type { AppState, Rect } from './types';
import { MODELS } from './types';
import { getTermSize, write, truncate, pad, stripAnsi } from './terminal';
import { ansi } from './terminal';
import { statusIcon, activeSession } from './state';
import { getTheme, fg, fgbg, lerpColor, boxChars, type Theme } from './themes';
import { THEMES } from './themes';

function gradientText(text: string, gradient: [number, number, number][]): string {
  let out = '';
  for (let i = 0; i < text.length; i++) {
    if (text[i] === ' ') { out += ' '; continue; }
    const [r, g, b] = lerpColor(gradient, i / Math.max(text.length - 1, 1));
    out += `\x1b[1;38;2;${r};${g};${b}m${text[i]}\x1b[0m`;
  }
  return out;
}

function gradientBar(gradient: [number, number, number][], width: number): string {
  let out = '';
  for (let i = 0; i < width; i++) {
    const [r, g, b] = lerpColor(gradient, i / Math.max(width - 1, 1));
    out += `\x1b[38;2;${r};${g};${b}m\u2584\x1b[39m`;
  }
  return out;
}

function drawBox(theme: Theme, rect: Rect, title?: string, active?: boolean, isModal?: boolean) {
  const { x, y, w, h } = rect;
  if (w < 3 || h < 3) return;
  const bx = boxChars(theme);
  const color = active ? theme.borderActive : theme.borderInactive;
  const cStart = `\x1b[38;2;${color[0]};${color[1]};${color[2]}m`;
  const cEnd = '\x1b[39m';

  let top = bx.tl + bx.h.repeat(w - 2) + bx.tr;
  if (title) {
    const t = ` ${title} `;
    const clean = stripAnsi(t);
    const barLen = Math.max(0, w - 4 - clean.length);
    if (isModal && active) {
      // Modal title gets a tinted background
      const tbg = `\x1b[48;2;${theme.modalTitleBg[0]};${theme.modalTitleBg[1]};${theme.modalTitleBg[2]}m`;
      const titleStr = `\x1b[1;38;2;${theme.headerAccent[0]};${theme.headerAccent[1]};${theme.headerAccent[2]}m${t}\x1b[0m`;
      top = bx.tl + bx.h + tbg + titleStr + cStart + bx.h.repeat(barLen) + '\x1b[49m' + bx.tr;
    } else {
      const titleColor = active
        ? `\x1b[1;38;2;${theme.textAccent[0]};${theme.textAccent[1]};${theme.textAccent[2]}m`
        : `\x1b[38;2;${theme.text[0]};${theme.text[1]};${theme.text[2]}m`;
      top = bx.tl + bx.h + titleColor + t + '\x1b[0m' + cStart + bx.h.repeat(barLen) + bx.tr;
    }
  }
  write(ansi.cursorTo(x, y) + cStart + top + cEnd);

  for (let row = 1; row < h - 1; row++) {
    write(ansi.cursorTo(x, y + row) + cStart + bx.v + cEnd);
    write(ansi.cursorTo(x + w - 1, y + row) + cStart + bx.v + cEnd);
  }

  write(ansi.cursorTo(x, y + h - 1) + cStart + bx.bl + bx.h.repeat(w - 2) + bx.br + cEnd);
}

function fillRect(rect: Rect, bgColor: [number, number, number]) {
  const bgStr = `\x1b[48;2;${bgColor[0]};${bgColor[1]};${bgColor[2]}m`;
  for (let row = 0; row < rect.h; row++) {
    write(ansi.cursorTo(rect.x, rect.y + row) + bgStr + ' '.repeat(rect.w) + '\x1b[49m');
  }
}

function renderSelection(theme: Theme, text: string, icon: string, width: number): string {
  switch (theme.selectionStyle) {
    case 'accent': {
      const bar = fg(theme.textAccent, '\u258e');
      return bar + fgbg(theme.selectionText, theme.selection, pad(` ${stripAnsi(icon)} ${text}`, width - 1));
    }
    case 'arrow': {
      const arrow = fg(theme.textAccent, '\u25b8 ');
      return fgbg(theme.selectionText, theme.selection, ' ') + arrow + icon
        + fgbg(theme.selectionText, theme.selection, pad(` ${text}`, width - 5));
    }
    case 'block':
      return fgbg(theme.selectionText, theme.selection, pad(` ${stripAnsi(icon)} ${text}`, width));
    case 'bar':
    default:
      return fgbg(theme.selectionText, theme.selection, ' ') + icon
        + fgbg(theme.selectionText, theme.selection, pad(` ${text}`, width - 3));
  }
}

function drawSidebar(state: AppState, theme: Theme, rect: Rect) {
  const active = state.focus === 'sidebar';
  drawBox(theme, rect, 'Sessions', active);

  const innerW = rect.w - 2;
  const innerH = rect.h - 2;

  if (state.sessions.length === 0) {
    write(ansi.cursorTo(rect.x + 2, rect.y + 1) + fg(theme.textDim, 'No sessions'));
    write(ansi.cursorTo(rect.x + 2, rect.y + 3) + fg(theme.textDim, 'Press ') + fg(theme.textAccent, 'n') + fg(theme.textDim, ' to create'));
    return;
  }

  for (let i = 0; i < Math.min(state.sessions.length, innerH); i++) {
    const session = state.sessions[i]!;
    const isActive = i === state.activeIndex;
    const icon = statusIcon(session.status, theme);
    const badge = session.templateName ? fg(theme.info, 'T') + ' ' : '';
    const num = `${i + 1}`;
    const badgeWidth = session.templateName ? 2 : 0;
    const nameWidth = innerW - 6 - badgeWidth;
    const label = truncate(session.name, nameWidth);

    if (isActive) {
      const line = renderSelection(theme, `${badge}${num}. ${stripAnsi(label)}`, icon, innerW);
      write(ansi.cursorTo(rect.x + 1, rect.y + 1 + i) + line);
    } else {
      const content = ` ${icon} ${badge}${num}. ${label}`;
      write(ansi.cursorTo(rect.x + 1, rect.y + 1 + i) + pad(content, innerW));
    }
  }

  for (let i = state.sessions.length; i < innerH; i++) {
    write(ansi.cursorTo(rect.x + 1, rect.y + 1 + i) + ' '.repeat(innerW));
  }
}

function drawMainPane(state: AppState, theme: Theme, rect: Rect) {
  const active = state.focus === 'main';
  const session = activeSession(state);
  const bx = boxChars(theme);

  const title = session
    ? truncate(session.prompt, rect.w - 8)
    : 'Output';

  drawBox(theme, rect, title, active);

  const innerW = rect.w - 2;

  const showInputBar = session && (state.inputMode === 'chat' || session.status === 'waiting');
  const inputBarHeight = showInputBar ? 2 : 0;
  const innerH = rect.h - 2 - inputBarHeight;

  if (innerH < 1) return;

  if (!session) {
    const msg = 'No active session';
    write(ansi.cursorTo(rect.x + 1, rect.y + Math.floor(innerH / 2) + 1) + fg(theme.textDim, msg));
    for (let row = 0; row < innerH; row++) {
      if (row !== Math.floor(innerH / 2)) {
        write(ansi.cursorTo(rect.x + 1, rect.y + 1 + row) + ' '.repeat(innerW));
      }
    }
    return;
  }

  const displayLines = wrapLines(session.lines, innerW);
  const totalLines = displayLines.length;
  const maxScroll = Math.max(0, totalLines - innerH);

  let scrollPos: number;
  if (state.scrollOffset < 0) {
    scrollPos = maxScroll;
  } else {
    scrollPos = Math.min(state.scrollOffset, maxScroll);
  }

  for (let row = 0; row < innerH; row++) {
    const lineIdx = scrollPos + row;
    const content = lineIdx < totalLines
      ? truncate(displayLines[lineIdx]!, innerW)
      : '';
    write(ansi.cursorTo(rect.x + 1, rect.y + 1 + row) + pad(content, innerW));
  }

  // Scrollbar track + thumb on right edge
  if (totalLines > innerH && maxScroll > 0) {
    const thumbPos = maxScroll > 0 ? Math.round((scrollPos / maxScroll) * (innerH - 1)) : 0;
    for (let row = 0; row < innerH; row++) {
      const ch = row === thumbPos ? fg(theme.textAccent, '\u2588') : fg(theme.separator, '\u2502');
      write(ansi.cursorTo(rect.x + rect.w - 2, rect.y + 1 + row) + ch);
    }
    // Percentage in top-right
    const atBottom = scrollPos >= maxScroll;
    const pctStr = atBottom ? 'END' : `${Math.round((scrollPos / maxScroll) * 100)}%`;
    write(ansi.cursorTo(rect.x + rect.w - 6, rect.y) + fg(theme.textDim, pctStr));
  }

  if (showInputBar) {
    const barY = rect.y + 1 + innerH;
    const barBg = `\x1b[48;2;${theme.inputBg[0]};${theme.inputBg[1]};${theme.inputBg[2]}m`;
    const sepChar = fg(theme.separator, bx.h.repeat(innerW));
    write(ansi.cursorTo(rect.x + 1, barY) + sepChar);

    const inputY = barY + 1;
    if (state.inputMode === 'chat') {
      const prompt = fg(theme.textAccent, '\u276f ');
      const cursor = '\x1b[7m \x1b[27m';
      const inputText = state.inputBuffer + cursor;
      const line = barBg + ' ' + prompt + inputText + '\x1b[0m';
      write(ansi.cursorTo(rect.x + 1, inputY) + pad(line, innerW));
    } else {
      const hint = fg(theme.textDim, '  Press i to send a follow-up message');
      write(ansi.cursorTo(rect.x + 1, inputY) + barBg + pad(hint, innerW) + '\x1b[0m');
    }
  }
}

function wrapLines(lines: string[], width: number): string[] {
  const result: string[] = [];
  for (const line of lines) {
    const clean = stripAnsi(line);
    if (clean.length <= width) {
      result.push(line);
    } else {
      let remaining = clean;
      while (remaining.length > width) {
        result.push(remaining.slice(0, width));
        remaining = remaining.slice(width);
      }
      if (remaining.length > 0) {
        result.push(remaining);
      }
    }
  }
  return result;
}

function getDiscoveredAgents(state: AppState): string[] {
  const discovered = new Set<string>();
  for (const session of state.sessions) {
    if (session.availableAgents) {
      for (const a of session.availableAgents) discovered.add(a);
    }
  }
  return ['(none)', ...discovered];
}

function drawStatusBar(state: AppState, theme: Theme, rect: Rect) {
  const session = activeSession(state);
  const { w } = rect;
  const barBg = `\x1b[48;2;${theme.statusBarBg[0]};${theme.statusBarBg[1]};${theme.statusBarBg[2]}m`;

  let left = '';
  if (session) {
    const elapsed = session.finishedAt
      ? ((session.finishedAt - session.startedAt) / 1000).toFixed(1) + 's'
      : ((Date.now() - session.startedAt) / 1000).toFixed(0) + 's';
    left += ` ${statusIcon(session.status, theme)} `;
    left += fg(theme.text, `${state.activeIndex + 1}/${state.sessions.length} `);
    left += fg(theme.textDim, '| ') + fg(theme.text, `${session.model} `);
    if (session.agent) {
      left += fg(theme.textDim, '| ') + fg(theme.toolCall, `@${session.agent} `);
    }
    left += fg(theme.textDim, '| ') + fg(theme.text, elapsed + ' ');
    if (session.costUsd !== undefined) {
      left += fg(theme.textDim, '| ') + fg(theme.warning, `$${session.costUsd.toFixed(4)} `);
    }
    if (session.turnCount > 1) {
      left += fg(theme.textDim, '| ') + fg(theme.info, `T${session.turnCount} `);
    }
  } else {
    left = fg(theme.text, ' cleo tui');
  }

  const themeTag = fg(theme.textDim, ` [${theme.name}]`);
  const hotkeys = state.inputMode === 'chat'
    ? fg(theme.textDim, ' Enter:send  Esc:cancel ')
    : fg(theme.textDim, ' n:new  D:dispatch  i:chat  t:theme  ?:help  q:quit ');

  const leftClean = stripAnsi(left);
  const rightClean = stripAnsi(hotkeys) + stripAnsi(themeTag);
  const padding = Math.max(0, w - leftClean.length - rightClean.length);

  const bar = barBg + left + ' '.repeat(padding) + themeTag + hotkeys + '\x1b[0m';
  write(ansi.cursorTo(rect.x, rect.y) + bar);
}

function drawHeader(theme: Theme, rect: Rect) {
  const headerBg = `\x1b[48;2;${theme.headerBg[0]};${theme.headerBg[1]};${theme.headerBg[2]}m`;
  const title = gradientText('CLEO TUI', theme.gradient);
  const subtitle = fg(theme.textDim, ' \u2500 claude sessions manager');
  const line = ' ' + title + subtitle;
  write(ansi.cursorTo(rect.x, rect.y) + headerBg + pad(line, rect.w) + '\x1b[0m');
}

function drawGradientBar(theme: Theme, rect: Rect) {
  write(ansi.cursorTo(rect.x, rect.y) + gradientBar(theme.gradient, rect.w));
}

function drawHelpModal(theme: Theme, rect: Rect) {
  const w = 56;
  const h = 29;
  const x = Math.floor((rect.w - w) / 2) + rect.x;
  const y = Math.floor((rect.h - h) / 2) + rect.y;

  const modalRect: Rect = { x, y, w, h };
  fillRect(modalRect, theme.modalBg);
  drawBox(theme, modalRect, 'Hotkeys', true, true);

  const lines: [string, string][] = [
    ['n', 'New session'],
    ['  Tab', '  Cycle model in new-session modal'],
    ['  Shift+Tab', '  Select agent in new-session modal'],
    ['  Ctrl+T', '  Browse task templates'],
    ['D', 'Dispatch batch tasks (multi-select)'],
    ['R', 'Refresh task templates'],
    ['d', 'Kill running session'],
    ['x', 'Dismiss completed/errored session'],
    ['1-9', 'Jump to session by number'],
    ['j/k or \u2191/\u2193', 'Sidebar: nav sessions  Main: scroll'],
    ['Tab', 'Toggle sidebar / main focus'],
    ['PgUp/PgDn', 'Scroll output by page'],
    ['G / g', 'Scroll to bottom / top'],
    ['i', 'Send follow-up message (chat mode)'],
    ['Esc', 'Exit chat mode / cancel / sidebar'],
    ['/', 'Rename active session'],
    ['t', 'Cycle theme'],
    ['?', 'Toggle this help'],
    ['q', 'Quit (confirms if sessions running)'],
    ['Ctrl+C', 'Force quit'],
    ['', ''],
  ];

  for (let i = 0; i < lines.length; i++) {
    const [key, desc] = lines[i]!;
    const keyStr = key ? `\x1b[1m${fg(theme.textAccent, pad(key, 16))}\x1b[0m` : pad('', 16);
    const line = `  ${keyStr} ${desc}`;
    write(ansi.cursorTo(x + 1, y + 2 + i) + line);
  }

  // Theme swatches
  const swatchY = y + 2 + lines.length;
  let swatchLine = '  ' + fg(theme.textDim, 'Themes: ');
  for (const t of THEMES) {
    const isCurrent = t.name === theme.name;
    const swatches = t.swatchColors.map(c => fg(c, '\u2588')).join('');
    const label = isCurrent ? fg(theme.textAccent, `[${t.name}]`) : fg(theme.textDim, ` ${t.name} `);
    swatchLine += swatches + label + ' ';
  }
  write(ansi.cursorTo(x + 1, swatchY) + swatchLine);
}

function drawNewSessionModal(state: AppState, theme: Theme, rect: Rect) {
  const w = 60;
  const hasTemplate = !!state.pendingTemplateName;
  const h = hasTemplate ? 10 : 9;
  const x = Math.floor((rect.w - w) / 2) + rect.x;
  const y = Math.floor((rect.h - h) / 2) + rect.y;

  const modalRect: Rect = { x, y, w, h };
  fillRect(modalRect, theme.modalBg);
  drawBox(theme, modalRect, state.inputLabel || 'New Session', true, true);

  const cursor = '\x1b[7m \x1b[27m';
  const prompt = `  ${fg(theme.textAccent, '\u276f')} ${state.inputBuffer}${cursor}`;
  write(ansi.cursorTo(x + 1, y + 2) + pad(prompt, w - 4));

  const modelHint = fg(theme.textDim, '  Model: ') + fg(theme.text, state.pendingModel)
    + fg(theme.textDim, '  [Tab]');
  const agentLabel = state.pendingAgent || 'none';
  const agentHint = fg(theme.textDim, '  Agent: ') + fg(theme.text, agentLabel)
    + fg(theme.textDim, '  [Shift+Tab]');
  write(ansi.cursorTo(x + 1, y + 4) + pad(modelHint, w - 4));
  write(ansi.cursorTo(x + 1, y + 5) + pad(agentHint, w - 4));

  if (hasTemplate) {
    const tplHint = fg(theme.textDim, '  Template: ') + fg(theme.info, state.pendingTemplateName)
      + (state.pendingBcpContext ? fg(theme.success, ' +BCP') : '');
    write(ansi.cursorTo(x + 1, y + 6) + pad(tplHint, w - 4));
  }

  const ctrlTHint = fg(theme.textDim, '  [Ctrl+T] Browse templates');
  write(ansi.cursorTo(x + 1, y + h - 2) + pad(ctrlTHint, w - 4));
}

function drawSelectModal(state: AppState, theme: Theme, rect: Rect, kind: 'model' | 'agent') {
  const items = kind === 'model'
    ? [...MODELS]
    : getDiscoveredAgents(state);
  const title = kind === 'model' ? 'Select Model' : 'Select Agent';
  const selectedIdx = kind === 'model' ? state.modelSelectIndex : state.agentSelectIndex;

  const w = 44;
  const h = Math.min(items.length + 4, rect.h - 4);
  const x = Math.floor((rect.w - w) / 2) + rect.x;
  const y = Math.floor((rect.h - h) / 2) + rect.y;

  const modalRect: Rect = { x, y, w, h };
  fillRect(modalRect, theme.modalBg);
  drawBox(theme, modalRect, title, true, true);

  const visibleItems = h - 4;
  const startIdx = Math.max(0, selectedIdx - Math.floor(visibleItems / 2));

  for (let i = 0; i < visibleItems && (startIdx + i) < items.length; i++) {
    const idx = startIdx + i;
    const item = items[idx]!;
    const isSelected = idx === selectedIdx;
    const prefix = isSelected ? fg(theme.textAccent, ' \u25b6 ') : '   ';
    const text = isSelected ? fg(theme.textAccent, item) : fg(theme.text, item);
    write(ansi.cursorTo(x + 2, y + 2 + i) + prefix + pad(text, w - 8));
  }

  const hint = fg(theme.textDim, '  \u2191/\u2193:select  Enter:confirm  Esc:cancel');
  write(ansi.cursorTo(x + 1, y + h - 2) + pad(hint, w - 3));
}

function drawConfirmModal(theme: Theme, rect: Rect, message: string) {
  const w = 42;
  const h = 5;
  const x = Math.floor((rect.w - w) / 2) + rect.x;
  const y = Math.floor((rect.h - h) / 2) + rect.y;

  const modalRect: Rect = { x, y, w, h };
  fillRect(modalRect, theme.modalBg);
  drawBox(theme, modalRect, 'Confirm', true, true);

  write(ansi.cursorTo(x + 2, y + 2) + fg(theme.text, message));
  write(ansi.cursorTo(x + 2, y + 3) + fg(theme.textDim, 'y/n'));
}

function drawTemplatePickerModal(state: AppState, theme: Theme, rect: Rect) {
  const templates = state.templates;
  const w = 64;
  const h = Math.min(templates.length + 6, rect.h - 4);
  const x = Math.floor((rect.w - w) / 2) + rect.x;
  const y = Math.floor((rect.h - h) / 2) + rect.y;

  const modalRect: Rect = { x, y, w, h };
  fillRect(modalRect, theme.modalBg);
  drawBox(theme, modalRect, 'Select Template', true, true);

  if (templates.length === 0) {
    write(ansi.cursorTo(x + 2, y + 2) + fg(theme.textDim, 'No templates found'));
    write(ansi.cursorTo(x + 2, y + 3) + fg(theme.textDim, 'Add templates to .cleo/tasks/ or ~/.claude/tasks/'));
    return;
  }

  const visibleItems = h - 5;
  const startIdx = Math.max(0, state.templateSelectIndex - Math.floor(visibleItems / 2));

  for (let i = 0; i < visibleItems && (startIdx + i) < templates.length; i++) {
    const idx = startIdx + i;
    const tpl = templates[idx]!;
    const isSelected = idx === state.templateSelectIndex;
    const prefix = isSelected ? fg(theme.textAccent, ' \u25b6 ') : '   ';
    const sourceTag = tpl.source === 'global' ? fg(theme.textDim, ' [G]') : '';
    const counts: string[] = [];
    if (tpl.fileCount > 0) counts.push(`${tpl.fileCount}f`);
    if (tpl.commandCount > 0) counts.push(`${tpl.commandCount}c`);
    if (tpl.documentCount > 0) counts.push(`${tpl.documentCount}d`);
    const countStr = counts.length > 0 ? fg(theme.textDim, ` (${counts.join(',')})`) : '';
    const name = isSelected ? fg(theme.textAccent, tpl.name) : fg(theme.text, tpl.name);
    write(ansi.cursorTo(x + 2, y + 2 + i) + prefix + pad(name + countStr + sourceTag, w - 8));
  }

  const hint = fg(theme.textDim, '  \u2191/\u2193:select  Enter:use  Esc:back');
  write(ansi.cursorTo(x + 1, y + h - 2) + pad(hint, w - 3));
}

function drawDispatchModal(state: AppState, theme: Theme, rect: Rect) {
  const templates = state.templates;
  const w = 64;
  const h = Math.min(templates.length + 6, rect.h - 4);
  const x = Math.floor((rect.w - w) / 2) + rect.x;
  const y = Math.floor((rect.h - h) / 2) + rect.y;

  const modalRect: Rect = { x, y, w, h };
  fillRect(modalRect, theme.modalBg);
  drawBox(theme, modalRect, `Dispatch Tasks (${state.dispatchSelected.size} selected)`, true, true);

  if (templates.length === 0) {
    write(ansi.cursorTo(x + 2, y + 2) + fg(theme.textDim, 'No templates found'));
    return;
  }

  const visibleItems = h - 5;
  const startIdx = Math.max(0, state.dispatchSelectIndex - Math.floor(visibleItems / 2));

  for (let i = 0; i < visibleItems && (startIdx + i) < templates.length; i++) {
    const idx = startIdx + i;
    const tpl = templates[idx]!;
    const isCursor = idx === state.dispatchSelectIndex;
    const isChecked = state.dispatchSelected.has(idx);
    const checkbox = isChecked ? fg(theme.success, '[\u2714]') : fg(theme.textDim, '[ ]');
    const prefix = isCursor ? fg(theme.textAccent, ' \u25b6 ') : '   ';
    const name = isCursor ? fg(theme.textAccent, tpl.name) : fg(theme.text, tpl.name);
    const desc = truncate(tpl.description, w - 24);
    write(ansi.cursorTo(x + 2, y + 2 + i) + prefix + checkbox + ' ' + pad(name + fg(theme.textDim, ' ' + desc), w - 12));
  }

  const hint = fg(theme.textDim, '  \u2191/\u2193:nav  Space:toggle  Enter:launch  Esc:cancel');
  write(ansi.cursorTo(x + 1, y + h - 2) + pad(hint, w - 3));
}

export function render(state: AppState) {
  const { cols, rows } = getTermSize();
  const theme = getTheme(state.themeName);

  // Layout: header(1) + gradient bar(1) + content(rows-3) + statusbar(1)
  const headerRect: Rect = { x: 0, y: 0, w: cols, h: 1 };
  const gradBarRect: Rect = { x: 0, y: 1, w: cols, h: 1 };
  const statusRect: Rect = { x: 0, y: rows - 1, w: cols, h: 1 };
  const contentH = rows - 3;

  const sidebarW = Math.min(state.sidebarWidth, Math.floor(cols * 0.35));
  const sidebarRect: Rect = { x: 0, y: 2, w: sidebarW, h: contentH };
  const mainRect: Rect = { x: sidebarW, y: 2, w: cols - sidebarW, h: contentH };

  drawHeader(theme, headerRect);
  drawGradientBar(theme, gradBarRect);
  drawSidebar(state, theme, sidebarRect);
  drawMainPane(state, theme, mainRect);
  drawStatusBar(state, theme, statusRect);

  // Modals
  const fullRect: Rect = { x: 0, y: 0, w: cols, h: rows };
  if (state.modal === 'help') drawHelpModal(theme, fullRect);
  if (state.modal === 'new-session') drawNewSessionModal(state, theme, fullRect);
  if (state.modal === 'select-model') drawSelectModal(state, theme, fullRect, 'model');
  if (state.modal === 'select-agent') drawSelectModal(state, theme, fullRect, 'agent');
  if (state.modal === 'select-template') drawTemplatePickerModal(state, theme, fullRect);
  if (state.modal === 'dispatch-tasks') drawDispatchModal(state, theme, fullRect);
  if (state.modal === 'confirm-quit') drawConfirmModal(theme, fullRect, 'Quit cleo tui?');
  if (state.modal === 'confirm-kill') drawConfirmModal(theme, fullRect, 'Kill active session?');
}
