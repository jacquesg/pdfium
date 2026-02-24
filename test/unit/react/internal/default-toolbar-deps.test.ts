import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = process.cwd();

function readSource(relativePath: string): string {
  return readFileSync(path.join(ROOT, relativePath), 'utf8');
}

describe('default-toolbar dependency boundaries', () => {
  it('uses pdf-viewer-context in default-toolbar internals', () => {
    const rootView = readSource('src/react/internal/default-toolbar-root-view.tsx');
    const groups = readSource('src/react/internal/default-toolbar-groups.tsx');
    const state = readSource('src/react/internal/default-toolbar-state.ts');

    expect(rootView).toContain("from '../components/pdf-viewer-context.js'");
    expect(groups).toContain("from '../components/pdf-viewer-context.js'");
    expect(state).toContain("from '../components/pdf-viewer-context.js'");
  });

  it('does not import pdf-viewer component module from default-toolbar internals', () => {
    const rootView = readSource('src/react/internal/default-toolbar-root-view.tsx');
    const groups = readSource('src/react/internal/default-toolbar-groups.tsx');
    const state = readSource('src/react/internal/default-toolbar-state.ts');

    expect(rootView).not.toContain("from '../components/pdf-viewer.js'");
    expect(groups).not.toContain("from '../components/pdf-viewer.js'");
    expect(state).not.toContain("from '../components/pdf-viewer.js'");
  });
});
