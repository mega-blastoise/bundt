import pc from 'picocolors';

const ART = [
  ' ┌─╮  │    ┌──  ┌─╮',
  ' │    │    ├──  │ │',
  ' └─╯  └──  └──  └─╯',
] as const;

const GRAD = [pc.cyan, pc.blue, pc.magenta] as const;

function gradLine(line: string, row: number): string {
  const n = line.length;
  return [...line].map((ch, col) => {
    if (ch === ' ') return ch;
    const t = (col / n) * 0.7 + (row / Math.max(ART.length - 1, 1)) * 0.3;
    const idx = Math.min(Math.floor(t * GRAD.length), GRAD.length - 1);
    return pc.bold(GRAD[idx]!(ch));
  }).join('');
}

export const BANNER = [
  '',
  ...ART.map((line, i) => '  ' + gradLine(line, i)),
  pc.dim('  ' + '─'.repeat(30)),
  '  ' + pc.dim('claude extensions orchestrator'),
  '',
].join('\n');

export const success = (msg: string) => console.log(pc.green('✔') + ' ' + msg);
export const error = (msg: string) => console.error(pc.red('✖') + ' ' + msg);
export const warn = (msg: string) => console.warn(pc.yellow('⚠') + ' ' + msg);
export const info = (msg: string) => console.log(pc.blue('ℹ') + ' ' + msg);

export const heading = (text: string) => pc.bold(pc.cyan(text));
export const label = (key: string, val: string) => `  ${pc.dim(key)} ${val}`;
export const sep = () => pc.dim('─'.repeat(45));
export const file = (path: string) => pc.underline(pc.cyan(path));

export function table(headers: string[], rows: string[][], colWidths?: number[]) {
  const widths = colWidths ?? headers.map((h, i) =>
    Math.max(h.length + 2, ...rows.map(r => (r[i] ?? '').length + 2))
  );
  const pad = (s: string, w: number) => s + ' '.repeat(Math.max(0, w - s.length));
  console.log(headers.map((h, i) => pc.bold(pad(h, widths[i]!))).join(''));
  console.log(pc.dim(widths.map(w => '─'.repeat(w)).join('')));
  for (const row of rows) {
    console.log(row.map((c, i) => pad(c, widths[i]!)).join(''));
  }
}

export { pc };
