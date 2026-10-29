import { CheckCircle, Circle,Clock } from 'lucide-react';

import { card, colors, font,heading } from '../styles';

interface Step {
  id: string;
  label: string;
  status: 'complete' | 'active' | 'pending';
  description?: string;
}

interface ProgressTrackerProps {
  title?: string;
  steps: Step[];
}

const statusIcons = { complete: CheckCircle, active: Clock, pending: Circle };
const statusColor = { complete: colors.green, active: colors.violet, pending: colors.text2 };

export function ProgressTracker({ title, steps }: ProgressTrackerProps) {
  const completed = steps.filter((s) => s.status === 'complete').length;
  const pct = steps.length > 0 ? Math.round((completed / steps.length) * 100) : 0;

  return (
    <div style={card}>
      {title && <div style={heading}>{title}</div>}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
        <div style={{ flex: 1, height: '6px', borderRadius: '3px', background: colors.border, overflow: 'hidden' }}>
          <div style={{ width: `${pct}%`, height: '100%', borderRadius: '3px', background: `linear-gradient(90deg, ${colors.green}, ${colors.violet})`, transition: 'width 0.4s ease' }} />
        </div>
        <span style={{ fontSize: '0.75rem', fontFamily: font.mono, color: colors.text2, flexShrink: 0 }}>{pct}%</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {steps.map((step) => {
          const Icon = statusIcons[step.status];
          const color = statusColor[step.status];
          return (
            <div key={step.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 10px', borderRadius: '6px', background: step.status === 'active' ? `${colors.violet}08` : 'transparent' }}>
              <Icon size={16} color={color} fill={step.status === 'complete' ? color : 'none'} style={{ flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.8125rem', color: step.status === 'pending' ? colors.text2 : colors.text0, fontWeight: step.status === 'active' ? 600 : 400 }}>{step.label}</div>
                {step.description && <div style={{ fontSize: '0.6875rem', color: colors.text2, marginTop: '2px' }}>{step.description}</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
