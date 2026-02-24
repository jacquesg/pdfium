import { relative } from 'node:path';
import { describe, expect, it } from 'vitest';

const tsupConfigModule = await import('../../../tsup.config.js');

type TsupConfig = {
  entry?: string[] | Record<string, string>;
  bundle?: boolean;
  splitting?: boolean;
  clean?: boolean;
  esbuildOptions?: (opts: Record<string, unknown>) => void;
  onSuccess?: () => Promise<void>;
};

function normalizeEntries(entries: TsupConfig['entry']): string[] {
  if (!Array.isArray(entries)) {
    return [];
  }

  return entries.map((entry) => (entry.startsWith('/') ? relative(process.cwd(), entry).replaceAll('\\', '/') : entry));
}

function resolveConfigs(): TsupConfig[] {
  const exported = tsupConfigModule.default as unknown;
  const resolved =
    typeof exported === 'function'
      ? (exported as (options: { watch: boolean }) => TsupConfig | TsupConfig[])({ watch: false })
      : exported;

  return Array.isArray(resolved) ? resolved : [resolved as TsupConfig];
}

describe('tsup config', () => {
  it('uses a single preserve-modules config for runtime src entries', () => {
    const configs = resolveConfigs();
    expect(configs).toHaveLength(1);

    const config = configs[0];
    const normalizedEntries = normalizeEntries(config?.entry);
    expect(config).toBeDefined();
    expect(config?.bundle).toBe(false);
    expect(config?.splitting).toBe(false);
    expect(config?.clean).toBe(true);
    expect(normalizedEntries).toEqual(
      expect.arrayContaining(['src/index.ts', 'src/browser.ts', 'src/node.ts', 'src/react.ts']),
    );
    expect(normalizedEntries).not.toEqual(expect.arrayContaining(['src/env.d.ts']));
    expect(normalizedEntries).not.toEqual(
      expect.arrayContaining([
        'src/backend/types.ts',
        'src/context/protocol.ts',
        'src/internal/handles.ts',
        'src/internal/utility-types.ts',
      ]),
    );
    expect(normalizedEntries).not.toEqual(expect.arrayContaining(['src/core/interfaces.ts']));
    expect(typeof config?.onSuccess).toBe('function');
  });

  it('applies esbuild output hygiene options', () => {
    const configs = resolveConfigs();
    const config = configs[0];
    expect(config).toBeDefined();

    const opts: Record<string, unknown> = {};
    config?.esbuildOptions?.(opts);

    expect(opts.legalComments).toBe('none');
    expect(opts.charset).toBe('utf8');
  });
});
