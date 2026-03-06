#!/usr/bin/env tsx

import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getLibraryBuildState } from './lib-build-state.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DEMO_ROOT = resolve(__dirname, '..');
const REPO_ROOT = resolve(DEMO_ROOT, '..');
const SRC_DIR = join(REPO_ROOT, 'src');
const DIST_DIR = join(REPO_ROOT, 'dist');

function fail(message: string): never {
  console.error(`[verify-lib-build] ERROR: ${message}`);
  process.exit(1);
}

function main(): void {
  const state = getLibraryBuildState(SRC_DIR, DIST_DIR);
  if (state.kind !== 'fresh') {
    const suffix =
      state.kind === 'stale' ? ' Run "pnpm build" (or "pnpm build:watch") in the repository root.' : '';
    fail(`${state.message}${suffix}`);
  }

  console.log(`[verify-lib-build] OK: ${state.message}`);
}

main();
