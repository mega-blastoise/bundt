import { AlertTriangle, CheckCircle, Info, X } from 'lucide-react';

import { card, colors, heading, severityConfig } from '../styles';

interface Alert {
  id: string;
  severity: string;
  title: string;
  message: string;
}

interface AlertBannerProps {
  title?: string;
  alerts: Alert[];
}

const severityIcons: Record<string, typeof AlertTriangle> = {
  error: AlertTriangle,
  warning: AlertTriangle,
  info: Info,
  success: CheckCircle,
};

export function AlertBanner({ title, alerts }: AlertBannerProps) {
  return (
    <div style={{ ...card, padding: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {title && <div style={heading}>{title}</div>}
      {alerts.map((alert) => {
        const cfg = severityConfig[alert.severity] ?? severityConfig['info']!;
        const Icon = severityIcons[alert.severity] ?? Info;
        return (
          <div key={alert.id} style={{ padding: '12px 14px', borderRadius: '10px', background: cfg.bg, border: `1px solid ${cfg.border}`, display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
            <Icon size={16} color={cfg.color} style={{ flexShrink: 0, marginTop: '1px' }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: cfg.color }}>{alert.title}</div>
              <div style={{ fontSize: '0.75rem', color: cfg.color, opacity: 0.75, marginTop: '3px', lineHeight: 1.5 }}>{alert.message}</div>
            </div>
            <button
              data-prev-interaction="dismiss"
              data-prev-payload={JSON.stringify({ id: alert.id })}
              style={{ background: 'none', border: 'none', color: cfg.color, opacity: 0.4, cursor: 'pointer', padding: 0, lineHeight: 1, flexShrink: 0 }}
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
