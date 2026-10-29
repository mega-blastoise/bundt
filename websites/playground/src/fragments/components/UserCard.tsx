import { Mail, MapPin } from 'lucide-react';

import { card, colors, font,pill } from '../styles';

interface User {
  id: string;
  name: string;
  role: string;
  email: string;
  status: string;
}

interface UserCardProps {
  userId?: string;
  users: User[];
}

export function UserCard({ userId, users }: UserCardProps) {
  const user = userId ? users.find((u) => u.id === userId) : users[0];

  if (!user) {
    return (
      <div style={card}>
        <div style={{ color: colors.text2, fontSize: '0.8125rem' }}>No user selected</div>
      </div>
    );
  }

  const initials = user.name.split(' ').map((w) => w[0]).join('').toUpperCase();
  const isActive = user.status === 'active';

  return (
    <div style={card}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '20px' }}>
        <div style={{ width: '52px', height: '52px', borderRadius: '14px', background: `linear-gradient(135deg, ${colors.violet}, #6d28d9)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.125rem', fontWeight: 700, color: '#fff', flexShrink: 0, position: 'relative' }}>
          {initials}
          <div style={{ position: 'absolute', bottom: -2, right: -2, width: '14px', height: '14px', borderRadius: '50%', background: isActive ? colors.green : colors.text2, border: `2px solid ${colors.card}` }} />
        </div>
        <div>
          <div style={{ fontSize: '1rem', fontWeight: 600, color: colors.text0 }}>{user.name}</div>
          <div style={{ fontSize: '0.8125rem', color: colors.text2 }}>{user.role}</div>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '14px', borderRadius: '8px', background: colors.bg }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.8125rem' }}>
          <Mail size={14} color={colors.text2} />
          <span style={{ color: colors.text1, fontFamily: font.mono, fontSize: '0.75rem' }}>{user.email}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.8125rem' }}>
          <MapPin size={14} color={colors.text2} />
          <span style={{ ...pill, background: isActive ? colors.greenDim : `${colors.text2}20`, color: isActive ? colors.green : colors.text2 }}>
            {user.status}
          </span>
        </div>
      </div>
    </div>
  );
}
