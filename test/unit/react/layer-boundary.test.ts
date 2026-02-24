import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const WRAPPER_FILES = [
  'src/react/components/activity-bar.tsx',
  'src/react/components/bookmark-panel.tsx',
  'src/react/components/default-toolbar.tsx',
  'src/react/components/pdf-document-view.tsx',
  'src/react/components/search-panel.tsx',
  'src/react/components/thumbnail-strip.tsx',
  'src/react/components/panels/forms-panel.tsx',
  'src/react/components/panels/links-panel.tsx',
  'src/react/components/panels/objects-panel.tsx',
  'src/react/components/panels/text-panel.tsx',
  'src/react/components/panels/annotations-panel.tsx',
  'src/react/components/panels/structure-panel.tsx',
];

const WRAPPER_MODULE_PATH_SUFFIXES = [
  '/components/activity-bar.js',
  '/components/bookmark-panel.js',
  '/components/default-toolbar.js',
  '/components/pdf-document-view.js',
  '/components/search-panel.js',
  '/components/thumbnail-strip.js',
];
const ASYNC_EFFECT_PATTERN = /use(?:Layout)?Effect\s*\(\s*async\s*\(/u;
const MANUAL_CLASS_JOIN_PATTERN = /filter\s*\(\s*Boolean\s*\)\s*\.join\s*\(\s*['"]\s+['"]\s*\)/u;
const MERGE_ORDER_PATTERN = /mergeClassNames\(\s*classNames\?\.\w+\s*,\s*className\s*\)/u;

function collectSourceFiles(root: string): string[] {
  const entries = readdirSync(root, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = join(root, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectSourceFiles(fullPath));
      continue;
    }
    if (entry.isFile() && (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx'))) {
      files.push(fullPath);
    }
  }

  return files;
}

describe('react layer boundaries', () => {
  it('component wrappers do not import hooks or model/pipeline modules directly', () => {
    for (const file of WRAPPER_FILES) {
      const source = readFileSync(file, 'utf8');
      expect(source).not.toContain("from '../hooks/");
      expect(source).not.toContain("from '../../hooks/");
      expect(source).not.toContain('-model');
      expect(source).not.toContain('-pipeline');
    }
  });

  it('internal/hooks code does not import public wrapper modules', () => {
    const files = [...collectSourceFiles('src/react/internal'), ...collectSourceFiles('src/react/hooks')];
    for (const file of files) {
      const source = readFileSync(file, 'utf8');
      for (const wrapperSuffix of WRAPPER_MODULE_PATH_SUFFIXES) {
        expect(source).not.toContain(wrapperSuffix);
      }
    }
  });

  it('public react index does not export internal root-view modules directly', () => {
    const source = readFileSync('src/react/index.ts', 'utf8');
    expect(source).not.toContain('-root-view');
    expect(source).not.toContain('/internal/activity-bar-root-view');
    expect(source).not.toContain('/internal/bookmark-panel-root-view');
    expect(source).not.toContain('/internal/default-toolbar-root-view');
    expect(source).not.toContain('/internal/pdf-document-view-root');
    expect(source).not.toContain('/internal/search-panel-view');
    expect(source).not.toContain('/internal/thumbnail-strip-root-view');
  });

  it('react source does not use async effect callbacks directly', () => {
    const files = [
      ...collectSourceFiles('src/react/components'),
      ...collectSourceFiles('src/react/hooks'),
      ...collectSourceFiles('src/react/internal'),
    ];
    for (const file of files) {
      const source = readFileSync(file, 'utf8');
      expect(source).not.toMatch(ASYNC_EFFECT_PATTERN);
    }
  });

  it('react source centralizes class token merging through mergeClassNames', () => {
    const files = [...collectSourceFiles('src/react/components'), ...collectSourceFiles('src/react/internal')];
    for (const file of files) {
      if (file.endsWith('src/react/internal/component-api.ts')) continue;
      const source = readFileSync(file, 'utf8');
      expect(source).not.toMatch(MANUAL_CLASS_JOIN_PATTERN);
    }
  });

  it('mergeClassNames keeps className before classNames slot overrides', () => {
    const files = [...collectSourceFiles('src/react/components'), ...collectSourceFiles('src/react/internal')];
    for (const file of files) {
      const source = readFileSync(file, 'utf8');
      expect(source).not.toMatch(MERGE_ORDER_PATTERN);
    }
  });
});
