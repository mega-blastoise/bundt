import { Tags } from 'lucide-react';

import { card, colors, font,heading } from '../styles';

interface Tag {
  label: string;
  count: number;
  color?: string;
}

interface TagCloudProps {
  title?: string;
  tags: Tag[];
}

export function TagCloud({ title, tags }: TagCloudProps) {
  const maxCount = Math.max(...tags.map((t) => t.count), 1);

  return (
    <div style={card}>
      {title && (
        <div style={{ ...heading, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Tags size={16} color={colors.violet} />
          {title}
        </div>
      )}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
        {tags.map((tag) => {
          const intensity = 0.3 + (tag.count / maxCount) * 0.7;
          const tagColor = tag.color ?? colors.violet;
          return (
            <div
              key={tag.label}
              data-prev-interaction="selectTag"
              data-prev-payload={JSON.stringify({ label: tag.label })}
              style={{
                padding: '6px 12px',
                borderRadius: '8px',
                background: `${tagColor}${Math.round(intensity * 25).toString(16).padStart(2, '0')}`,
                border: `1px solid ${tagColor}${Math.round(intensity * 40).toString(16).padStart(2, '0')}`,
                color: tagColor,
                fontSize: `${0.6875 + (tag.count / maxCount) * 0.25}rem`,
                fontWeight: tag.count / maxCount > 0.5 ? 600 : 400,
                fontFamily: font.mono,
                cursor: 'pointer',
                transition: 'transform 0.15s',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              {tag.label}
              <span style={{ fontSize: '0.625rem', opacity: 0.6 }}>{tag.count}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
