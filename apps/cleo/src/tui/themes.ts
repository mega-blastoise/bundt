type RGB = [number, number, number];

export type BorderStyle = 'rounded' | 'single' | 'heavy' | 'double';
export type SelectionStyle = 'bar' | 'accent' | 'arrow' | 'block';

export interface StatusIcons {
  running: string;
  waiting: string;
  done: string;
  error: string;
}

export interface Theme {
  name: string;
  gradient: RGB[];
  headerBg: RGB;
  headerAccent: RGB;
  statusBarBg: RGB;
  panelBg: RGB;
  modalBg: RGB;
  modalTitleBg: RGB;
  borderActive: RGB;
  borderInactive: RGB;
  borderStyle: BorderStyle;
  text: RGB;
  textDim: RGB;
  textAccent: RGB;
  success: RGB;
  warning: RGB;
  error: RGB;
  info: RGB;
  selection: RGB;
  selectionText: RGB;
  selectionStyle: SelectionStyle;
  toolCall: RGB;
  userMessage: RGB;
  inputBg: RGB;
  separator: RGB;
  statusIcons: StatusIcons;
  swatchColors: RGB[];
}

const dark: Theme = {
  name: 'dark',
  gradient: [[0, 200, 220], [80, 120, 255], [180, 80, 220]],
  headerBg: [20, 20, 30],
  headerAccent: [0, 200, 220],
  statusBarBg: [30, 30, 40],
  panelBg: [0, 0, 0],
  modalBg: [15, 15, 25],
  modalTitleBg: [30, 40, 60],
  borderActive: [0, 190, 210],
  borderInactive: [60, 60, 80],
  borderStyle: 'single',
  text: [220, 220, 230],
  textDim: [100, 100, 120],
  textAccent: [0, 200, 220],
  success: [80, 200, 120],
  warning: [240, 200, 80],
  error: [240, 80, 80],
  info: [80, 160, 240],
  selection: [40, 60, 90],
  selectionText: [220, 220, 240],
  selectionStyle: 'bar',
  toolCall: [0, 200, 220],
  userMessage: [240, 200, 80],
  inputBg: [25, 25, 35],
  separator: [50, 50, 70],
  statusIcons: { running: '\u25cf', waiting: '\u25c6', done: '\u2714', error: '\u2718' },
  swatchColors: [[0, 200, 220], [80, 120, 255], [180, 80, 220], [240, 200, 80], [80, 200, 120]],
};

const catppuccin: Theme = {
  name: 'catppuccin',
  gradient: [[116, 199, 236], [137, 180, 250], [203, 166, 247]],
  headerBg: [24, 24, 37],
  headerAccent: [180, 190, 254],
  statusBarBg: [30, 30, 46],
  panelBg: [30, 30, 46],
  modalBg: [24, 24, 37],
  modalTitleBg: [49, 50, 68],
  borderActive: [137, 180, 250],
  borderInactive: [69, 71, 90],
  borderStyle: 'rounded',
  text: [205, 214, 244],
  textDim: [108, 112, 134],
  textAccent: [137, 180, 250],
  success: [166, 227, 161],
  warning: [249, 226, 175],
  error: [243, 139, 168],
  info: [116, 199, 236],
  selection: [49, 50, 68],
  selectionText: [205, 214, 244],
  selectionStyle: 'accent',
  toolCall: [148, 226, 213],
  userMessage: [245, 194, 231],
  inputBg: [24, 24, 37],
  separator: [69, 71, 90],
  statusIcons: { running: '\u25cf', waiting: '\u25c7', done: '\u2713', error: '\u00d7' },
  swatchColors: [[245, 224, 220], [203, 166, 247], [137, 180, 250], [166, 227, 161], [243, 139, 168]],
};

const gruvbox: Theme = {
  name: 'gruvbox',
  gradient: [[250, 189, 47], [215, 153, 33], [204, 36, 29]],
  headerBg: [29, 32, 33],
  headerAccent: [250, 189, 47],
  statusBarBg: [40, 40, 40],
  panelBg: [40, 40, 40],
  modalBg: [29, 32, 33],
  modalTitleBg: [60, 56, 54],
  borderActive: [215, 153, 33],
  borderInactive: [80, 73, 69],
  borderStyle: 'heavy',
  text: [235, 219, 178],
  textDim: [146, 131, 116],
  textAccent: [215, 153, 33],
  success: [152, 151, 26],
  warning: [214, 93, 14],
  error: [204, 36, 29],
  info: [69, 133, 136],
  selection: [60, 56, 54],
  selectionText: [235, 219, 178],
  selectionStyle: 'arrow',
  toolCall: [104, 157, 106],
  userMessage: [250, 189, 47],
  inputBg: [29, 32, 33],
  separator: [80, 73, 69],
  statusIcons: { running: '\u25a0', waiting: '\u25a3', done: '\u2713', error: '\u2717' },
  swatchColors: [[204, 36, 29], [215, 153, 33], [152, 151, 26], [69, 133, 136], [177, 98, 134]],
};

const nord: Theme = {
  name: 'nord',
  gradient: [[143, 188, 187], [136, 192, 208], [129, 161, 193], [94, 129, 172]],
  headerBg: [46, 52, 64],
  headerAccent: [136, 192, 208],
  statusBarBg: [59, 66, 82],
  panelBg: [46, 52, 64],
  modalBg: [59, 66, 82],
  modalTitleBg: [67, 76, 94],
  borderActive: [136, 192, 208],
  borderInactive: [76, 86, 106],
  borderStyle: 'single',
  text: [216, 222, 233],
  textDim: [76, 86, 106],
  textAccent: [136, 192, 208],
  success: [163, 190, 140],
  warning: [235, 203, 139],
  error: [191, 97, 106],
  info: [129, 161, 193],
  selection: [67, 76, 94],
  selectionText: [236, 239, 244],
  selectionStyle: 'block',
  toolCall: [143, 188, 187],
  userMessage: [208, 135, 112],
  inputBg: [59, 66, 82],
  separator: [76, 86, 106],
  statusIcons: { running: '\u25c8', waiting: '\u25c6', done: '\u2022', error: '\u2013' },
  swatchColors: [[191, 97, 106], [208, 135, 112], [235, 203, 139], [163, 190, 140], [180, 142, 173]],
};

export const THEMES = [dark, catppuccin, gruvbox, nord] as const;

export function getTheme(name: string): Theme {
  return THEMES.find(t => t.name === name) ?? dark;
}

export function nextTheme(current: string): Theme {
  const idx = THEMES.findIndex(t => t.name === current);
  return THEMES[(idx + 1) % THEMES.length]!;
}

// Border character sets
export interface BoxChars { tl: string; tr: string; bl: string; br: string; h: string; v: string }

const BOX_STYLES: Record<BorderStyle, BoxChars> = {
  rounded: { tl: '\u256d', tr: '\u256e', bl: '\u2570', br: '\u256f', h: '\u2500', v: '\u2502' },
  single:  { tl: '\u250c', tr: '\u2510', bl: '\u2514', br: '\u2518', h: '\u2500', v: '\u2502' },
  heavy:   { tl: '\u250f', tr: '\u2513', bl: '\u2517', br: '\u251b', h: '\u2501', v: '\u2503' },
  double:  { tl: '\u2554', tr: '\u2557', bl: '\u255a', br: '\u255d', h: '\u2550', v: '\u2551' },
};

export function boxChars(theme: Theme): BoxChars {
  return BOX_STYLES[theme.borderStyle];
}

// Gradient interpolation
export function lerpColor(gradient: RGB[], t: number): RGB {
  const clamped = Math.max(0, Math.min(1, t));
  const segments = gradient.length - 1;
  const segIdx = Math.min(Math.floor(clamped * segments), segments - 1);
  const segT = (clamped * segments) - segIdx;
  const a = gradient[segIdx]!;
  const b = gradient[segIdx + 1]!;
  return [
    Math.round(a[0] + (b[0] - a[0]) * segT),
    Math.round(a[1] + (b[1] - a[1]) * segT),
    Math.round(a[2] + (b[2] - a[2]) * segT),
  ];
}

// Color helpers
export function fg(color: RGB, text: string): string {
  return `\x1b[38;2;${color[0]};${color[1]};${color[2]}m${text}\x1b[39m`;
}

export function bg(color: RGB, text: string): string {
  return `\x1b[48;2;${color[0]};${color[1]};${color[2]}m${text}\x1b[49m`;
}

export function fgbg(fgColor: RGB, bgColor: RGB, text: string): string {
  return `\x1b[38;2;${fgColor[0]};${fgColor[1]};${fgColor[2]};48;2;${bgColor[0]};${bgColor[1]};${bgColor[2]}m${text}\x1b[39;49m`;
}
