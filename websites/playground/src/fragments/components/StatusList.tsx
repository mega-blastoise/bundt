import { ChevronRight,Circle } from 'lucide-react';

import { card, colors, heading, interactive, pill, priorityColors, statusColors } from '../styles';

interface StatusItem {
  id: string;
  title: string;
  status: string;
  priority: string;
}

interface StatusListProps {
  title?: string;
  items: StatusItem[];
}

export function StatusList({ title, items }: StatusListProps) {
  return (
    <div style={card}>
      <div style={heading}>{title ?? 'Items'}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {items.map((item) => {
          const statusColor = statusColors[item.status] ?? colors.text2;
          const prioColor = priorityColors[item.priority] ?? colors.text2;
          return (
            <div
              key={item.id}
              data-prev-interaction="selectItem"
              data-prev-payload={JSON.stringify({ id: item.id })}
              style={{ ...interactive, display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderRadius: '8px', border: `1px solid ${colors.border}` }}
            >
              <Circle size={8} fill={statusColor} color={statusColor} style={{ flexShrink: 0 }} />
              <div style={{ flex: 1, fontSize: '0.8125rem', color: colors.text0, lineHeight: 1.4 }}>{item.title}</div>
              <span style={{ ...pill, background: `${prioColor}15`, color: prioColor, border: `1px solid ${prioColor}30` }}>
                {item.priority}
              </span>
              <ChevronRight size={14} color={colors.text2} style={{ flexShrink: 0 }} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
