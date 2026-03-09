import { Users } from 'lucide-react';

import { card, colors, heading, interactive } from '../styles';

interface TeamMember {
  id: string;
  name: string;
  role: string;
  status: string;
  avatar?: string;
}

interface TeamGridProps {
  title?: string;
  members: TeamMember[];
}

const statusDot: Record<string, string> = {
  active: colors.green,
  away: colors.amber,
  offline: colors.text2,
};

export function TeamGrid({ title, members }: TeamGridProps) {
  return (
    <div style={card}>
      {title && (
        <div style={{ ...heading, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Users size={16} color={colors.violet} />
          {title}
        </div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '8px' }}>
        {members.map((m) => {
          const initials = m.name.split(' ').map((w) => w[0]).join('').toUpperCase();
          return (
            <div
              key={m.id}
              data-prev-interaction="selectUser"
              data-prev-payload={JSON.stringify({ userId: m.id })}
              style={{ ...interactive, padding: '14px', borderRadius: '10px', border: `1px solid ${colors.border}`, background: colors.bg, textAlign: 'center' }}
            >
              <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: `linear-gradient(135deg, ${colors.violet}, #6d28d9)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.875rem', fontWeight: 700, color: '#fff', margin: '0 auto 10px', position: 'relative' }}>
                {initials}
                <div style={{ position: 'absolute', bottom: -1, right: -1, width: '10px', height: '10px', borderRadius: '50%', background: statusDot[m.status] ?? colors.text2, border: `2px solid ${colors.bg}` }} />
              </div>
              <div style={{ fontSize: '0.8125rem', fontWeight: 500, color: colors.text0 }}>{m.name}</div>
              <div style={{ fontSize: '0.6875rem', color: colors.text2, marginTop: '2px' }}>{m.role}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
