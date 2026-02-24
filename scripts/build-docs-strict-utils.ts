import { promises as fs } from 'node:fs';
import { join } from 'node:path';

function docsAstroCachePath(repoRoot: string): string {
  return join(repoRoot, 'docs', '.astro');
}

async function clearDocsAstroCache(repoRoot: string): Promise<void> {
  await fs.rm(docsAstroCachePath(repoRoot), { recursive: true, force: true });
}

function hasWarningOutput(output: string): boolean {
  return /\[WARN\]/u.test(output);
}

export { clearDocsAstroCache, hasWarningOutput };
