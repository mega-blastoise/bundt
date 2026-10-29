import { TrendingDown,TrendingUp } from 'lucide-react';

import { card, colors, font,label, trendColor } from '../styles';

interface Metric {
  label: string;
  value: string;
  change: number;
}

interface MetricCardProps {
  label?: string;
  valueKey?: string;
  metrics: Metric[];
}

export function MetricCard({ label: overrideLabel, valueKey, metrics }: MetricCardProps) {
  const item = valueKey
    ? metrics.find((m) => m.label.toLowerCase() === valueKey.toLowerCase())
    : metrics[0];

  if (!item) {
    return (
      <div style={card}>
        <div style={{ color: colors.text2, fontSize: '0.8125rem' }}>No data</div>
      </div>
    );
  }

  const Icon = item.change >= 0 ? TrendingUp : TrendingDown;

  return (
    <div style={card}>
      <div style={label}>{overrideLabel ?? item.label}</div>
      <div style={{ fontSize: '2.25rem', fontWeight: 700, letterSpacing: '-0.03em', color: colors.text0, lineHeight: 1.1, margin: '8px 0 12px' }}>
        {item.value}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8125rem', fontWeight: 600, color: trendColor(item.change), fontFamily: font.mono }}>
        <Icon size={14} />
        <span>{Math.abs(item.change)}%</span>
      </div>
    </div>
  );
}
