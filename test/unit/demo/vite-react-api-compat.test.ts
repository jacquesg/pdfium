import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = process.cwd();
const DEMO_VITE_SRC = path.join(ROOT, 'demo/vite/src');
const LEGACY_HOOK = 'useSyncPDFium';

function collectSourceFiles(dir: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectSourceFiles(fullPath));
      continue;
    }
    if (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) {
      files.push(fullPath);
    }
  }
  return files;
}

describe('vite demo react api compatibility', () => {
  it('does not use removed useSyncPDFium hook', () => {
    const offenders: string[] = [];
    for (const filePath of collectSourceFiles(DEMO_VITE_SRC)) {
      const source = readFileSync(filePath, 'utf8');
      if (source.includes(LEGACY_HOOK)) {
        offenders.push(path.relative(ROOT, filePath));
      }
    }

    expect(offenders).toEqual([]);
  });
});
