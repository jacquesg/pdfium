import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

const SKIP_DIRS = new Set(['.git', 'node_modules', '.turbo', '.cache', 'coverage', 'target']);
const STATIC_RELATIVE_IMPORT_RE = /\b(?:import|export)\s+(?:[^'"]*?\s+from\s+)?['"](\.[^'"]+)['"]/g;
const DYNAMIC_RELATIVE_IMPORT_RE = /\bimport\(\s*['"](\.[^'"]+)['"]\s*\)/g;

export type LibraryBuildStateKind = 'fresh' | 'missing-dist' | 'empty-dist' | 'stale' | 'invalid-dist';

export interface LibraryBuildState {
  readonly kind: LibraryBuildStateKind;
  readonly message: string;
  readonly latestSrcMtimeMs: number;
  readonly latestDistMtimeMs: number;
}

function resolveMissingRelativeImport(rootDir: string): { importer: string; specifier: string } | null {
  if (!existsSync(rootDir)) {
    return null;
  }

  const stack = [rootDir];

  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) continue;

    const entries = readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      if (SKIP_DIRS.has(entry.name)) continue;
      const fullPath = join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(fullPath);
        continue;
      }
      if (!entry.isFile() || !entry.name.endsWith('.js')) continue;

      const source = readFileSync(fullPath, 'utf8');
      const specifiers = new Set<string>();
      for (const regex of [STATIC_RELATIVE_IMPORT_RE, DYNAMIC_RELATIVE_IMPORT_RE]) {
        regex.lastIndex = 0;
        let match = regex.exec(source);
        while (match) {
          const specifier = match[1];
          if (specifier) {
            specifiers.add(specifier);
          }
          match = regex.exec(source);
        }
      }

      for (const specifier of specifiers) {
        const resolved = resolve(dirname(fullPath), specifier);
        if (!existsSync(resolved)) {
          return {
            importer: fullPath,
            specifier,
          };
        }
      }
    }
  }

  return null;
}

export function newestFileMtimeMs(rootDir: string): number {
  if (!existsSync(rootDir)) {
    return 0;
  }

  let newest = 0;
  const stack = [rootDir];

  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) continue;

    const entries = readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      if (SKIP_DIRS.has(entry.name)) continue;
      const fullPath = join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(fullPath);
        continue;
      }
      if (!entry.isFile()) continue;

      const mtimeMs = statSync(fullPath).mtimeMs;
      if (mtimeMs > newest) {
        newest = mtimeMs;
      }
    }
  }

  return newest;
}

export function getLibraryBuildState(srcDir: string, distDir: string): LibraryBuildState {
  if (!existsSync(distDir)) {
    return {
      kind: 'missing-dist',
      message: 'dist/ is missing. Run "pnpm build" in the repository root.',
      latestSrcMtimeMs: newestFileMtimeMs(srcDir),
      latestDistMtimeMs: 0,
    };
  }

  const latestSrcMtimeMs = newestFileMtimeMs(srcDir);
  const latestDistMtimeMs = newestFileMtimeMs(distDir);

  if (latestDistMtimeMs === 0) {
    return {
      kind: 'empty-dist',
      message: 'dist/ has no files. Run "pnpm build" in the repository root.',
      latestSrcMtimeMs,
      latestDistMtimeMs,
    };
  }

  if (latestSrcMtimeMs > latestDistMtimeMs) {
    return {
      kind: 'stale',
      message: 'Library dist output is stale compared to src/.',
      latestSrcMtimeMs,
      latestDistMtimeMs,
    };
  }

  const missingImport = resolveMissingRelativeImport(distDir);
  if (missingImport !== null) {
    return {
      kind: 'invalid-dist',
      message: `dist/ has a broken relative import (${missingImport.specifier} from ${missingImport.importer}).`,
      latestSrcMtimeMs,
      latestDistMtimeMs,
    };
  }

  return {
    kind: 'fresh',
    message: 'dist/ is fresh.',
    latestSrcMtimeMs,
    latestDistMtimeMs,
  };
}
