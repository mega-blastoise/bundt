import type { CSSProperties } from 'react';

export const colors = {
  bg: '#0a0a0f',
  card: '#111118',
  cardHover: '#16161f',
  border: '#1e1e2a',
  borderHover: '#2a2a3a',
  text0: '#f0f0f5',
  text1: '#b0b0c0',
  text2: '#6b6b80',
  violet: '#8b5cf6',
  violetDim: '#8b5cf620',
  green: '#10b981',
  greenDim: '#10b98120',
  red: '#ef4444',
  redDim: '#ef444420',
  amber: '#f59e0b',
  amberDim: '#f59e0b20',
  blue: '#3b82f6',
  blueDim: '#3b82f620',
  pink: '#ec4899',
  pinkDim: '#ec489920',
} as const;

export const font = {
  sans: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
  mono: "'JetBrains Mono', 'SF Mono', 'Fira Code', monospace",
} as const;

export const card: CSSProperties = {
  background: colors.card,
  borderRadius: '12px',
  border: `1px solid ${colors.border}`,
  padding: '20px',
  fontFamily: font.sans,
  color: colors.text0,
};

export const label: CSSProperties = {
  fontSize: '0.6875rem',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  color: colors.text2,
  marginBottom: '4px',
};

export const heading: CSSProperties = {
  fontSize: '1rem',
  fontWeight: 600,
  color: colors.text0,
  marginBottom: '16px',
  letterSpacing: '-0.01em',
};

export const muted: CSSProperties = {
  color: colors.text1,
  fontSize: '0.8125rem',
};

export const pill: CSSProperties = {
  fontSize: '0.6875rem',
  padding: '2px 8px',
  borderRadius: '9999px',
  fontWeight: 500,
  display: 'inline-flex',
  alignItems: 'center',
  gap: '4px',
};

export const interactive: CSSProperties = {
  cursor: 'pointer',
  transition: 'border-color 0.15s, background 0.15s',
};

export const trendColor = (v: number) => (v >= 0 ? colors.green : colors.red);
export const trendArrow = (v: number) => (v >= 0 ? '\u2191' : '\u2193');

export const statusColors: Record<string, string> = {
  open: colors.amber,
  'in-progress': colors.blue,
  resolved: colors.green,
  closed: colors.text2,
};

export const priorityColors: Record<string, string> = {
  critical: colors.red,
  high: colors.amber,
  medium: colors.blue,
  low: colors.text2,
};

export const severityConfig: Record<string, { bg: string; border: string; icon: string; color: string }> = {
  error: { bg: '#1a0a0a', border: '#3f1d1d', icon: '\u26A0', color: '#fca5a5' },
  warning: { bg: '#1a1506', border: '#3d2a0f', icon: '\u26A0', color: '#fcd34d' },
  info: { bg: '#0a1225', border: '#1e3a5f', icon: '\u2139', color: '#93c5fd' },
  success: { bg: '#051a0e', border: '#14532d', icon: '\u2713', color: '#86efac' },
};
