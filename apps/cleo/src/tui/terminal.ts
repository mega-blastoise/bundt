const ESC = '\x1b';
const CSI = `${ESC}[`;

export const ansi = {
  altScreenOn: `${CSI}?1049h`,
  altScreenOff: `${CSI}?1049l`,
  cursorHide: `${CSI}?25l`,
  cursorShow: `${CSI}?25h`,
  cursorTo: (x: number, y: number) => `${CSI}${y + 1};${x + 1}H`,
  clearScreen: `${CSI}2J`,
  clearLine: `${CSI}2K`,
  bold: (s: string) => `${CSI}1m${s}${CSI}0m`,
  dim: (s: string) => `${CSI}2m${s}${CSI}0m`,
  italic: (s: string) => `${CSI}3m${s}${CSI}0m`,
  underline: (s: string) => `${CSI}4m${s}${CSI}0m`,
  inverse: (s: string) => `${CSI}7m${s}${CSI}0m`,
  reset: `${CSI}0m`,
  fg: {
    black: (s: string) => `${CSI}30m${s}${CSI}39m`,
    red: (s: string) => `${CSI}31m${s}${CSI}39m`,
    green: (s: string) => `${CSI}32m${s}${CSI}39m`,
    yellow: (s: string) => `${CSI}33m${s}${CSI}39m`,
    blue: (s: string) => `${CSI}34m${s}${CSI}39m`,
    magenta: (s: string) => `${CSI}35m${s}${CSI}39m`,
    cyan: (s: string) => `${CSI}36m${s}${CSI}39m`,
    white: (s: string) => `${CSI}37m${s}${CSI}39m`,
    gray: (s: string) => `${CSI}90m${s}${CSI}39m`,
  },
  bg: {
    black: (s: string) => `${CSI}40m${s}${CSI}49m`,
    red: (s: string) => `${CSI}41m${s}${CSI}49m`,
    green: (s: string) => `${CSI}42m${s}${CSI}49m`,
    yellow: (s: string) => `${CSI}43m${s}${CSI}49m`,
    blue: (s: string) => `${CSI}44m${s}${CSI}49m`,
    magenta: (s: string) => `${CSI}45m${s}${CSI}49m`,
    cyan: (s: string) => `${CSI}46m${s}${CSI}49m`,
    white: (s: string) => `${CSI}47m${s}${CSI}49m`,
  },
  rgb: (r: number, g: number, b: number, s: string) =>
    `${CSI}38;2;${r};${g};${b}m${s}${CSI}39m`,
  bgRgb: (r: number, g: number, b: number, s: string) =>
    `${CSI}48;2;${r};${g};${b}m${s}${CSI}39;49m`,
} as const;

export const box = {
  tl: '\u250c', tr: '\u2510', bl: '\u2514', br: '\u2518',
  h: '\u2500', v: '\u2502',
  tee: '\u252c', btee: '\u2534', ltee: '\u251c', rtee: '\u2524',
  cross: '\u253c',
  // Heavy variants
  htl: '\u250f', htr: '\u2513', hbl: '\u2517', hbr: '\u251b',
  hh: '\u2501', hv: '\u2503',
  // Rounded
  rtl: '\u256d', rtr: '\u256e', rbl: '\u2570', rbr: '\u256f',
} as const;

export function getTermSize(): { cols: number; rows: number } {
  return {
    cols: process.stdout.columns || 80,
    rows: process.stdout.rows || 24,
  };
}

export function write(s: string) {
  process.stdout.write(s);
}

export function isTty(): boolean {
  return process.stdin.isTTY === true && process.stdout.isTTY === true;
}

export function enterTui() {
  if (!isTty()) {
    throw new Error('cleo tui requires an interactive terminal (TTY)');
  }
  process.stdin.setRawMode(true);
  process.stdin.resume();
  write(ansi.altScreenOn + ansi.cursorHide + ansi.clearScreen);
}

export function exitTui() {
  write(ansi.cursorShow + ansi.altScreenOff + ansi.reset);
  if (process.stdin.isTTY) {
    process.stdin.setRawMode(false);
  }
  process.stdin.pause();
}

export function stripAnsi(s: string): string {
  return s.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '');
}

export function truncate(s: string, maxWidth: number): string {
  const clean = stripAnsi(s);
  if (clean.length <= maxWidth) return s;
  // For strings with ANSI, we need to be careful
  // Simple approach: strip, truncate, re-apply isn't worth it for MVP
  // Just truncate the clean version
  return clean.slice(0, maxWidth - 1) + '\u2026';
}

export function pad(s: string, width: number): string {
  const clean = stripAnsi(s);
  const diff = width - clean.length;
  if (diff <= 0) return truncate(s, width);
  return s + ' '.repeat(diff);
}
