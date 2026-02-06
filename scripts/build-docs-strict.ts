/**
 * Strict docs build:
 * - Runs docs build
 * - Fails on any warning output
 */

import { spawn } from 'node:child_process';

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
  const buildResult = await runCommand('pnpm', ['--dir', 'docs', 'build']);
  if (buildResult.exitCode !== 0) {
    process.exit(buildResult.exitCode);
  }

  if (/\[WARN\]/u.test(buildResult.output)) {
    console.error('Docs build produced warnings. Treating warnings as failures.');
    process.exit(1);
  }

  const linksResult = await runCommand('pnpm', ['docs:check-links']);
  if (linksResult.exitCode !== 0) {
    process.exit(linksResult.exitCode);
  }
}

main().catch((error) => {
  console.error('Strict docs build failed:', error);
  process.exit(1);
});
