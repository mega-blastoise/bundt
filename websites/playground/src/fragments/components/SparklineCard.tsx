import { card, colors, font,label, trendArrow, trendColor } from '../styles';

interface SparklineCardProps {
  title: string;
  value: string;
  change: number;
  sparkline: number[];
}

export function SparklineCard({ title, value, change, sparkline }: SparklineCardProps) {
  const max = Math.max(...sparkline, 1);
  const min = Math.min(...sparkline, 0);
  const range = max - min || 1;
  const height = 40;
  const width = 120;
  const step = width / Math.max(sparkline.length - 1, 1);

  const points = sparkline.map((v, i) => `${i * step},${height - ((v - min) / range) * height}`).join(' ');

  return (
    <div style={{ ...card, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <div>
        <div style={label}>{title}</div>
        <div style={{ fontSize: '1.75rem', fontWeight: 700, color: colors.text0, letterSpacing: '-0.02em', margin: '4px 0' }}>{value}</div>
        <div style={{ fontSize: '0.75rem', fontWeight: 600, color: trendColor(change), fontFamily: font.mono }}>
          {trendArrow(change)} {Math.abs(change)}%
        </div>
      </div>
      <svg width={width} height={height} style={{ flexShrink: 0, overflow: 'visible' }}>
        <defs>
          <linearGradient id={`spark-${title.replace(/\s/g, '')}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={trendColor(change)} stopOpacity="0.3" />
            <stop offset="100%" stopColor={trendColor(change)} stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon
          points={`0,${height} ${points} ${width},${height}`}
          fill={`url(#spark-${title.replace(/\s/g, '')})`}
        />
        <polyline
          points={points}
          fill="none"
          stroke={trendColor(change)}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}
