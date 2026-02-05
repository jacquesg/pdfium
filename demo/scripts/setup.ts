#!/usr/bin/env tsx

/**
 * Development mode setup script for PDFium demos.
 *
 * This script prepares the demo environment when working from a cloned repository.
 * It copies the necessary files (sample.pdf, pdfium.cjs) to the locations expected
 * by each demo.
 *
 * Prerequisites:
 *   - pnpm build (main package must be built first)
 *
 * Usage:
 *   pnpm tsx demo/scripts/setup.ts
 */

import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DEMO_ROOT = resolve(__dirname, '..');
const REPO_ROOT = resolve(DEMO_ROOT, '..');

interface SetupResult {
  success: boolean;
  message: string;
}

function log(message: string): void {
  console.log(`[setup] ${message}`);
}

function error(message: string): void {
  console.error(`[setup] ERROR: ${message}`);
}

function checkPrerequisites(): SetupResult {
  const distDir = join(REPO_ROOT, 'dist');
  const wasmFile = join(distDir, 'vendor', 'pdfium.wasm');
  const cjsFile = join(REPO_ROOT, 'src', 'vendor', 'pdfium.cjs');

  if (!existsSync(distDir)) {
    return {
      success: false,
      message: 'dist/ directory not found. Run "pnpm build" first.',
    };
  }

  if (!existsSync(wasmFile)) {
    return {
      success: false,
      message: 'pdfium.wasm not found. Run "pnpm download:pdfium --target wasm" first.',
    };
  }

  if (!existsSync(cjsFile)) {
    return {
      success: false,
      message: 'pdfium.cjs not found in src/vendor/. The WASM binary may not have been downloaded correctly.',
    };
  }

  return { success: true, message: 'Prerequisites satisfied' };
}

function setupSharedAssets(): void {
  const sharedDir = join(DEMO_ROOT, 'shared');
  const samplePdf = join(sharedDir, 'sample.pdf');

  if (!existsSync(samplePdf)) {
    error('shared/sample.pdf not found. This file should exist in the repository.');
    process.exit(1);
  }

  log('Shared assets verified');
}

function setupNodeDemo(): void {
  const nodeDir = join(DEMO_ROOT, 'node');
  const sourcePdf = join(DEMO_ROOT, 'shared', 'sample.pdf');
  const targetPdf = join(nodeDir, 'sample.pdf');

  if (!existsSync(targetPdf)) {
    copyFileSync(sourcePdf, targetPdf);
    log('Copied sample.pdf to demo/node/');
  } else {
    log('demo/node/sample.pdf already exists');
  }
}

function setupPlainDemo(): void {
  const sourceCjs = join(REPO_ROOT, 'src', 'vendor', 'pdfium.cjs');
  const targetCjs = join(REPO_ROOT, 'pdfium.cjs');

  if (!existsSync(targetCjs)) {
    copyFileSync(sourceCjs, targetCjs);
    log('Copied pdfium.cjs to repository root (for plain demo)');
  } else {
    log('pdfium.cjs already exists in repository root');
  }
}

function setupViteDemo(): void {
  const vitePublicDir = join(DEMO_ROOT, 'vite', 'public');
  const sourceCjs = join(REPO_ROOT, 'src', 'vendor', 'pdfium.cjs');
  const sourcePdf = join(DEMO_ROOT, 'shared', 'sample.pdf');
  const targetCjs = join(vitePublicDir, 'pdfium.cjs');
  const targetPdf = join(vitePublicDir, 'sample.pdf');

  if (!existsSync(vitePublicDir)) {
    mkdirSync(vitePublicDir, { recursive: true });
  }

  if (!existsSync(targetCjs)) {
    copyFileSync(sourceCjs, targetCjs);
    log('Copied pdfium.cjs to demo/vite/public/');
  } else {
    log('demo/vite/public/pdfium.cjs already exists');
  }

  if (!existsSync(targetPdf)) {
    copyFileSync(sourcePdf, targetPdf);
    log('Copied sample.pdf to demo/vite/public/');
  } else {
    log('demo/vite/public/sample.pdf already exists');
  }
}

function main(): void {
  log('Setting up PDFium demos for development mode...');
  log('');

  const prereq = checkPrerequisites();
  if (!prereq.success) {
    error(prereq.message);
    process.exit(1);
  }
  log(prereq.message);

  setupSharedAssets();
  setupNodeDemo();
  setupPlainDemo();
  setupViteDemo();

  log('');
  log('Setup complete! You can now run the demos:');
  log('');
  log('  Node demo:');
  log('    pnpm tsx demo/node/index.ts');
  log('');
  log('  Plain demo:');
  log('    python3 -m http.server 8080');
  log('    open http://localhost:8080/demo/plain/index.html');
  log('');
  log('  Vite demo:');
  log('    pnpm --dir demo/vite install');
  log('    pnpm --dir demo/vite dev');
}

main();
