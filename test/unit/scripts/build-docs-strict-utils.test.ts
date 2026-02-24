import { existsSync } from 'node:fs';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, test } from 'vitest';
import { clearDocsAstroCache, hasWarningOutput } from '../../../scripts/build-docs-strict-utils.js';

const tempRoots: string[] = [];

afterEach(async () => {
  await Promise.all(
    tempRoots.splice(0).map(async (root) => {
      await rm(root, { recursive: true, force: true });
    }),
  );
});

describe('build-docs-strict utils', () => {
  test('clearDocsAstroCache removes docs/.astro recursively and is idempotent', async () => {
    const root = await mkdtemp(join(tmpdir(), 'pdfium-docs-strict-'));
    tempRoots.push(root);

    const cacheFile = join(root, 'docs', '.astro', 'content', 'snapshot.json');
    await mkdir(join(root, 'docs', '.astro', 'content'), { recursive: true });
    await writeFile(cacheFile, '{"ok":true}', 'utf8');
    expect(existsSync(cacheFile)).toBe(true);

    await clearDocsAstroCache(root);
    expect(existsSync(join(root, 'docs', '.astro'))).toBe(false);

    await expect(clearDocsAstroCache(root)).resolves.toBeUndefined();
  });

  test('hasWarningOutput detects Astro warning markers', () => {
    expect(hasWarningOutput('15:00:00 [WARN] [starlight-docs-loader] duplicate id')).toBe(true);
    expect(hasWarningOutput('15:00:00 [build] Complete!')).toBe(false);
  });
});
