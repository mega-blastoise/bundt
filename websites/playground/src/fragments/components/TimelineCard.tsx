import { Calendar, GitCommit } from 'lucide-react';

import { card, colors, font,heading } from '../styles';

interface TimelineEvent {
  id: string;
  date: string;
  title: string;
  description: string;
  type: string;
}

interface TimelineCardProps {
  title?: string;
  events: TimelineEvent[];
}

const typeColors: Record<string, string> = {
  release: colors.green,
  feature: colors.violet,
  bugfix: colors.red,
  deploy: colors.blue,
  milestone: colors.amber,
};

export function TimelineCard({ title, events }: TimelineCardProps) {
  return (
    <div style={card}>
      {title && (
        <div style={{ ...heading, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Calendar size={16} color={colors.violet} />
          {title}
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {events.map((ev, i) => {
          const color = typeColors[ev.type] ?? colors.violet;
          return (
            <div key={ev.id} style={{ display: 'flex', gap: '12px', paddingBottom: i < events.length - 1 ? '14px' : 0 }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '20px', flexShrink: 0 }}>
                <GitCommit size={14} color={color} style={{ marginTop: '3px', flexShrink: 0 }} />
                {i < events.length - 1 && <div style={{ width: '1px', flex: 1, background: colors.border, marginTop: '4px' }} />}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                  <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: colors.text0 }}>{ev.title}</span>
                  <span style={{ fontSize: '0.5625rem', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', padding: '1px 6px', borderRadius: '3px', background: `${color}15`, color, border: `1px solid ${color}25` }}>
                    {ev.type}
                  </span>
                </div>
                <div style={{ fontSize: '0.75rem', color: colors.text2, lineHeight: 1.5 }}>{ev.description}</div>
                <div style={{ fontSize: '0.625rem', fontFamily: font.mono, color: colors.text2, marginTop: '4px', opacity: 0.7 }}>{ev.date}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
