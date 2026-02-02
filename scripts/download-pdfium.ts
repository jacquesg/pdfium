/**
 * Download PDFium binaries for the pinned version.
 *
 * Downloads WASM and native libraries from bblanchon/pdfium-binaries
 * based on the version in src/vendor/LAST_RELEASE.txt.
 *
 * Usage:
 *   pnpm download:pdfium [--target <target>] [--release <tag>]
 *
 * Options:
 *   --target   Download specific target only (wasm, native, or platform name)
 *   --release  Override release tag (default: read from LAST_RELEASE.txt)
 *
 * Examples:
 *   pnpm download:pdfium                         # Download everything
 *   pnpm download:pdfium --target wasm           # Download WASM only
 *   pnpm download:pdfium --target darwin-arm64   # Download specific native target
 *   pnpm download:pdfium --target native         # Download all native targets
 *
 * @module scripts/download-pdfium
 */

import { execSync } from 'node:child_process';
import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import {
  type Release,
  type ReleaseAsset,
  type TargetConfig,
  NATIVE_TARGETS,
  WASM_TARGET,
  cleanupExtracted,
  createOctokit,
  downloadFile,
  extractArchive,
  getRelease,
  readPinnedVersion,
} from './lib/pdfium-download.js';

interface Args {
  target: string | undefined;
  release: string | undefined;
}

function parseArgs(): Args {
  const args = process.argv.slice(2);
  let target: string | undefined;
  let release: string | undefined;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--target' && args[i + 1]) {
      target = args[i + 1];
      i++;
    } else if (args[i] === '--release' && args[i + 1]) {
      release = args[i + 1];
      i++;
    }
  }

  return { target, release };
}

/**
 * ESM factory wrapper template for browser environments.
 *
 * This wrapper bypasses bundler transformations by fetching the CJS file
 * as raw text and evaluating it with Module pre-configured. This is necessary
 * because bundlers like Vite transform CJS→ESM, creating local Module variables
 * that shadow globalThis.Module.
 */
const FACTORY_WRAPPER = `// pdfium-factory.mjs - Auto-generated ESM factory wrapper
// Bypasses bundler CJS→ESM transformation by fetching and evaluating raw code

export default function createPdfium(options = {}) {
  return new Promise(async (resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('PDFium WASM initialisation timed out'));
    }, 30000);

    try {
      // Determine CJS URL - use provided URL or default to /pdfium.cjs
      // The CJS file must be served from the same origin (e.g., in public directory)
      const cjsUrl = options.cjsUrl || '/pdfium.cjs';

      // Fetch the CJS file as raw text to bypass bundler transformation
      const response = await fetch(cjsUrl);
      if (!response.ok) {
        throw new Error('Failed to fetch pdfium.cjs from ' + cjsUrl + ': ' + response.status);
      }
      const scriptText = await response.text();

      // Set up Module object before evaluation
      const Module = {
        wasmBinary: options.wasmBinary,
        onRuntimeInitialized: () => {
          clearTimeout(timeout);
          resolve(Module);
        },
      };

      // Make Module available globally for the CJS code
      globalThis.Module = Module;

      // Prepend Module assignment so the CJS code finds it
      // The CJS starts with: var Module = typeof Module != "undefined" ? Module : {};
      // By declaring Module first, the check will find our pre-configured object
      const wrappedScript = 'var Module = globalThis.Module;\\n' + scriptText;
      const fn = new Function(wrappedScript);
      fn();

      // If already initialised synchronously
      if (Module.calledRun) {
        clearTimeout(timeout);
        resolve(Module);
      }
    } catch (err) {
      clearTimeout(timeout);
      reject(err);
    }
  });
}
`;

async function downloadWasm(assets: ReleaseAsset[], releaseTag: string): Promise<void> {
  const assetName = `${WASM_TARGET.asset}.tgz`;
  const asset = assets.find((a) => a.name === assetName);
  if (!asset) {
    throw new Error(`Asset ${assetName} not found in release ${releaseTag}`);
  }

  console.log('[wasm] Downloading...');

  // Ensure vendor directory exists
  await fs.mkdir('src/vendor', { recursive: true });

  const tempArchive = 'src/vendor/pdfium-wasm.tgz';
  await downloadFile(asset.browser_download_url, tempArchive);

  console.log('[wasm] Extracting...');
  await extractArchive(tempArchive, 'src/vendor');

  // Remove temp archive
  await fs.unlink(tempArchive);

  // Copy files to their destinations
  for (const file of WASM_TARGET.files) {
    const srcPath = join('src/vendor', file.src);
    await fs.copyFile(srcPath, file.dest);
    console.log(`[wasm] Copied ${file.dest}`);
  }

  // Format the JS file
  try {
    execSync('pnpm biome format --write src/vendor/pdfium.cjs', { stdio: 'pipe' });
    console.log('[wasm] Formatted pdfium.cjs');
  } catch {
    // Formatting is optional, continue if it fails
  }

  // Generate ESM factory wrapper for browser environments
  await fs.writeFile('src/vendor/pdfium-factory.mjs', FACTORY_WRAPPER);
  console.log('[wasm] Generated pdfium-factory.mjs');

  // Copy WASM and CJS to test public directory for browser tests
  const testPublicDir = 'test/browser/public';
  try {
    await fs.mkdir(testPublicDir, { recursive: true });
    await fs.copyFile('src/vendor/pdfium.wasm', join(testPublicDir, 'pdfium.wasm'));
    await fs.copyFile('src/vendor/pdfium.cjs', join(testPublicDir, 'pdfium.cjs'));
    console.log('[wasm] Copied to test/browser/public/');
  } catch {
    // Test directory might not exist in production installs
  }

  // Clean up extracted directories
  await cleanupExtracted('src/vendor');

  console.log('[wasm] Done!');
}

async function downloadNativeTarget(
  target: string,
  config: TargetConfig,
  assets: ReleaseAsset[],
  releaseTag: string,
): Promise<void> {
  const assetName = `${config.asset}.tgz`;
  const asset = assets.find((a) => a.name === assetName);
  if (!asset) {
    throw new Error(`Asset ${assetName} not found in release ${releaseTag}`);
  }

  console.log(`[${target}] Downloading...`);

  // Create temp directory for extraction
  const tempDir = join('npm', config.npmDir, '.temp');
  await fs.mkdir(tempDir, { recursive: true });

  const archivePath = join(tempDir, assetName);
  await downloadFile(asset.browser_download_url, archivePath);

  console.log(`[${target}] Extracting...`);
  await extractArchive(archivePath, tempDir);

  // Copy the library file to the npm directory
  const srcPath = join(tempDir, config.libPath);
  const destPath = join('npm', config.npmDir, config.destFile);

  try {
    await fs.access(srcPath);
  } catch {
    throw new Error(`Library file not found in archive: ${config.libPath}`);
  }

  await fs.copyFile(srcPath, destPath);
  console.log(`[${target}] Copied ${config.destFile} to npm/${config.npmDir}/`);

  // Cleanup temp directory
  await fs.rm(tempDir, { recursive: true, force: true });

  console.log(`[${target}] Done!`);
}

async function main(): Promise<void> {
  const { target, release: releaseArg } = parseArgs();

  // Validate target if specified
  const validTargets = ['wasm', 'native', ...Object.keys(NATIVE_TARGETS)];
  if (target && !validTargets.includes(target)) {
    console.error(`Unknown target: ${target}`);
    console.error(`Valid targets: ${validTargets.join(', ')}`);
    process.exit(1);
  }

  // Determine which release to use
  let releaseTag: string;
  if (releaseArg) {
    releaseTag = releaseArg;
  } else {
    releaseTag = await readPinnedVersion();
  }

  console.log(`Using release: ${releaseTag}`);

  // Fetch release info
  const octokit = createOctokit();
  let releaseData: Release;
  try {
    releaseData = await getRelease(octokit, releaseTag);
  } catch (error) {
    console.error(`Failed to fetch release ${releaseTag}:`, error instanceof Error ? error.message : error);
    process.exit(1);
  }

  console.log(`Found release: ${releaseData.tag_name}`);

  const shouldDownloadWasm = !target || target === 'wasm';
  const shouldDownloadNative = !target || target === 'native' || Object.keys(NATIVE_TARGETS).includes(target);

  // Download WASM
  if (shouldDownloadWasm) {
    try {
      await downloadWasm(releaseData.assets, releaseData.tag_name);
    } catch (error) {
      console.error('[wasm] Failed:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  }

  // Download native targets
  if (shouldDownloadNative) {
    // Determine which native targets to download
    let nativeTargets: Record<string, TargetConfig>;
    if (target && target !== 'native' && target !== 'wasm') {
      // Specific native target
      const config = NATIVE_TARGETS[target];
      if (!config) {
        console.error(`Unknown native target: ${target}`);
        process.exit(1);
      }
      nativeTargets = { [target]: config };
    } else if (target === 'native' || !target) {
      // All native targets (only if explicitly requested or no target specified)
      nativeTargets = target === 'native' ? NATIVE_TARGETS : {};
    } else {
      nativeTargets = {};
    }

    for (const [targetName, config] of Object.entries(nativeTargets)) {
      try {
        await downloadNativeTarget(targetName, config, releaseData.assets, releaseData.tag_name);
      } catch (error) {
        console.error(`[${targetName}] Failed:`, error instanceof Error ? error.message : error);
        process.exit(1);
      }
    }
  }

  console.log('\nAll downloads completed successfully!');
}

main().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
