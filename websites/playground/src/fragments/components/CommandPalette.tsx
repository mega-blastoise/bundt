import { ArrowRight,Terminal } from 'lucide-react';

import { card, colors, font, heading, interactive } from '../styles';

interface Command {
  id: string;
  name: string;
  description: string;
  shortcut?: string;
  category: string;
}

interface CommandPaletteProps {
  title?: string;
  commands: Command[];
}

export function CommandPalette({ title, commands }: CommandPaletteProps) {
  const categories = [...new Set(commands.map((c) => c.category))];

  return (
    <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
      <div style={{ padding: '14px 16px', borderBottom: `1px solid ${colors.border}`, display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Terminal size={16} color={colors.violet} />
        <span style={{ ...heading, margin: 0 }}>{title ?? 'Commands'}</span>
      </div>
      {categories.map((cat) => (
        <div key={cat}>
          <div style={{ padding: '8px 16px', fontSize: '0.625rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: colors.text2, background: `${colors.bg}80` }}>
            {cat}
          </div>
          {commands.filter((c) => c.category === cat).map((cmd) => (
            <div
              key={cmd.id}
              data-prev-interaction="runCommand"
              data-prev-payload={JSON.stringify({ id: cmd.id })}
              style={{ ...interactive, display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 16px', borderBottom: `1px solid ${colors.border}20` }}
            >
              <ArrowRight size={12} color={colors.text2} style={{ flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.8125rem', fontWeight: 500, color: colors.text0 }}>{cmd.name}</div>
                <div style={{ fontSize: '0.6875rem', color: colors.text2, marginTop: '1px' }}>{cmd.description}</div>
              </div>
              {cmd.shortcut && (
                <kbd style={{ fontSize: '0.625rem', fontFamily: font.mono, padding: '2px 6px', borderRadius: '4px', background: colors.border, color: colors.text2, border: `1px solid ${colors.border}` }}>
                  {cmd.shortcut}
                </kbd>
              )}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
