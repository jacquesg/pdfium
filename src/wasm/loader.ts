/**
 * Universal WASM loader for Browser and Node.js.
 *
 * @module wasm/loader
 */

import { isNodeEnvironment } from '../core/env.js';
import { InitialisationError, NetworkError, PDFiumErrorCode } from '../core/errors.js';
import type { PDFiumWASM, WASMLoadOptions } from './bindings/index.js';
import { REQUIRED_SYMBOLS } from './manifest.js';

/**
 * Check if the environment supports WebAssembly SIMD.
 */
export function hasSIMDSupport(): boolean {
  try {
    return WebAssembly.validate(
      new Uint8Array([
        0, 97, 115, 109, 1, 0, 0, 0, 1, 5, 1, 96, 0, 1, 123, 3, 2, 1, 0, 10, 10, 1, 8, 0, 65, 0, 253, 15, 253, 98, 11,
      ]),
    );
  } catch {
    return false;
  }
}

/**
 * Validate that the WASM module has all required exports and stub optional ones.
 *
 * @param module - The loaded WASM module
 */
function validateRuntime(module: Record<string, unknown>): void {
  const missingRequired: string[] = [];

  for (const symbol of REQUIRED_SYMBOLS) {
    if (typeof module[symbol] !== 'function') {
      missingRequired.push(symbol);
    }
  }

  if (missingRequired.length > 0) {
    throw new InitialisationError(
      PDFiumErrorCode.INIT_WASM_LOAD_FAILED,
      `WASM module missing required symbols: ${missingRequired.join(', ')}`,
    );
  }
}

/**
 * Load the PDFium WASM module.
 *
 * @param options - Loading options
 * @returns The loaded WASM module
 * @throws {InitialisationError} If loading fails
 */
export async function loadWASM(options: WASMLoadOptions): Promise<PDFiumWASM> {
  try {
    const module = await instantiateModule(options);
    validateRuntime(module as unknown as Record<string, unknown>);
    return module;
  } catch (error) {
    if (error instanceof InitialisationError) {
      throw error;
    }
    throw new InitialisationError(PDFiumErrorCode.INIT_WASM_LOAD_FAILED, 'Failed to load WASM module', {
      cause: error,
    });
  }
}

/** WASM binary magic number: \0asm */
const WASM_MAGIC = new Uint8Array([0x00, 0x61, 0x73, 0x6d]);

/**
 * Validate that the binary starts with the WASM magic number.
 */
function validateWASMMagic(binary: ArrayBuffer): void {
  if (binary.byteLength < 4) {
    throw new InitialisationError(
      PDFiumErrorCode.INIT_INVALID_OPTIONS,
      `Invalid WASM binary: expected at least 4 bytes, got ${binary.byteLength}`,
    );
  }

  const header = new Uint8Array(binary, 0, 4);
  if (
    header[0] !== WASM_MAGIC[0] ||
    header[1] !== WASM_MAGIC[1] ||
    header[2] !== WASM_MAGIC[2] ||
    header[3] !== WASM_MAGIC[3]
  ) {
    throw new InitialisationError(
      PDFiumErrorCode.INIT_INVALID_OPTIONS,
      'Invalid WASM binary: missing magic number (\\0asm)',
    );
  }
}

/**
 * Fetch WASM binary from a URL.
 */
async function fetchWASMBinary(url: string): Promise<ArrayBuffer> {
  // Validate protocol for absolute URLs to prevent file:// access or other schemes
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new InitialisationError(
        PDFiumErrorCode.INIT_INVALID_OPTIONS,
        `Invalid WASM URL protocol: ${parsed.protocol}. Only http: and https: are supported.`,
      );
    }
  } catch (error) {
    if (error instanceof InitialisationError) {
      throw error;
    }
    // URL parsing failed -> relative URL, safe to proceed (uses current origin)
  }

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new NetworkError(`Failed to fetch WASM binary: HTTP ${String(response.status)}`);
    }
    return response.arrayBuffer();
  } catch (error) {
    if (error instanceof InitialisationError) {
      throw error;
    }
    throw new NetworkError('Failed to fetch WASM binary from URL', {
      cause: error,
    });
  }
}

/**
 * Load the vendor CJS module using createRequire.
 * This is necessary because pdfium.cjs contains require('fs') which cannot be
 * bundled into ESM output. Using createRequire loads the CJS file at runtime.
 *
 * Node.js modules are dynamically imported to avoid bundler issues in browser.
 */
async function loadVendorCJS(): Promise<{ default: unknown }> {
  // Dynamic imports to avoid bundler errors in browser environments
  const nodeModule = await import('node:module');
  const nodePath = await import('node:path');
  const nodeUrl = await import('node:url');

  const __filename = nodeUrl.fileURLToPath(import.meta.url);
  const __dirname = nodePath.dirname(__filename);
  const require = nodeModule.createRequire(import.meta.url);

  // Determine vendor path based on environment:
  // - Source (src/wasm/loader.ts): vendor is at ../vendor/pdfium.cjs
  // - Built (dist/xxx.js): vendor is at ./vendor/pdfium.cjs
  const isSourceDir = __dirname.includes('/src/wasm') || __dirname.includes('\\src\\wasm');
  const vendorPath = isSourceDir
    ? nodePath.join(__dirname, '..', 'vendor', 'pdfium.cjs')
    : nodePath.join(__dirname, 'vendor', 'pdfium.cjs');

  return { default: require(vendorPath) };
}

/**
 * Resolve the WASM binary when explicitly provided or fetched from URL.
 * Returns null if the module should auto-load from its directory.
 */
async function resolveExplicitBinary(options: WASMLoadOptions): Promise<ArrayBuffer | null> {
  if (options.wasmBinary) {
    validateWASMMagic(options.wasmBinary);
    return options.wasmBinary;
  }
  if (options.wasmUrl) {
    const binary = await fetchWASMBinary(options.wasmUrl);
    validateWASMMagic(binary);
    return binary;
  }
  return null;
}

/**
 * Wait for the Emscripten runtime to be initialised.
 * bblanchon's pdfium.cjs is non-modular — it self-initialises and loads
 * the WASM binary from its sibling directory. We need to wait for `calledRun`.
 */
function waitForRuntime(
  module: PDFiumWASM & { calledRun?: boolean; onRuntimeInitialized?: () => void },
): Promise<void> {
  if (module.calledRun) {
    return Promise.resolve();
  }
  return new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new InitialisationError(PDFiumErrorCode.INIT_WASM_LOAD_FAILED, 'WASM runtime initialisation timed out'));
    }, 10_000);

    module.onRuntimeInitialized = () => {
      clearTimeout(timeout);
      resolve();
    };
  });
}

/**
 * Instantiate the WASM module using the vendor loader.
 *
 * The vendor module (bblanchon/pdfium-binaries) is a non-modular Emscripten
 * CJS output that self-initialises. When wasmBinary is provided, it's set on
 * the global Module object before import so the runtime uses it directly.
 *
 * For browser environments, we use an ESM factory wrapper that properly sets up
 * the globalThis.Module before importing the CJS module. This is necessary
 * because bundlers like Vite transform CJS to ESM, creating local Module
 * variables that don't see globalThis.Module.
 */
async function instantiateModule(options: WASMLoadOptions): Promise<PDFiumWASM> {
  const explicitBinary = await resolveExplicitBinary(options);

  if (explicitBinary) {
    if (!isNodeEnvironment()) {
      // Browser: use ESM factory wrapper which handles globalThis.Module properly
      const { default: createPdfium } = await import('../vendor/pdfium-factory.mjs');
      const module = await createPdfium({ wasmBinary: explicitBinary });
      return module as PDFiumWASM;
    }

    // Node.js: use existing globalThis.Module approach
    // Pre-configure the global Module object so the vendor script picks up wasmBinary.
    // The vendor CJS does: var Module = typeof Module != "undefined" ? Module : {};
    // Setting globalThis.Module before import lets us inject wasmBinary.
    const prev = (globalThis as Record<string, unknown>).Module;
    (globalThis as Record<string, unknown>).Module = { wasmBinary: explicitBinary };

    try {
      // Use createRequire to load CJS file - dynamic import would bundle it into ESM
      // which breaks because pdfium.cjs contains require('fs')
      const vendorModule = await loadVendorCJS();
      const module = vendorModule.default as PDFiumWASM & { calledRun?: boolean; onRuntimeInitialized?: () => void };
      await waitForRuntime(module);
      return module as PDFiumWASM;
    } finally {
      if (prev === undefined) {
        delete (globalThis as Record<string, unknown>).Module;
      } else {
        (globalThis as Record<string, unknown>).Module = prev;
      }
    }
  }

  // No explicit binary — let the module auto-load from its directory
  if (!isNodeEnvironment()) {
    throw new InitialisationError(
      PDFiumErrorCode.INIT_INVALID_OPTIONS,
      'No WASM source provided. In browser environments, provide wasmBinary or wasmUrl in the init options.',
    );
  }

  // Use createRequire to load CJS file at runtime
  const vendorModule = await loadVendorCJS();
  const module = vendorModule.default as PDFiumWASM & { calledRun?: boolean; onRuntimeInitialized?: () => void };
  await waitForRuntime(module);
  return module as PDFiumWASM;
}
