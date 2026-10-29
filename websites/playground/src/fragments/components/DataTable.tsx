import { Table2 } from 'lucide-react';

import { card, colors, font,heading, interactive } from '../styles';

interface DataTableProps {
  title?: string;
  columns?: string[];
  rows: Array<Record<string, unknown>>;
}

export function DataTable({ title, columns, rows }: DataTableProps) {
  if (rows.length === 0) {
    return (
      <div style={card}>
        <div style={{ color: colors.text2, fontSize: '0.8125rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Table2 size={14} />
          No data
        </div>
      </div>
    );
  }

  const cols = columns ?? Object.keys(rows[0]!).filter((k) => k !== 'id');

  return (
    <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
      {title && (
        <div style={{ ...heading, padding: '16px 20px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Table2 size={16} color={colors.violet} />
          {title}
        </div>
      )}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem', fontFamily: font.sans }}>
          <thead>
            <tr>
              {cols.map((col) => (
                <th key={col} style={{ padding: '10px 16px', textAlign: 'left', fontSize: '0.6875rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: colors.text2, borderBottom: `1px solid ${colors.border}`, whiteSpace: 'nowrap' }}>
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr
                key={String(row['id'] ?? i)}
                data-prev-interaction="selectRow"
                data-prev-payload={JSON.stringify({ id: String(row['id'] ?? i) })}
                style={{ ...interactive, background: i % 2 === 0 ? 'transparent' : `${colors.bg}80`, borderBottom: `1px solid ${colors.border}20` }}
              >
                {cols.map((col) => (
                  <td key={col} style={{ padding: '10px 16px', color: colors.text1 }}>
                    {String(row[col] ?? '')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
