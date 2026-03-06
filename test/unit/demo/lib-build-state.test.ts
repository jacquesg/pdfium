import { mkdirSync, mkdtempSync, rmSync, utimesSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, test } from 'vitest';
import { getLibraryBuildState } from '../../../demo/scripts/lib-build-state.js';

const tempDirs: string[] = [];

function createTempDir(): string {
  const dir = mkdtempSync(join(tmpdir(), 'pdfium-lib-build-state-'));
  tempDirs.push(dir);
  return dir;
}

function writeTimedFile(filePath: string, mtimeMs: number): void {
  writeFileSync(filePath, 'x');
  const mtime = new Date(mtimeMs);
  utimesSync(filePath, mtime, mtime);
}

afterEach(() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (!dir) continue;
    rmSync(dir, { recursive: true, force: true });
  }
});

describe('getLibraryBuildState', () => {
  test('returns missing-dist when dist directory does not exist', () => {
    const root = createTempDir();
    const srcDir = join(root, 'src');
    mkdirSync(srcDir, { recursive: true });
    writeTimedFile(join(srcDir, 'index.ts'), 1_000);

    const state = getLibraryBuildState(srcDir, join(root, 'dist'));
    expect(state.kind).toBe('missing-dist');
  });

  test('returns empty-dist when dist exists but contains no files', () => {
    const root = createTempDir();
    const srcDir = join(root, 'src');
    const distDir = join(root, 'dist');
    mkdirSync(srcDir, { recursive: true });
    mkdirSync(distDir, { recursive: true });
    writeTimedFile(join(srcDir, 'index.ts'), 1_000);

    const state = getLibraryBuildState(srcDir, distDir);
    expect(state.kind).toBe('empty-dist');
  });

  test('returns stale when src is newer than dist', () => {
    const root = createTempDir();
    const srcDir = join(root, 'src');
    const distDir = join(root, 'dist');
    mkdirSync(srcDir, { recursive: true });
    mkdirSync(distDir, { recursive: true });
    writeTimedFile(join(distDir, 'index.js'), 1_000);
    writeTimedFile(join(srcDir, 'index.ts'), 2_000);

    const state = getLibraryBuildState(srcDir, distDir);
    expect(state.kind).toBe('stale');
  });

  test('returns fresh when dist is at least as new as src', () => {
    const root = createTempDir();
    const srcDir = join(root, 'src');
    const distDir = join(root, 'dist');
    mkdirSync(srcDir, { recursive: true });
    mkdirSync(distDir, { recursive: true });
    writeTimedFile(join(srcDir, 'index.ts'), 1_000);
    writeTimedFile(join(distDir, 'index.js'), 2_000);

    const state = getLibraryBuildState(srcDir, distDir);
    expect(state.kind).toBe('fresh');
  });
});
