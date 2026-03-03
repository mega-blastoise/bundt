type ThemeTokens = {
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

const lightTokens: ThemeTokens = {
  bg: '#ffffff',
  bgSecondary: '#f8fafc',
  bgTertiary: '#f1f5f9',
  bgCode: '#0f172a',
  bgSidebar: '#ffffff',
  bgHover: '#f1f5f9',
  bgActive: '#ede9fe',
  bgCalloutInfo: '#eff6ff',
  bgCalloutWarn: '#fffbeb',
  bgCalloutError: '#fef2f2',
  bgCalloutTip: '#f0fdf4',
  bgCard: '#ffffff',
  text: '#0f172a',
  textSecondary: '#475569',
  textTertiary: '#94a3b8',
  textLink: '#7c3aed',
  textCode: '#e2e8f0',
  textActive: '#7c3aed',
  border: '#e2e8f0',
  borderActive: '#7c3aed',
  borderCalloutInfo: '#3b82f6',
  borderCalloutWarn: '#f59e0b',
  borderCalloutError: '#ef4444',
  borderCalloutTip: '#22c55e',
  accent: '#7c3aed',
  accentLight: '#ede9fe'
};

const darkTokens: ThemeTokens = {
  bg: '#0b0f1a',
  bgSecondary: '#111827',
  bgTertiary: '#1e293b',
  bgCode: '#0d1117',
  bgSidebar: '#0f1629',
  bgHover: '#1e293b',
  bgActive: '#1e1b4b',
  bgCalloutInfo: '#0c1929',
  bgCalloutWarn: '#1c1a05',
  bgCalloutError: '#1f0a0a',
  bgCalloutTip: '#052e16',
  bgCard: '#111827',
  text: '#f1f5f9',
  textSecondary: '#94a3b8',
  textTertiary: '#64748b',
  textLink: '#a78bfa',
  textCode: '#e2e8f0',
  textActive: '#a78bfa',
  border: '#1e293b',
  borderActive: '#a78bfa',
  borderCalloutInfo: '#3b82f6',
  borderCalloutWarn: '#f59e0b',
  borderCalloutError: '#ef4444',
  borderCalloutTip: '#22c55e',
  accent: '#a78bfa',
  accentLight: '#1e1b4b'
};

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

export function generateCssVariables(
  darkMode: 'media' | 'light' | 'dark',
  accentOverride?: string
): string {
  const light = accentOverride
    ? applyAccentOverride(lightTokens, accentOverride)
    : lightTokens;
  const dark = accentOverride
    ? applyAccentOverride(darkTokens, accentOverride)
    : darkTokens;

  const shared = `
  --void-font-sans: 'Fira Sans', -apple-system, BlinkMacSystemFont, sans-serif;
  --void-font-mono: 'JetBrains Mono', ui-monospace, monospace;

  --void-sidebar-width: 260px;
  --void-toc-width: 220px;
  --void-header-height: 60px;
  --void-content-max-width: 740px;
  --void-radius: 8px;
  --void-radius-lg: 12px;
  --void-gradient-hero: linear-gradient(135deg, #7c3aed 0%, #2563eb 100%);`;

  if (darkMode === 'light') {
    return `:root {\n${tokensToVars(light)}\n${shared}\n  color-scheme: light;\n}`;
  }

  if (darkMode === 'dark') {
    return `:root {\n${tokensToVars(dark)}\n${shared}\n  color-scheme: dark;\n}`;
  }

  return `:root {\n${tokensToVars(light)}\n${shared}\n  color-scheme: light;\n}\n\n@media (prefers-color-scheme: dark) {\n  :root {\n${tokensToVars(dark)}\n    color-scheme: dark;\n  }\n}`;
}
