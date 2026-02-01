/**
 * Universal WASM loader for Browser and Node.js.
 *
 * @module wasm/loader
 */

import { InitialisationError, PDFiumErrorCode } from '../core/errors.js';
import type { PDFiumWASM, WASMLoadOptions } from './bindings.js';

/**
 * Load the PDFium WASM module.
 *
 * @param options - Loading options
 * @returns The loaded WASM module
 * @throws {InitialisationError} If loading fails
 */
export async function loadWASM(options: WASMLoadOptions): Promise<PDFiumWASM> {
  try {
    const binary = await resolveWASMBinary(options);
    const module = await instantiateModule(binary, options);
    return module;
  } catch (error) {
    if (error instanceof InitialisationError) {
      throw error;
    }
    throw new InitialisationError(
      PDFiumErrorCode.INIT_WASM_LOAD_FAILED,
      `Failed to load WASM module: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/**
 * Resolve the WASM binary from options or auto-detect.
 */
async function resolveWASMBinary(options: WASMLoadOptions): Promise<ArrayBuffer> {
  // Option 1: Binary provided directly
  if (options.wasmBinary) {
    return options.wasmBinary;
  }

  // Option 2: Auto-detect environment and load
  if (isNodeEnvironment()) {
    return loadWASMFromNodeModules();
  }

  throw new InitialisationError(
    PDFiumErrorCode.INIT_INVALID_OPTIONS,
    'No WASM source provided. In browser environments, provide wasmBinary in the init options.',
  );
}

/**
 * Check if running in Node.js environment.
 */
function isNodeEnvironment(): boolean {
  return typeof process !== 'undefined' && process.versions !== undefined && process.versions.node !== undefined;
}

/**
 * Load WASM binary from node_modules in Node.js.
 */
async function loadWASMFromNodeModules(): Promise<ArrayBuffer> {
  try {
    const { readFile } = await import('node:fs/promises');
    const { fileURLToPath } = await import('node:url');
    const { dirname, join } = await import('node:path');

    // Get the directory of this file
    const __dirname = dirname(fileURLToPath(import.meta.url));
    const wasmPath = join(__dirname, 'vendor', 'pdfium.wasm');

    const buffer = await readFile(wasmPath);
    return buffer.buffer as ArrayBuffer;
  } catch (error) {
    throw new InitialisationError(
      PDFiumErrorCode.INIT_WASM_LOAD_FAILED,
      `Failed to load WASM from package: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/**
 * Vendor module loader options type (matches vendor/pdfium.d.ts).
 */
interface VendorLoadOptions {
  wasmBinary?: ArrayBuffer;
  locateFile?: (path: string) => string;
  instantiateWasm?: (
    imports: WebAssembly.Imports,
    successCallback: (module: WebAssembly.Module) => void,
  ) => WebAssembly.Exports;
}

/**
 * Instantiate the WASM module using the vendor loader.
 */
async function instantiateModule(wasmBinary: ArrayBuffer, options: WASMLoadOptions): Promise<PDFiumWASM> {
  // Dynamically import the vendor module
  const vendorModule = await import('../vendor/pdfium.esm.js');

  // The vendor module returns a slightly different type, but it's compatible
  const loadPdfium = vendorModule.default as unknown as (options: VendorLoadOptions) => Promise<PDFiumWASM>;

  const loadOptions: VendorLoadOptions = { wasmBinary };
  if (options.locateFile !== undefined) {
    loadOptions.locateFile = options.locateFile;
  }
  if (options.instantiateWasm !== undefined) {
    loadOptions.instantiateWasm = options.instantiateWasm;
  }

  const module = await loadPdfium(loadOptions);
  return module;
}
