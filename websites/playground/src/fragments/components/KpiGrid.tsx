import { LayoutGrid,TrendingDown, TrendingUp } from 'lucide-react';

import { card, colors, font,heading, label, trendColor } from '../styles';

interface Metric {
  label: string;
  value: string;
  change: number;
}

interface KpiGridProps {
  title?: string;
  metrics: Metric[];
}

export function KpiGrid({ title, metrics }: KpiGridProps) {
  return (
    <div style={card}>
      {title && (
        <div style={{ ...heading, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <LayoutGrid size={16} color={colors.violet} />
          {title}
        </div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px' }}>
        {metrics.map((m) => {
          const Icon = m.change >= 0 ? TrendingUp : TrendingDown;
          return (
            <div key={m.label} style={{ padding: '16px', borderRadius: '10px', border: `1px solid ${colors.border}`, background: colors.bg, textAlign: 'center' }}>
              <div style={label}>{m.label}</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: colors.text0, margin: '6px 0', letterSpacing: '-0.02em' }}>{m.value}</div>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: trendColor(m.change), display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', fontFamily: font.mono }}>
                <Icon size={12} />
                {Math.abs(m.change)}%
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
