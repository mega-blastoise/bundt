export type ThemeTokens = {
  bg: string;
  bgSecondary: string;
  bgTertiary: string;
  bgCode: string;
  bgSidebar: string;
  bgHover: string;
  bgActive: string;
  bgCalloutInfo: string;
  bgCalloutWarn: string;
  bgCalloutError: string;
  bgCalloutTip: string;
  bgCard: string;
  text: string;
  textSecondary: string;
  textTertiary: string;
  textLink: string;
  textCode: string;
  textActive: string;
  border: string;
  borderActive: string;
  borderCalloutInfo: string;
  borderCalloutWarn: string;
  borderCalloutError: string;
  borderCalloutTip: string;
  accent: string;
  accentLight: string;
};

export type ThemePresetName = 'minimal' | 'catppuccin' | 'ayu' | 'nord' | 'gruvbox';

type ThemeVariants = {
  light: ThemeTokens;
  dark: ThemeTokens;
};

// ---------------------------------------------------------------------------
// Minimal — black/gray/white, mintlify-inspired
// ---------------------------------------------------------------------------
const minimal: ThemeVariants = {
  light: {
    bg: '#ffffff',
    bgSecondary: '#fafafa',
    bgTertiary: '#f4f4f5',
    bgCode: '#18181b',
    bgSidebar: '#ffffff',
    bgHover: '#f4f4f5',
    bgActive: '#f3f0ff',
    bgCalloutInfo: '#f0f9ff',
    bgCalloutWarn: '#fffbeb',
    bgCalloutError: '#fef2f2',
    bgCalloutTip: '#f0fdf4',
    bgCard: '#ffffff',
    text: '#18181b',
    textSecondary: '#52525b',
    textTertiary: '#a1a1aa',
    textLink: '#6d28d9',
    textCode: '#e4e4e7',
    textActive: '#6d28d9',
    border: '#e4e4e7',
    borderActive: '#6d28d9',
    borderCalloutInfo: '#3b82f6',
    borderCalloutWarn: '#f59e0b',
    borderCalloutError: '#ef4444',
    borderCalloutTip: '#22c55e',
    accent: '#6d28d9',
    accentLight: '#f3f0ff'
  },
  dark: {
    bg: '#09090b',
    bgSecondary: '#18181b',
    bgTertiary: '#27272a',
    bgCode: '#09090b',
    bgSidebar: '#09090b',
    bgHover: '#27272a',
    bgActive: '#1e1635',
    bgCalloutInfo: '#0c1929',
    bgCalloutWarn: '#1c1a05',
    bgCalloutError: '#1f0a0a',
    bgCalloutTip: '#052e16',
    bgCard: '#18181b',
    text: '#fafafa',
    textSecondary: '#a1a1aa',
    textTertiary: '#71717a',
    textLink: '#a78bfa',
    textCode: '#e4e4e7',
    textActive: '#a78bfa',
    border: '#27272a',
    borderActive: '#a78bfa',
    borderCalloutInfo: '#3b82f6',
    borderCalloutWarn: '#f59e0b',
    borderCalloutError: '#ef4444',
    borderCalloutTip: '#22c55e',
    accent: '#a78bfa',
    accentLight: '#1e1635'
  }
};

// ---------------------------------------------------------------------------
// Catppuccin — Latte (light) / Mocha (dark)
// ---------------------------------------------------------------------------
const catppuccin: ThemeVariants = {
  light: {
    bg: '#eff1f5',
    bgSecondary: '#e6e9ef',
    bgTertiary: '#dce0e8',
    bgCode: '#1e1e2e',
    bgSidebar: '#eff1f5',
    bgHover: '#dce0e8',
    bgActive: '#dddaf5',
    bgCalloutInfo: '#d5e5f5',
    bgCalloutWarn: '#f5e6d0',
    bgCalloutError: '#f5d5d5',
    bgCalloutTip: '#d5f0da',
    bgCard: '#e6e9ef',
    text: '#4c4f69',
    textSecondary: '#6c6f85',
    textTertiary: '#8c8fa1',
    textLink: '#8839ef',
    textCode: '#cdd6f4',
    textActive: '#8839ef',
    border: '#ccd0da',
    borderActive: '#8839ef',
    borderCalloutInfo: '#1e66f5',
    borderCalloutWarn: '#df8e1d',
    borderCalloutError: '#d20f39',
    borderCalloutTip: '#40a02b',
    accent: '#8839ef',
    accentLight: '#dddaf5'
  },
  dark: {
    bg: '#1e1e2e',
    bgSecondary: '#181825',
    bgTertiary: '#313244',
    bgCode: '#11111b',
    bgSidebar: '#181825',
    bgHover: '#313244',
    bgActive: '#2e2657',
    bgCalloutInfo: '#1b2838',
    bgCalloutWarn: '#2d2514',
    bgCalloutError: '#2d1419',
    bgCalloutTip: '#152d1a',
    bgCard: '#181825',
    text: '#cdd6f4',
    textSecondary: '#a6adc8',
    textTertiary: '#6c7086',
    textLink: '#cba6f7',
    textCode: '#cdd6f4',
    textActive: '#cba6f7',
    border: '#313244',
    borderActive: '#cba6f7',
    borderCalloutInfo: '#89b4fa',
    borderCalloutWarn: '#f9e2af',
    borderCalloutError: '#f38ba8',
    borderCalloutTip: '#a6e3a1',
    accent: '#cba6f7',
    accentLight: '#2e2657'
  }
};

// ---------------------------------------------------------------------------
// Ayu — light / dark (mirage)
// ---------------------------------------------------------------------------
const ayu: ThemeVariants = {
  light: {
    bg: '#fafafa',
    bgSecondary: '#f0f0f0',
    bgTertiary: '#e7e7e7',
    bgCode: '#0b0e14',
    bgSidebar: '#fafafa',
    bgHover: '#e7e7e7',
    bgActive: '#fff3d4',
    bgCalloutInfo: '#e0ecf5',
    bgCalloutWarn: '#f5ecd0',
    bgCalloutError: '#f5dcd0',
    bgCalloutTip: '#d4f0d8',
    bgCard: '#f0f0f0',
    text: '#575f66',
    textSecondary: '#787b80',
    textTertiary: '#acb0b5',
    textLink: '#f2ae49',
    textCode: '#bfbdb6',
    textActive: '#f2ae49',
    border: '#d8d8d8',
    borderActive: '#f2ae49',
    borderCalloutInfo: '#399ee6',
    borderCalloutWarn: '#f2ae49',
    borderCalloutError: '#f07171',
    borderCalloutTip: '#6cbf43',
    accent: '#f2ae49',
    accentLight: '#fff3d4'
  },
  dark: {
    bg: '#0b0e14',
    bgSecondary: '#0d1017',
    bgTertiary: '#1c1f27',
    bgCode: '#0b0e14',
    bgSidebar: '#0d1017',
    bgHover: '#1c1f27',
    bgActive: '#2a2216',
    bgCalloutInfo: '#111c29',
    bgCalloutWarn: '#2a2216',
    bgCalloutError: '#2a1616',
    bgCalloutTip: '#162a16',
    bgCard: '#0d1017',
    text: '#bfbdb6',
    textSecondary: '#8b8d93',
    textTertiary: '#565b66',
    textLink: '#e6b450',
    textCode: '#bfbdb6',
    textActive: '#e6b450',
    border: '#1c1f27',
    borderActive: '#e6b450',
    borderCalloutInfo: '#59c2ff',
    borderCalloutWarn: '#e6b450',
    borderCalloutError: '#d95757',
    borderCalloutTip: '#7fd962',
    accent: '#e6b450',
    accentLight: '#2a2216'
  }
};

// ---------------------------------------------------------------------------
// Nord — light (Snow Storm) / dark (Polar Night)
// ---------------------------------------------------------------------------
const nord: ThemeVariants = {
  light: {
    bg: '#eceff4',
    bgSecondary: '#e5e9f0',
    bgTertiary: '#d8dee9',
    bgCode: '#2e3440',
    bgSidebar: '#eceff4',
    bgHover: '#d8dee9',
    bgActive: '#d0dae8',
    bgCalloutInfo: '#d5e3f0',
    bgCalloutWarn: '#f0e8d0',
    bgCalloutError: '#f0d0d0',
    bgCalloutTip: '#d0f0d5',
    bgCard: '#e5e9f0',
    text: '#2e3440',
    textSecondary: '#4c566a',
    textTertiary: '#7b88a1',
    textLink: '#5e81ac',
    textCode: '#d8dee9',
    textActive: '#5e81ac',
    border: '#d8dee9',
    borderActive: '#5e81ac',
    borderCalloutInfo: '#5e81ac',
    borderCalloutWarn: '#ebcb8b',
    borderCalloutError: '#bf616a',
    borderCalloutTip: '#a3be8c',
    accent: '#5e81ac',
    accentLight: '#d0dae8'
  },
  dark: {
    bg: '#2e3440',
    bgSecondary: '#3b4252',
    bgTertiary: '#434c5e',
    bgCode: '#242933',
    bgSidebar: '#2e3440',
    bgHover: '#434c5e',
    bgActive: '#3d4f6a',
    bgCalloutInfo: '#2e3e52',
    bgCalloutWarn: '#3d3a2e',
    bgCalloutError: '#3d2e30',
    bgCalloutTip: '#2e3d30',
    bgCard: '#3b4252',
    text: '#eceff4',
    textSecondary: '#d8dee9',
    textTertiary: '#7b88a1',
    textLink: '#88c0d0',
    textCode: '#d8dee9',
    textActive: '#88c0d0',
    border: '#434c5e',
    borderActive: '#88c0d0',
    borderCalloutInfo: '#88c0d0',
    borderCalloutWarn: '#ebcb8b',
    borderCalloutError: '#bf616a',
    borderCalloutTip: '#a3be8c',
    accent: '#88c0d0',
    accentLight: '#3d4f6a'
  }
};

// ---------------------------------------------------------------------------
// Gruvbox — light / dark
// ---------------------------------------------------------------------------
const gruvbox: ThemeVariants = {
  light: {
    bg: '#fbf1c7',
    bgSecondary: '#f2e5bc',
    bgTertiary: '#ebdbb2',
    bgCode: '#282828',
    bgSidebar: '#fbf1c7',
    bgHover: '#ebdbb2',
    bgActive: '#e8d8a8',
    bgCalloutInfo: '#e0dbb8',
    bgCalloutWarn: '#f0e4a0',
    bgCalloutError: '#f0d0c0',
    bgCalloutTip: '#d5e0b0',
    bgCard: '#f2e5bc',
    text: '#3c3836',
    textSecondary: '#504945',
    textTertiary: '#928374',
    textLink: '#d65d0e',
    textCode: '#ebdbb2',
    textActive: '#d65d0e',
    border: '#d5c4a1',
    borderActive: '#d65d0e',
    borderCalloutInfo: '#458588',
    borderCalloutWarn: '#d79921',
    borderCalloutError: '#cc241d',
    borderCalloutTip: '#98971a',
    accent: '#d65d0e',
    accentLight: '#e8d8a8'
  },
  dark: {
    bg: '#282828',
    bgSecondary: '#1d2021',
    bgTertiary: '#3c3836',
    bgCode: '#1d2021',
    bgSidebar: '#1d2021',
    bgHover: '#3c3836',
    bgActive: '#4a3520',
    bgCalloutInfo: '#2a3530',
    bgCalloutWarn: '#3a3520',
    bgCalloutError: '#3a2520',
    bgCalloutTip: '#2a3520',
    bgCard: '#1d2021',
    text: '#ebdbb2',
    textSecondary: '#d5c4a1',
    textTertiary: '#928374',
    textLink: '#fe8019',
    textCode: '#ebdbb2',
    textActive: '#fe8019',
    border: '#3c3836',
    borderActive: '#fe8019',
    borderCalloutInfo: '#83a598',
    borderCalloutWarn: '#fabd2f',
    borderCalloutError: '#fb4934',
    borderCalloutTip: '#b8bb26',
    accent: '#fe8019',
    accentLight: '#4a3520'
  }
};

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------
const presets: Record<ThemePresetName, ThemeVariants> = {
  minimal,
  catppuccin,
  ayu,
  nord,
  gruvbox
};

export function getPreset(name: ThemePresetName): ThemeVariants {
  return presets[name];
}

export function getPresetNames(): ThemePresetName[] {
  return Object.keys(presets) as ThemePresetName[];
}

// ---------------------------------------------------------------------------
// CSS variable generation
// ---------------------------------------------------------------------------
function tokensToVars(tokens: ThemeTokens): string {
  return `  --void-bg: ${tokens.bg};
  --void-bg-secondary: ${tokens.bgSecondary};
  --void-bg-tertiary: ${tokens.bgTertiary};
  --void-bg-code: ${tokens.bgCode};
  --void-bg-sidebar: ${tokens.bgSidebar};
  --void-bg-hover: ${tokens.bgHover};
  --void-bg-active: ${tokens.bgActive};
  --void-bg-callout-info: ${tokens.bgCalloutInfo};
  --void-bg-callout-warn: ${tokens.bgCalloutWarn};
  --void-bg-callout-error: ${tokens.bgCalloutError};
  --void-bg-callout-tip: ${tokens.bgCalloutTip};
  --void-bg-card: ${tokens.bgCard};

  --void-text: ${tokens.text};
  --void-text-secondary: ${tokens.textSecondary};
  --void-text-tertiary: ${tokens.textTertiary};
  --void-text-link: ${tokens.textLink};
  --void-text-code: ${tokens.textCode};
  --void-text-active: ${tokens.textActive};

  --void-border: ${tokens.border};
  --void-border-active: ${tokens.borderActive};
  --void-border-callout-info: ${tokens.borderCalloutInfo};
  --void-border-callout-warn: ${tokens.borderCalloutWarn};
  --void-border-callout-error: ${tokens.borderCalloutError};
  --void-border-callout-tip: ${tokens.borderCalloutTip};

  --void-accent: ${tokens.accent};
  --void-accent-light: ${tokens.accentLight};`;
}

function applyAccentOverride(tokens: ThemeTokens, accent: string): ThemeTokens {
  return {
    ...tokens,
    accent,
    textLink: accent,
    textActive: accent,
    borderActive: accent
  };
}

function applyTokenOverrides(
  tokens: ThemeTokens,
  overrides: Partial<ThemeTokens>
): ThemeTokens {
  return { ...tokens, ...overrides };
}

export type GenerateCssOptions = {
  preset?: ThemePresetName;
  darkMode: 'media' | 'light' | 'dark';
  accentColor?: string;
  overrides?: {
    light?: Partial<ThemeTokens>;
    dark?: Partial<ThemeTokens>;
  };
};

export function generateCssVariables(opts: GenerateCssOptions): string {
  const { preset: presetName = 'minimal', darkMode, accentColor, overrides } = opts;
  const theme = presets[presetName];

  let light = theme.light;
  let dark = theme.dark;

  if (overrides?.light) light = applyTokenOverrides(light, overrides.light);
  if (overrides?.dark) dark = applyTokenOverrides(dark, overrides.dark);

  if (accentColor) {
    light = applyAccentOverride(light, accentColor);
    dark = applyAccentOverride(dark, accentColor);
  }

  const shared = `
  --void-font-sans: 'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif;
  --void-font-mono: 'JetBrains Mono', ui-monospace, monospace;

  --void-sidebar-width: 260px;
  --void-toc-width: 220px;
  --void-header-height: 60px;
  --void-content-max-width: 740px;
  --void-radius: 8px;
  --void-radius-lg: 12px;
  --void-gradient-hero: linear-gradient(135deg, ${light.accent} 0%, ${light.textLink} 100%);`;

  if (darkMode === 'light') {
    return `:root {\n${tokensToVars(light)}\n${shared}\n  color-scheme: light;\n}`;
  }

  if (darkMode === 'dark') {
    return `:root {\n${tokensToVars(dark)}\n${shared}\n  color-scheme: dark;\n}`;
  }

  return `:root {\n${tokensToVars(light)}\n${shared}\n  color-scheme: light;\n}\n\n@media (prefers-color-scheme: dark) {\n  :root {\n${tokensToVars(dark)}\n    color-scheme: dark;\n  }\n}`;
}
