import { Activity } from 'lucide-react';

import { card, colors,heading } from '../styles';

interface ActivityEvent {
  id: string;
  action: string;
  actor: string;
  target: string;
  time: string;
}

interface ActivityFeedProps {
  title?: string;
  events: ActivityEvent[];
}

export function ActivityFeed({ title, events }: ActivityFeedProps) {
  return (
    <div style={card}>
      <div style={{ ...heading, display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Activity size={16} color={colors.violet} />
        {title ?? 'Activity'}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {events.map((ev, i) => (
          <div key={ev.id} style={{ display: 'flex', gap: '12px', paddingBottom: i < events.length - 1 ? '16px' : 0, position: 'relative' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '16px', flexShrink: 0 }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: colors.violet, marginTop: '6px', flexShrink: 0 }} />
              {i < events.length - 1 && <div style={{ width: '1px', flex: 1, background: colors.border, marginTop: '4px' }} />}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '0.8125rem', color: colors.text1, lineHeight: 1.5 }}>
                <span style={{ fontWeight: 600, color: colors.text0 }}>{ev.actor}</span>{' '}
                <span>{ev.action}</span>{' '}
                <span style={{ color: colors.text0 }}>{ev.target}</span>
              </div>
              <div style={{ fontSize: '0.6875rem', color: colors.text2, marginTop: '2px' }}>{ev.time}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
