import { FileText } from 'lucide-react';

import { card, colors,heading } from '../styles';

interface MarkdownBlockProps {
  content: string;
  title?: string;
}

export function MarkdownBlock({ content, title }: MarkdownBlockProps) {
  const text = content ?? '';
  const lines = text.split('\n');

  const rendered = lines.map((line, i) => {
    if (line.startsWith('# ')) return <h1 key={i} style={{ fontSize: '1.5rem', fontWeight: 700, color: colors.text0, marginBottom: '8px' }}>{line.slice(2)}</h1>;
    if (line.startsWith('## ')) return <h2 key={i} style={{ fontSize: '1.125rem', fontWeight: 600, color: colors.text0, marginTop: '16px', marginBottom: '8px' }}>{line.slice(3)}</h2>;
    if (line.startsWith('### ')) return <h3 key={i} style={{ fontSize: '0.9375rem', fontWeight: 600, color: colors.text1, marginTop: '12px', marginBottom: '6px' }}>{line.slice(4)}</h3>;
    if (line.startsWith('- ')) return <li key={i} style={{ color: colors.text1, fontSize: '0.875rem', lineHeight: 1.7, marginLeft: '16px', listStyle: 'none' }}><span style={{ color: colors.violet, marginRight: '8px' }}>&bull;</span>{line.slice(2)}</li>;
    if (line.startsWith('> ')) return <blockquote key={i} style={{ borderLeft: `3px solid ${colors.violet}`, paddingLeft: '12px', color: colors.text2, fontSize: '0.875rem', fontStyle: 'italic', margin: '8px 0' }}>{line.slice(2)}</blockquote>;
    if (line.trim() === '') return <br key={i} />;
    return <p key={i} style={{ color: colors.text1, fontSize: '0.875rem', lineHeight: 1.7, marginBottom: '4px' }}>{line}</p>;
  });

  return (
    <div style={card}>
      {title && (
        <div style={{ ...heading, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FileText size={16} color={colors.violet} />
          {title}
        </div>
      )}
      <div>{rendered}</div>
    </div>
  );
}
