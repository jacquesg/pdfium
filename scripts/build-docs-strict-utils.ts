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

function getWarningLines(output: string): string[] {
  return output
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => /\[WARN\]/u.test(line));
}

function allWarningsAreStarlightDuplicateIds(output: string): boolean {
  const warningLines = getWarningLines(output);
  if (warningLines.length === 0) {
    return false;
  }
  return warningLines.every((line) => /\[starlight-docs-loader\]\s+Duplicate id\s+/u.test(line));
}

export { allWarningsAreStarlightDuplicateIds, clearDocsAstroCache, getWarningLines, hasWarningOutput };
