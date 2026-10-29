import { Code2, Copy } from 'lucide-react';

import { card, colors, font } from '../styles';

interface CodeBlockProps {
  code: string;
  language?: string;
  title?: string;
}

export function CodeBlock({ code, language, title }: CodeBlockProps) {
  const lines = code.split('\n');

  return (
    <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
      {(title || language) && (
        <div style={{ padding: '10px 16px', borderBottom: `1px solid ${colors.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Code2 size={14} color={colors.violet} />
            {title && <span style={{ fontSize: '0.8125rem', fontWeight: 500, color: colors.text1 }}>{title}</span>}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {language && (
              <span style={{ fontSize: '0.6875rem', fontFamily: font.mono, color: colors.text2, background: colors.border, padding: '2px 8px', borderRadius: '4px' }}>
                {language}
              </span>
            )}
            <Copy size={12} color={colors.text2} style={{ cursor: 'pointer' }} />
          </div>
        </div>
      )}
      <pre style={{ padding: '16px', margin: 0, overflowX: 'auto', fontSize: '0.8125rem', fontFamily: font.mono, lineHeight: 1.7, color: colors.text1 }}>
        {lines.map((line, i) => (
          <div key={i} style={{ display: 'flex' }}>
            <span style={{ width: '36px', textAlign: 'right', paddingRight: '16px', color: colors.text2, userSelect: 'none', flexShrink: 0, opacity: 0.5 }}>
              {i + 1}
            </span>
            <span>{line || '\u200b'}</span>
          </div>
        ))}
      </pre>
    </div>
  );
}
