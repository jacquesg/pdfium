/**
 * Shared utilities for downloading PDFium binaries.
 *
 * @module scripts/lib/pdfium-download
 */

import { createWriteStream, promises as fs } from 'node:fs';
import { pipeline as pipelineCallback } from 'node:stream';
import { promisify } from 'node:util';
import { createGunzip } from 'node:zlib';
import { Octokit } from '@octokit/rest';
import { extract } from 'tar';

const pipeline = promisify(pipelineCallback);

export const UPSTREAM_OWNER = 'bblanchon';
export const UPSTREAM_REPO = 'pdfium-binaries';
export const VERSION_FILE = 'src/vendor/LAST_RELEASE.txt';

/** Target platform configuration. */
export interface TargetConfig {
  /** bblanchon asset name (without .tgz extension). */
  asset: string;
  /** Path to library file inside the archive. */
  libPath: string;
  /** Destination filename in npm/ directory. */
  destFile: string;
  /** npm/ subdirectory. */
  npmDir: string;
}

/**
 * Mapping from napi-rs targets to bblanchon assets.
 *
 * bblanchon uses different naming conventions:
 * - macOS: pdfium-mac-arm64.tgz, pdfium-mac-x64.tgz
 * - Linux: pdfium-linux-x64.tgz, pdfium-linux-arm64.tgz, pdfium-linux-musl-x64.tgz
 * - Windows: pdfium-win-x64.tgz
 */
export const NATIVE_TARGETS: Record<string, TargetConfig> = {
  'darwin-arm64': {
    asset: 'pdfium-mac-arm64',
    libPath: 'lib/libpdfium.dylib',
    destFile: 'libpdfium.dylib',
    npmDir: 'darwin-arm64',
  },
  'darwin-x64': {
    asset: 'pdfium-mac-x64',
    libPath: 'lib/libpdfium.dylib',
    destFile: 'libpdfium.dylib',
    npmDir: 'darwin-x64',
  },
  'linux-x64-gnu': {
    asset: 'pdfium-linux-x64',
    libPath: 'lib/libpdfium.so',
    destFile: 'libpdfium.so',
    npmDir: 'linux-x64-gnu',
  },
  'linux-x64-musl': {
    asset: 'pdfium-linux-musl-x64',
    libPath: 'lib/libpdfium.so',
    destFile: 'libpdfium.so',
    npmDir: 'linux-x64-musl',
  },
  'linux-arm64-gnu': {
    asset: 'pdfium-linux-arm64',
    libPath: 'lib/libpdfium.so',
    destFile: 'libpdfium.so',
    npmDir: 'linux-arm64-gnu',
  },
  'win32-x64-msvc': {
    asset: 'pdfium-win-x64',
    libPath: 'bin/pdfium.dll',
    destFile: 'pdfium.dll',
    npmDir: 'win32-x64-msvc',
  },
};

/** WASM target configuration. */
export const WASM_TARGET = {
  asset: 'pdfium-wasm',
  files: [
    { src: 'lib/pdfium.js', dest: 'src/vendor/pdfium.cjs' },
    { src: 'lib/pdfium.wasm', dest: 'src/vendor/pdfium.wasm' },
  ],
};

/** GitHub release asset. */
export interface ReleaseAsset {
  name: string;
  browser_download_url: string;
}

/** GitHub release. */
export interface Release {
  tag_name: string;
  assets: ReleaseAsset[];
}

export function createOctokit(): Octokit {
  return new Octokit({ auth: process.env.GITHUB_TOKEN });
}

/**
 * Download a file from a URL to a local path.
 */
export async function downloadFile(url: string, destPath: string): Promise<void> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download: ${response.status} ${response.statusText}`);
  }

  const body = response.body;
  if (!body) {
    throw new Error('Response body is null');
  }

  const fileStream = createWriteStream(destPath);
  const reader = body.getReader();

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      fileStream.write(value);
    }
  } finally {
    fileStream.close();
  }
}

/**
 * Extract a .tgz archive to a destination directory.
 */
export async function extractArchive(archivePath: string, destDir: string): Promise<void> {
  const archiveStream = (await fs.open(archivePath, 'r')).createReadStream();
  await pipeline(archiveStream, createGunzip(), extract({ cwd: destDir }));
}

/**
 * Get a GitHub release by tag or latest.
 */
export async function getRelease(octokit: Octokit, tag?: string): Promise<Release> {
  if (tag && tag !== 'latest') {
    const { data } = await octokit.repos.getReleaseByTag({
      owner: UPSTREAM_OWNER,
      repo: UPSTREAM_REPO,
      tag,
    });
    return data;
  }
  const { data } = await octokit.repos.getLatestRelease({
    owner: UPSTREAM_OWNER,
    repo: UPSTREAM_REPO,
  });
  return data;
}

/**
 * Read the pinned PDFium version from LAST_RELEASE.txt.
 */
export async function readPinnedVersion(): Promise<string> {
  return (await fs.readFile(VERSION_FILE, 'utf-8')).trim();
}

/**
 * Write the PDFium version to LAST_RELEASE.txt.
 */
export async function writePinnedVersion(version: string): Promise<void> {
  await fs.writeFile(VERSION_FILE, version);
}

/**
 * Clean up extracted bblanchon directories and files.
 */
export async function cleanupExtracted(baseDir: string): Promise<void> {
  for (const dir of ['lib', 'include', 'licenses']) {
    await fs.rm(`${baseDir}/${dir}`, { recursive: true, force: true });
  }
  for (const file of ['VERSION', 'LICENSE', 'args.gn']) {
    await fs.rm(`${baseDir}/${file}`, { force: true });
  }
}
