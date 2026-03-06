import { existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const SKIP_DIRS = new Set(['.git', 'node_modules', '.turbo', '.cache', 'coverage', 'target']);

export type LibraryBuildStateKind = 'fresh' | 'missing-dist' | 'empty-dist' | 'stale';

export interface LibraryBuildState {
  readonly kind: LibraryBuildStateKind;
  readonly message: string;
  readonly latestSrcMtimeMs: number;
  readonly latestDistMtimeMs: number;
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

  return {
    kind: 'fresh',
    message: 'dist/ is fresh.',
    latestSrcMtimeMs,
    latestDistMtimeMs,
  };
}
