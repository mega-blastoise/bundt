/**
 * CLI Output Utilities
 *
 * Provides colorful, themed output for the loclaude CLI.
 * Uses picocolors for terminal colors.
 *
 * Color Palette:
 * - Brand/Primary: cyan - Headers, branding, info
 * - Accent: magenta - Highlights, interactive elements
 * - Success: green - Confirmations, completed tasks
 * - Warning: yellow - Cautions, non-critical issues
 * - Error: red - Failures, critical issues
 * - Dim: gray - Secondary info, hints
 */

import pc from 'picocolors';

// =============================================================================
// Brand Elements
// =============================================================================

/** Brand-colored bold text for headers and branding */
export const brand = (text: string) => pc.cyan(pc.bold(text));

/** Accent color for highlights */
export const accent = (text: string) => pc.magenta(text);

/** Bright cyan for emphasis */
export const highlight = (text: string) => pc.cyan(text);

// =============================================================================
// Status Indicators
// =============================================================================

/** Success message with checkmark */
export const success = (text: string) => `${pc.green('✓')} ${text}`;

/** Warning message with caution symbol */
export const warn = (text: string) => `${pc.yellow('⚠')} ${text}`;

/** Error message with X symbol */
export const error = (text: string) => `${pc.red('✗')} ${text}`;

/** Info message with info symbol */
export const info = (text: string) => `${pc.cyan('ℹ')} ${text}`;

// =============================================================================
// Text Formatting
// =============================================================================

/** Dimmed/muted text for secondary information */
export const dim = (text: string) => pc.dim(text);

/** Bold text for emphasis */
export const bold = (text: string) => pc.bold(text);

/** Underlined text */
export const underline = (text: string) => pc.underline(text);

/** Green colored text */
export const green = (text: string) => pc.green(text);

/** Yellow colored text */
export const yellow = (text: string) => pc.yellow(text);

/** Red colored text */
export const red = (text: string) => pc.red(text);

/** Cyan colored text */
export const cyan = (text: string) => pc.cyan(text);

/** Magenta colored text */
export const magenta = (text: string) => pc.magenta(text);

// =============================================================================
// Composite Helpers
// =============================================================================

/** Print a branded header with underline */
export function header(text: string): void {
  console.log('');
  console.log(brand(`  ${text}`));
  console.log(pc.dim('  ' + '─'.repeat(text.length + 2)));
}

/** Print a section title */
export function section(title: string): void {
  console.log('');
  console.log(pc.bold(pc.cyan(title)));
}

/** Print a labeled value */
export function labelValue(label: string, value: string): void {
  console.log(`  ${pc.dim(label + ':')} ${value}`);
}

/**
 * Format a status line with icon
 *
 * @example
 * statusLine('ok', 'Docker', 'Installed', 'v24.0.0')
 * // ✓ Docker: Installed (v24.0.0)
 */
export function statusLine(
  status: 'ok' | 'warning' | 'error',
  name: string,
  message: string,
  extra?: string
): string {
  const icons = { ok: '✓', warning: '⚠', error: '✗' };
  const colors = { ok: pc.green, warning: pc.yellow, error: pc.red };

  let line = `${colors[status](icons[status])} ${name}: ${message}`;
  if (extra) {
    line += ` ${pc.dim(`(${extra})`)}`;
  }
  return line;
}

/**
 * Print a hint/suggestion with arrow
 */
export function hint(text: string): void {
  console.log(`    ${pc.dim('→')} ${pc.dim(text)}`);
}

/**
 * Print the loclaude banner
 */
export function banner(): void {
  console.log('');
  console.log(
    `  ${pc.cyan(pc.bold('loclaude'))} ${pc.dim('─')} ${pc.dim('Run Claude Code with local Ollama')}`
  );
  console.log('');
}

/**
 * Print a spinner-style loading message
 */
export function loading(text: string): void {
  console.log(`${pc.cyan('◐')} ${text}...`);
}

/**
 * Print a completion message
 */
export function done(text: string): void {
  console.log(`${pc.green('●')} ${text}`);
}

/**
 * Print a table row with consistent formatting
 */
export function tableRow(columns: string[], widths: number[]): string {
  return columns
    .map((col, i) => {
      const width = widths[i] || col.length;
      return col.padEnd(width);
    })
    .join('  ');
}

/**
 * Print a table header with underline
 */
export function tableHeader(columns: string[], widths: number[]): void {
  const headerRow = tableRow(
    columns.map((c) => pc.bold(c)),
    widths
  );
  const underlineRow = widths.map((w) => '─'.repeat(w)).join('  ');
  console.log(headerRow);
  console.log(pc.dim(underlineRow));
}

/**
 * Format bytes with color based on size
 */
export function coloredSize(sizeStr: string): string {
  // Parse the size string to determine color
  const num = parseFloat(sizeStr);
  if (sizeStr.includes('GB') && num > 10) {
    return pc.yellow(sizeStr); // Large models in yellow
  }
  return pc.dim(sizeStr);
}

/**
 * Format a URL for display
 */
export function url(urlStr: string): string {
  return pc.underline(pc.cyan(urlStr));
}

/**
 * Format a command for display
 */
export function cmd(command: string): string {
  return pc.cyan(command);
}

/**
 * Format a file path for display
 */
export function file(filePath: string): string {
  return pc.magenta(filePath);
}

// =============================================================================
// Summary Output
// =============================================================================

/**
 * Print a success summary box
 */
export function successBox(title: string, lines: string[]): void {
  console.log('');
  console.log(`${pc.green('┌')} ${pc.green(pc.bold(title))}`);
  for (const line of lines) {
    console.log(`${pc.green('│')} ${line}`);
  }
  console.log(pc.green('└' + '─'.repeat(40)));
}

/**
 * Print an error summary box
 */
export function errorBox(title: string, lines: string[]): void {
  console.log('');
  console.log(`${pc.red('┌')} ${pc.red(pc.bold(title))}`);
  for (const line of lines) {
    console.log(`${pc.red('│')} ${line}`);
  }
  console.log(pc.red('└' + '─'.repeat(40)));
}
