/**
 * Native binding loader for Node.js.
 *
 * Attempts to load the platform-specific native addon package.
 * Falls back gracefully to null if no native binding is available.
 *
 * @module native/loader
 */

import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import type { NativePdfium, NativePdfiumBinding } from './types.js';

const triples: Record<string, string> = {
  'darwin-arm64': '@scaryterry/pdfium-darwin-arm64',
  'darwin-x64': '@scaryterry/pdfium-darwin-x64',
  'linux-x64': '@scaryterry/pdfium-linux-x64-gnu',
  'linux-x64-musl': '@scaryterry/pdfium-linux-x64-musl',
  'linux-arm64': '@scaryterry/pdfium-linux-arm64-gnu',
  'win32-x64': '@scaryterry/pdfium-win32-x64-msvc',
};

function isLinuxMusl(): boolean {
  if (process.platform !== 'linux') {
    return false;
  }
  try {
    // In glibc environments this field is set. In musl it's undefined.
    const report = process.report?.getReport() as { header?: { glibcVersionRuntime?: string } } | undefined;
    const glibcVersionRuntime = report?.header?.glibcVersionRuntime;
    return glibcVersionRuntime === undefined;
  } catch {
    return false;
  }
}

function getPackageCandidates(): string[] {
  const key = `${process.platform}-${process.arch}`;

  if (key === 'linux-x64') {
    if (isLinuxMusl()) {
      return [triples['linux-x64-musl'], triples['linux-x64']].filter((v): v is string => v !== undefined);
    }
    return [triples['linux-x64'], triples['linux-x64-musl']].filter((v): v is string => v !== undefined);
  }

  const single = triples[key];
  return single ? [single] : [];
}

function isNativeBinding(value: unknown): value is NativePdfiumBinding {
  return (
    typeof value === 'object' &&
    value !== null &&
    'NativePdfium' in value &&
    typeof (value as NativePdfiumBinding).NativePdfium === 'function' &&
    typeof (value as NativePdfiumBinding).NativePdfium.load === 'function'
  );
}

/**
 * Resolve the path to the native PDFium shared library (libpdfium.dylib/.so/.dll)
 * relative to the .node binary in the platform package.
 */
function resolveLibraryPath(req: ReturnType<typeof createRequire>, packageName: string): string | null {
  try {
    const packageJsonPath = req.resolve(`${packageName}/package.json`);
    const packageDir = dirname(packageJsonPath);

    // The native library is expected alongside the .node binary
    const platform = process.platform;
    if (platform === 'win32') {
      return join(packageDir, 'pdfium.dll');
    }
    if (platform === 'darwin') {
      return join(packageDir, 'libpdfium.dylib');
    }
    return join(packageDir, 'libpdfium.so');
  } catch {
    return null;
  }
}

/**
 * Try to load the native binding for the current platform.
 *
 * @returns The loaded NativePdfium instance, or null if unavailable.
 */
export function loadNativeBinding(): NativePdfium | null {
  try {
    const req = createRequire(import.meta.url);
    const candidates = getPackageCandidates();

    let binding: unknown;
    let usedPackage: string | undefined;

    if (candidates.length > 0) {
      try {
        for (const candidate of candidates) {
          try {
            binding = req(candidate);
            usedPackage = candidate;
            break;
          } catch {
            // Try next candidate
          }
        }
        if (!usedPackage) {
          return null;
        }
      } catch {
        return null;
      }
    } else {
      return null;
    }

    if (!isNativeBinding(binding) || !usedPackage) {
      return null;
    }

    // Resolve the path to the native PDFium library
    const libraryPath = resolveLibraryPath(req, usedPackage);
    if (!libraryPath) {
      return null;
    }

    // Create the NativePdfium instance by loading the library
    return binding.NativePdfium.load(libraryPath);
  } catch {
    return null;
  }
}
