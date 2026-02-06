#!/usr/bin/env node
/**
 * Postinstall script for development environment.
 *
 * Downloads PDFium WASM binaries when running in development context.
 * Skips for npm consumers (they get binaries bundled in the package).
 *
 * Detection logic:
 * - If scripts/download-pdfium.ts doesn't exist, we're an npm consumer → skip
 * - If src/vendor/pdfium.wasm already exists → skip
 * - Otherwise → download WASM binaries
 *
 * @module scripts/postinstall
 */

import { existsSync } from 'node:fs';
import { execSync } from 'node:child_process';

// Skip if not in development context (npm consumer won't have the scripts dir)
if (!existsSync('scripts/download-pdfium.ts')) {
  process.exit(0);
}

// Skip if WASM already exists
if (existsSync('src/vendor/pdfium.wasm')) {
  console.log('PDFium WASM already present, skipping download.');
  process.exit(0);
}

console.log('Downloading PDFium WASM for development...');

try {
  execSync('node --import tsx scripts/download-pdfium.ts --target wasm', { stdio: 'inherit' });
} catch (error) {
  console.error('Failed to download PDFium WASM:', error instanceof Error ? error.message : error);
  console.error('You can manually run: pnpm download:pdfium --target wasm');
  process.exit(1);
}
