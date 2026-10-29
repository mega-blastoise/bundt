import { AlertTriangle, CheckCircle, Server, XCircle } from 'lucide-react';

import { card, colors, font,heading } from '../styles';

interface Environment {
  id: string;
  name: string;
  status: 'healthy' | 'degraded' | 'down';
  version: string;
  lastDeploy: string;
  region: string;
}

interface EnvironmentStatusProps {
  title?: string;
  environments: Environment[];
}

const envStatusConfig = {
  healthy: { color: colors.green, Icon: CheckCircle, label: 'Healthy' },
  degraded: { color: colors.amber, Icon: AlertTriangle, label: 'Degraded' },
  down: { color: colors.red, Icon: XCircle, label: 'Down' },
};

export function EnvironmentStatus({ title, environments }: EnvironmentStatusProps) {
  return (
    <div style={card}>
      {title && (
        <div style={{ ...heading, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Server size={16} color={colors.violet} />
          {title}
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {environments.map((env) => {
          const cfg = envStatusConfig[env.status];
          return (
            <div key={env.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', borderRadius: '8px', border: `1px solid ${colors.border}`, background: colors.bg }}>
              <cfg.Icon size={18} color={cfg.color} style={{ flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '0.875rem', fontWeight: 600, color: colors.text0 }}>{env.name}</span>
                  <span style={{ fontSize: '0.5625rem', fontFamily: font.mono, color: colors.text2, background: colors.border, padding: '1px 6px', borderRadius: '3px' }}>{env.region}</span>
                </div>
                <div style={{ display: 'flex', gap: '12px', marginTop: '4px' }}>
                  <span style={{ fontSize: '0.6875rem', fontFamily: font.mono, color: colors.text2 }}>v{env.version}</span>
                  <span style={{ fontSize: '0.6875rem', color: colors.text2 }}>{env.lastDeploy}</span>
                </div>
              </div>
              <span style={{ fontSize: '0.6875rem', fontWeight: 500, color: cfg.color }}>{cfg.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
