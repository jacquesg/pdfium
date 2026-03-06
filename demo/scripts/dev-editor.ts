#!/usr/bin/env tsx

import { spawn, spawnSync, type ChildProcess } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DEMO_ROOT = resolve(__dirname, '..');
const REPO_ROOT = resolve(DEMO_ROOT, '..');
const IS_WINDOWS = process.platform === 'win32';

function runInitialBuild(): void {
  console.log('[dev:editor] Running initial library build...');
  const result = spawnSync('pnpm', ['build'], {
    cwd: REPO_ROOT,
    stdio: 'inherit',
    shell: IS_WINDOWS,
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function spawnProcess(label: string, args: string[]): ChildProcess {
  console.log(`[dev:editor] Starting ${label}: pnpm ${args.join(' ')}`);
  return spawn('pnpm', args, {
    cwd: REPO_ROOT,
    stdio: 'inherit',
    shell: IS_WINDOWS,
  });
}

function terminate(children: ChildProcess[]): void {
  for (const child of children) {
    if (!child.killed) {
      child.kill('SIGTERM');
    }
  }
}

function main(): void {
  runInitialBuild();

  const buildWatch = spawnProcess('library build watch', ['build:watch']);
  const demoDev = spawnProcess('Vite demo', ['--dir', 'demo/vite', 'dev']);
  const children = [buildWatch, demoDev];

  let shuttingDown = false;
  const shutdown = (code: number): void => {
    if (shuttingDown) return;
    shuttingDown = true;
    terminate(children);
    process.exit(code);
  };

  process.on('SIGINT', () => shutdown(0));
  process.on('SIGTERM', () => shutdown(0));

  buildWatch.on('exit', (code) => {
    if (shuttingDown) return;
    shutdown(code ?? 1);
  });

  demoDev.on('exit', (code) => {
    if (shuttingDown) return;
    shutdown(code ?? 1);
  });
}

main();
