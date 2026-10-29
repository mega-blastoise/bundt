import { ScrollText } from 'lucide-react';

import { card, colors, font } from '../styles';

interface LogEntry {
  id: string;
  timestamp: string;
  level: string;
  message: string;
  source?: string;
}

interface LogViewerProps {
  title?: string;
  entries: LogEntry[];
}

const levelColors: Record<string, string> = {
  error: colors.red,
  warn: colors.amber,
  info: colors.blue,
  debug: colors.text2,
};

export function LogViewer({ title, entries }: LogViewerProps) {
  return (
    <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
      <div style={{ padding: '10px 16px', borderBottom: `1px solid ${colors.border}`, display: 'flex', alignItems: 'center', gap: '8px' }}>
        <ScrollText size={14} color={colors.violet} />
        <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: colors.text0 }}>{title ?? 'Logs'}</span>
        <span style={{ fontSize: '0.625rem', fontFamily: font.mono, color: colors.text2, marginLeft: 'auto' }}>{entries.length} entries</span>
      </div>
      <div style={{ maxHeight: '320px', overflowY: 'auto', fontFamily: font.mono, fontSize: '0.75rem', lineHeight: 1.7 }}>
        {entries.map((entry) => {
          const color = levelColors[entry.level] ?? colors.text2;
          return (
            <div key={entry.id} style={{ display: 'flex', padding: '3px 16px', borderBottom: `1px solid ${colors.border}10`, gap: '12px' }}>
              <span style={{ color: colors.text2, opacity: 0.5, flexShrink: 0, fontSize: '0.6875rem' }}>{entry.timestamp}</span>
              <span style={{ color, fontWeight: 600, width: '40px', flexShrink: 0, textTransform: 'uppercase', fontSize: '0.625rem', paddingTop: '2px' }}>{entry.level}</span>
              {entry.source && <span style={{ color: colors.violet, opacity: 0.6, flexShrink: 0, fontSize: '0.6875rem' }}>[{entry.source}]</span>}
              <span style={{ color: colors.text1 }}>{entry.message}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
