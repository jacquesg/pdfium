/**
 * Strict docs build:
 * - Runs docs build
 * - Fails on any warning output
 * - Serialises concurrent runs with a filesystem lock
 */

import { spawn } from 'node:child_process';
import { promises as fs } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  allWarningsAreStarlightDuplicateIds,
  clearDocsAstroCache,
  hasWarningOutput,
} from './build-docs-strict-utils.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..');
const LOCK_PATH = join(REPO_ROOT, '.tmp/locks/docs-build-strict.lock');
const LOCK_WAIT_TIMEOUT_MS = 120_000;
const LOCK_POLL_INTERVAL_MS = 200;
const BUILD_MAX_ATTEMPTS = 3;

function sleep(ms: number): Promise<void> {
  return new Promise((resolveSleep) => {
    setTimeout(resolveSleep, ms);
  });
}

function isProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === 'ESRCH') {
      return false;
    }
    // EPERM and other errors still indicate an existing process/unknown state.
    return true;
  }
}

async function clearStaleLockIfAny(): Promise<void> {
  let lockContent: string;
  try {
    lockContent = await fs.readFile(LOCK_PATH, 'utf8');
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === 'ENOENT') {
      return;
    }
    throw error;
  }

  const lockPid = Number.parseInt(lockContent.trim(), 10);
  if (!Number.isFinite(lockPid) || lockPid <= 0) {
    await fs.unlink(LOCK_PATH).catch(() => undefined);
    return;
  }

  if (!isProcessAlive(lockPid)) {
    await fs.unlink(LOCK_PATH).catch(() => undefined);
  }
}

async function acquireDocsBuildLock(): Promise<() => Promise<void>> {
  await fs.mkdir(dirname(LOCK_PATH), { recursive: true });
  const waitStartedAt = Date.now();

  while (true) {
    await clearStaleLockIfAny();

    try {
      const handle = await fs.open(LOCK_PATH, 'wx');
      await handle.writeFile(`${String(process.pid)}\n`);

      return async () => {
        await handle.close().catch(() => undefined);
        await fs.unlink(LOCK_PATH).catch(() => undefined);
      };
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code !== 'EEXIST') {
        throw error;
      }

      if (Date.now() - waitStartedAt >= LOCK_WAIT_TIMEOUT_MS) {
        throw new Error(`Timed out waiting for docs build lock at ${LOCK_PATH}.`);
      }

      await sleep(LOCK_POLL_INTERVAL_MS);
    }
  }
}

async function runCommand(command: string, args: string[]): Promise<{ exitCode: number; output: string }> {
  const child = spawn(command, args, {
    stdio: ['ignore', 'pipe', 'pipe'],
    env: process.env,
  });

  let output = '';
  child.stdout.on('data', (chunk) => {
    const text = chunk.toString();
    output += text;
    process.stdout.write(text);
  });
  child.stderr.on('data', (chunk) => {
    const text = chunk.toString();
    output += text;
    process.stderr.write(text);
  });

  const exitCode: number = await new Promise((resolve, reject) => {
    child.on('error', reject);
    child.on('close', resolve);
  });

  return { exitCode, output };
}

async function main(): Promise<void> {
  const releaseLock = await acquireDocsBuildLock();

  try {
    for (let attempt = 1; attempt <= BUILD_MAX_ATTEMPTS; attempt++) {
      await clearDocsAstroCache(REPO_ROOT);

      const buildResult = await runCommand('pnpm', ['--dir', 'docs', 'build']);
      if (buildResult.exitCode !== 0) {
        process.exit(buildResult.exitCode);
      }

      if (!hasWarningOutput(buildResult.output)) {
        break;
      }

      const isTransientDuplicateWarning = allWarningsAreStarlightDuplicateIds(buildResult.output);
      const isLastAttempt = attempt === BUILD_MAX_ATTEMPTS;

      if (isTransientDuplicateWarning && !isLastAttempt) {
        console.warn(
          `Docs build emitted transient starlight duplicate-id warnings on attempt ${String(
            attempt,
          )}/${String(BUILD_MAX_ATTEMPTS)}. Retrying...`,
        );
        continue;
      }

      console.error('Docs build produced warnings. Treating warnings as failures.');
      process.exit(1);
    }

    const linksResult = await runCommand('pnpm', ['docs:check-links']);
    if (linksResult.exitCode !== 0) {
      process.exit(linksResult.exitCode);
    }
  } finally {
    await releaseLock();
  }
}

main().catch((error) => {
  console.error('Strict docs build failed:', error);
  process.exit(1);
});
