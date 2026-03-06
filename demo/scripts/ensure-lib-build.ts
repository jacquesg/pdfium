#!/usr/bin/env tsx

import { spawnSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getLibraryBuildState } from './lib-build-state.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DEMO_ROOT = resolve(__dirname, '..');
const REPO_ROOT = resolve(DEMO_ROOT, '..');
const SRC_DIR = join(REPO_ROOT, 'src');
const DIST_DIR = join(REPO_ROOT, 'dist');
const IS_WINDOWS = process.platform === 'win32';

function log(message: string): void {
  console.log(`[ensure-lib-build] ${message}`);
}

function fail(message: string): never {
  console.error(`[ensure-lib-build] ERROR: ${message}`);
  process.exit(1);
}

function runBuild(): void {
  log('Running `pnpm build`...');
  const result = spawnSync('pnpm', ['build'], {
    cwd: REPO_ROOT,
    stdio: 'inherit',
    shell: IS_WINDOWS,
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function main(): void {
  const before = getLibraryBuildState(SRC_DIR, DIST_DIR);
  if (before.kind === 'fresh') {
    log('dist/ is already fresh.');
    return;
  }

  log(`${before.message} Rebuilding to re-sync demo with library sources.`);
  runBuild();

  const after = getLibraryBuildState(SRC_DIR, DIST_DIR);
  if (after.kind !== 'fresh') {
    fail(`Build completed but dist/ is still not fresh (${after.kind}).`);
  }

  log('dist/ is fresh after rebuild.');
}

main();
