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

import { copyFileSync, existsSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DEMO_ROOT = resolve(__dirname, "..");
const REPO_ROOT = resolve(DEMO_ROOT, "..");

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
  const distDir = join(REPO_ROOT, "dist");
  const wasmFile = join(distDir, "vendor", "pdfium.wasm");
  const cjsFile = join(distDir, "vendor", "pdfium.cjs");

  if (!existsSync(distDir)) {
    return {
      success: false,
      message: 'dist/ directory not found. Run "pnpm build" first.',
    };
  }

  if (!existsSync(wasmFile)) {
    return {
      success: false,
      message:
        'pdfium.wasm not found. Run "pnpm download:pdfium --target wasm" first.',
    };
  }

  if (!existsSync(cjsFile)) {
    return {
      success: false,
      message:
        "pdfium.cjs not found in dist/vendor/. Run \"pnpm build\" after downloading PDFium artifacts.",
    };
  }

  return { success: true, message: "Prerequisites satisfied" };
}

function setupSharedAssets(): void {
  const sharedDir = join(DEMO_ROOT, "shared");
  const samplePdf = join(sharedDir, "sample.pdf");

  if (!existsSync(samplePdf)) {
    error(
      "shared/sample.pdf not found. This file should exist in the repository.",
    );
    process.exit(1);
  }

  log("Shared assets verified");
}

function setupNodeDemo(): void {
  const nodeDir = join(DEMO_ROOT, "node");
  const sourcePdf = join(DEMO_ROOT, "shared", "sample.pdf");
  const targetPdf = join(nodeDir, "sample.pdf");

  if (!existsSync(targetPdf)) {
    copyFileSync(sourcePdf, targetPdf);
    log("Copied sample.pdf to demo/node/");
  } else {
    log("demo/node/sample.pdf already exists");
  }
}

function setupPlainDemo(): void {
  const sourceCjs = join(REPO_ROOT, "dist", "vendor", "pdfium.cjs");
  const targetCjs = join(REPO_ROOT, "pdfium.cjs");

  copyFileSync(sourceCjs, targetCjs);
  log("Synced pdfium.cjs to repository root (for plain demo)");
}

function setupViteDemo(): void {
  const vitePublicDir = join(DEMO_ROOT, "vite", "public");
  const sourceCjs = join(REPO_ROOT, "dist", "vendor", "pdfium.cjs");
  const sourcePdf = join(DEMO_ROOT, "shared", "sample.pdf");
  const targetCjs = join(vitePublicDir, "pdfium.cjs");
  const targetPdf = join(vitePublicDir, "sample.pdf");

  if (!existsSync(vitePublicDir)) {
    mkdirSync(vitePublicDir, { recursive: true });
  }

  copyFileSync(sourceCjs, targetCjs);
  log("Synced pdfium.cjs to demo/vite/public/");

  if (!existsSync(targetPdf)) {
    copyFileSync(sourcePdf, targetPdf);
    log("Copied sample.pdf to demo/vite/public/");
  } else {
    log("demo/vite/public/sample.pdf already exists");
  }

  // Copy demo-specific fixture PDFs (kept for backwards compat with labs that hardcode root paths)
  const fixtureDir = join(REPO_ROOT, "test", "fixtures");
  const pdfiumFixtureDir = join(fixtureDir, "pdfium");

  const demoPdfs: Array<{ source: string; target: string }> = [
    { source: join(pdfiumFixtureDir, "annots.pdf"), target: join(vitePublicDir, "annots.pdf") },
    { source: join(fixtureDir, "test_1_pass_12345678.pdf"), target: join(vitePublicDir, "protected.pdf") },
  ];

  for (const { source, target } of demoPdfs) {
    if (!existsSync(source)) {
      error(`Fixture not found: ${source}. Run tests first or check test/fixtures/.`);
      process.exit(1);
    }
    if (!existsSync(target)) {
      copyFileSync(source, target);
      log(`Copied ${source} -> ${target}`);
    }
  }

  // Copy all sample PDFs into public/samples/ for the sample picker
  const samplesDir = join(vitePublicDir, "samples");
  if (!existsSync(samplesDir)) {
    mkdirSync(samplesDir, { recursive: true });
  }

  // Copy sample.pdf into samples/
  const sampleTarget = join(samplesDir, "sample.pdf");
  if (!existsSync(sampleTarget)) {
    copyFileSync(sourcePdf, sampleTarget);
    log("Copied sample.pdf to public/samples/");
  }

  // Copy reference.pdf into samples/
  const referenceSource = join(vitePublicDir, "reference.pdf");
  const referenceTarget = join(samplesDir, "reference.pdf");
  if (!existsSync(referenceTarget) && existsSync(referenceSource)) {
    copyFileSync(referenceSource, referenceTarget);
    log("Copied reference.pdf to public/samples/");
  }

  // Copy protected PDF into samples/
  const protectedSource = join(fixtureDir, "test_1_pass_12345678.pdf");
  const protectedTarget = join(samplesDir, "protected.pdf");
  if (!existsSync(protectedTarget) && existsSync(protectedSource)) {
    copyFileSync(protectedSource, protectedTarget);
    log("Copied protected.pdf to public/samples/");
  }

  // Copy all pdfium fixture PDFs into samples/
  if (existsSync(pdfiumFixtureDir)) {
    const pdfiumFiles = readdirSync(pdfiumFixtureDir);
    let sampleCount = 0;
    for (const file of pdfiumFiles) {
      if (file.endsWith(".pdf")) {
        const dest = join(samplesDir, file);
        if (!existsSync(dest)) {
          copyFileSync(join(pdfiumFixtureDir, file), dest);
          sampleCount++;
        }
      }
    }
    log(`Copied ${sampleCount} fixture PDFs to public/samples/`);
  }

  const legacyWorker = join(vitePublicDir, "worker.js");
  if (existsSync(legacyWorker)) {
    rmSync(legacyWorker);
    log("Removed stale demo/vite/public/worker.js (worker now comes from src/pdfium.worker.ts)");
  }

  // Worker entry is authored in demo/vite/src/pdfium.worker.ts and bundled by Vite.
  // No worker artefact copy is required here.
}

function main(): void {
  log("Setting up PDFium demos for development mode...");
  log("");

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

  log("");
  log("Setup complete! You can now run the demos:");
  log("");
  log("  Node demo:");
  log("    pnpm tsx demo/node/index.ts");
  log("");
  log("  Plain demo:");
  log("    python3 -m http.server 8080");
  log("    open http://localhost:8080/demo/plain/index.html");
  log("");
  log("  Vite demo:");
  log("    pnpm --dir demo/vite install");
  log("    pnpm --dir demo/vite dev");
}

main();
