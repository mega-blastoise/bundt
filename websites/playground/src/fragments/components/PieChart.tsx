import { PieChart as PieIcon } from 'lucide-react';

import { card, colors, font,heading } from '../styles';

interface Slice {
  label: string;
  value: number;
  color: string;
}

interface PieChartProps {
  title?: string;
  slices: Slice[];
}

export function PieChart({ title, slices }: PieChartProps) {
  const total = slices.reduce((sum, s) => sum + s.value, 0) || 1;
  const size = 120;
  const cx = size / 2;
  const cy = size / 2;
  const r = 44;
  const ir = 28;
  let cumAngle = -Math.PI / 2;

  const paths = slices.map((slice) => {
    const angle = (slice.value / total) * Math.PI * 2;
    const startAngle = cumAngle;
    cumAngle += angle;
    const endAngle = cumAngle;

    const x1 = cx + r * Math.cos(startAngle);
    const y1 = cy + r * Math.sin(startAngle);
    const x2 = cx + r * Math.cos(endAngle);
    const y2 = cy + r * Math.sin(endAngle);
    const ix1 = cx + ir * Math.cos(endAngle);
    const iy1 = cy + ir * Math.sin(endAngle);
    const ix2 = cx + ir * Math.cos(startAngle);
    const iy2 = cy + ir * Math.sin(startAngle);
    const large = angle > Math.PI ? 1 : 0;

    return {
      d: `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} L ${ix1} ${iy1} A ${ir} ${ir} 0 ${large} 0 ${ix2} ${iy2} Z`,
      color: slice.color,
      label: slice.label,
    };
  });

  return (
    <div style={card}>
      {title && (
        <div style={{ ...heading, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <PieIcon size={16} color={colors.violet} />
          {title}
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
        <svg width={size} height={size} style={{ flexShrink: 0 }}>
          {paths.map((p) => (
            <path key={p.label} d={p.d} fill={p.color} opacity="0.85" />
          ))}
          <text x={cx} y={cy - 6} textAnchor="middle" fill={colors.text0} fontSize="1.125rem" fontWeight="700" fontFamily={font.sans}>
            {total.toLocaleString()}
          </text>
          <text x={cx} y={cy + 10} textAnchor="middle" fill={colors.text2} fontSize="0.5625rem" fontFamily={font.sans}>
            total
          </text>
        </svg>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {slices.map((s) => (
            <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: s.color, flexShrink: 0 }} />
              <span style={{ fontSize: '0.75rem', color: colors.text1 }}>{s.label}</span>
              <span style={{ fontSize: '0.6875rem', fontFamily: font.mono, color: colors.text2, marginLeft: 'auto' }}>
                {Math.round((s.value / total) * 100)}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
