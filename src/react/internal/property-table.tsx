import type { CSSProperties } from 'react';

/** A single key-value row in a property table. */
interface PropertyRow {
  label: string;
  value: string | number | boolean | undefined | null;
}

interface PropertyTableProps {
  rows: PropertyRow[];
  className?: string | undefined;
  style?: CSSProperties | undefined;
}

function formatValue(value: PropertyRow['value']) {
  if (value === undefined || value === null) {
    return <span style={{ color: 'var(--pdfium-panel-muted-colour, #9ca3af)' }}>{'\u2014'}</span>;
  }

  if (typeof value === 'boolean') {
    return value ? (
      <span
        style={{
          display: 'inline-block',
          padding: '2px 8px',
          borderRadius: '9999px',
          fontSize: '11px',
          backgroundColor: 'var(--pdfium-panel-badge-success-bg, #dcfce7)',
          color: 'var(--pdfium-panel-badge-success-colour, #166534)',
        }}
      >
        true
      </span>
    ) : (
      <span
        style={{
          display: 'inline-block',
          padding: '2px 8px',
          borderRadius: '9999px',
          fontSize: '11px',
          backgroundColor: 'var(--pdfium-panel-badge-bg, #e5e7eb)',
          color: 'var(--pdfium-panel-badge-colour, #374151)',
        }}
      >
        false
      </span>
    );
  }

  return <span>{String(value)}</span>;
}

/** Renders a list of key-value pairs as a grid-based property table. */
function PropertyTable({ rows, className, style }: PropertyTableProps) {
  return (
    <div
      className={className}
      style={{
        display: 'grid',
        gridTemplateColumns: 'auto 1fr',
        gap: '4px 12px',
        fontSize: '13px',
        color: 'var(--pdfium-panel-colour, #374151)',
        ...style,
      }}
    >
      {rows.map((row) => (
        <div key={row.label} style={{ display: 'contents' }}>
          <div
            style={{
              color: 'var(--pdfium-panel-secondary-colour, #6b7280)',
              fontWeight: 500,
              whiteSpace: 'nowrap',
              padding: '2px 0',
            }}
          >
            {row.label}
          </div>
          <div style={{ padding: '2px 0', wordBreak: 'break-word' }}>{formatValue(row.value)}</div>
        </div>
      ))}
    </div>
  );
}

export { PropertyTable };
export type { PropertyRow };
