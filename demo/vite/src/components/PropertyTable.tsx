import { Badge } from './ui/badge';

interface PropertyRow {
  label: string;
  value: string | number | boolean | undefined;
}

interface PropertyTableProps {
  rows: PropertyRow[];
  'aria-label'?: string;
}

function renderValue(value: string | number | boolean | undefined) {
  if (value === undefined) return <span className="text-gray-400 italic">N/A</span>;
  if (typeof value === 'boolean') {
    return <Badge variant={value ? 'green' : 'red'}>{value ? 'Yes' : 'No'}</Badge>;
  }
  return <span className="font-mono text-sm">{String(value)}</span>;
}

export function PropertyTable({ rows, 'aria-label': ariaLabel }: PropertyTableProps) {
  return (
    <table className="w-full text-sm" aria-label={ariaLabel ?? 'Property table'}>
      <tbody>
        {rows.map((row) => (
          <tr key={row.label} className="border-b border-gray-100">
            <td className="py-1.5 pr-4 text-gray-500 whitespace-nowrap">{row.label}</td>
            <td className="py-1.5">{renderValue(row.value)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
