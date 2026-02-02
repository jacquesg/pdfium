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
  'linux-arm64': '@scaryterry/pdfium-linux-arm64-gnu',
  'win32-x64': '@scaryterry/pdfium-win32-x64-msvc',
};

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
    const key = `${process.platform}-${process.arch}`;
    const packageName = triples[key];

    let binding: unknown;
    let usedPackage: string | undefined;

    if (packageName) {
      try {
        binding = req(packageName);
        usedPackage = packageName;
      } catch {
        // On Linux, fall back to musl if glibc package isn't available
        if (process.platform === 'linux') {
          try {
            binding = req('@scaryterry/pdfium-linux-x64-musl');
            usedPackage = '@scaryterry/pdfium-linux-x64-musl';
          } catch {
            return null;
          }
        } else {
          return null;
        }
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
