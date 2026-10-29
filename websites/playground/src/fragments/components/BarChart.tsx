import { BarChart3 } from 'lucide-react';

import { card, colors, font,heading, interactive } from '../styles';

interface BarChartProps {
  title?: string;
  series: Array<{ label: string; value: number }>;
}

export function BarChart({ title, series }: BarChartProps) {
  const max = Math.max(...series.map((d) => d.value), 1);

  return (
    <div style={card}>
      {title && (
        <div style={{ ...heading, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <BarChart3 size={16} color={colors.violet} />
          {title}
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {series.map((item) => (
          <div
            key={item.label}
            data-prev-interaction="selectBar"
            data-prev-payload={JSON.stringify({ label: item.label, value: item.value })}
            style={{ ...interactive, display: 'flex', alignItems: 'center', gap: '12px' }}
          >
            <div style={{ width: '40px', fontSize: '0.6875rem', color: colors.text2, textAlign: 'right', flexShrink: 0, fontFamily: font.mono }}>
              {item.label}
            </div>
            <div style={{ flex: 1, height: '28px', background: colors.border, borderRadius: '6px', overflow: 'hidden', position: 'relative' }}>
              <div style={{
                width: `${(item.value / max) * 100}%`,
                height: '100%',
                background: `linear-gradient(90deg, ${colors.violet}, #a78bfa)`,
                borderRadius: '6px',
                transition: 'width 0.4s ease',
                minWidth: '2px',
              }} />
            </div>
            <div style={{ width: '56px', fontSize: '0.75rem', color: colors.text1, fontFamily: font.mono, textAlign: 'right', flexShrink: 0 }}>
              {item.value.toLocaleString()}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
