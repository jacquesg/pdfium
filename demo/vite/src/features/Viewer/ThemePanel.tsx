import { PDFIUM_THEME_VARIABLES } from '@scaryterry/pdfium/react';
import { useMemo } from 'react';

/**
 * Theme customisation showcase — displays all CSS variables grouped by category.
 * Makes theming discoverable: developers see every knob they can turn.
 */
export function ThemePanel() {
  const groups = useMemo(() => {
    const map = new Map<string, Array<{ name: string; light: string; dark: string }>>();
    for (const [name, { light, dark, group }] of Object.entries(PDFIUM_THEME_VARIABLES)) {
      let entries = map.get(group);
      if (!entries) {
        entries = [];
        map.set(group, entries);
      }
      entries.push({ name, light, dark });
    }
    return map;
  }, []);

  return (
    <div className="space-y-4">
      <p className="text-xs text-gray-500">
        All variables use <code className="text-xs bg-gray-100 px-1 rounded">var(--pdfium-*, fallback)</code> in inline styles.
        Override any variable in your own CSS to customise the viewer.
      </p>
      {Array.from(groups.entries()).map(([group, vars]) => (
        <div key={group}>
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">{group}</h4>
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-gray-400">
                <th className="py-0.5 font-normal">Variable</th>
                <th className="py-0.5 font-normal w-20">Light</th>
                <th className="py-0.5 font-normal w-20">Dark</th>
              </tr>
            </thead>
            <tbody>
              {vars.map(({ name, light, dark }) => (
                <tr key={name} className="border-t border-gray-100">
                  <td className="py-1">
                    <button
                      type="button"
                      className="font-mono text-xs text-blue-600 hover:text-blue-800 cursor-pointer bg-transparent border-none p-0"
                      title="Copy variable name"
                      onClick={() => navigator.clipboard.writeText(name)}
                    >
                      {name}
                    </button>
                  </td>
                  <td className="py-1">
                    <span className="flex items-center gap-1">
                      {isColour(light) && <ColourSwatch value={light} />}
                      <span className="text-gray-600 truncate" title={light}>{light}</span>
                    </span>
                  </td>
                  <td className="py-1">
                    <span className="flex items-center gap-1">
                      {isColour(dark) && <ColourSwatch value={dark} />}
                      <span className="text-gray-600 truncate" title={dark}>{dark}</span>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}

function isColour(value: string): boolean {
  return /^#[0-9a-f]{3,8}$/i.test(value) || value.startsWith('rgb') || value.startsWith('hsl');
}

function ColourSwatch({ value }: { value: string }) {
  return (
    <span
      className="inline-block w-3 h-3 rounded-sm border border-gray-200 shrink-0"
      style={{ backgroundColor: value }}
    />
  );
}
