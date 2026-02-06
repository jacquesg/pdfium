/**
 * Shared test helpers for PDFium tests.
 *
 * Provides common utilities for loading the WASM binary and initialising
 * PDFium instances in test contexts.
 */

import { readFile } from 'node:fs/promises';
import type { PDFiumInitOptions } from '../../src/core/types.js';
import type { PDFiumDocument } from '../../src/document/document.js';
import type { NativePDFiumInstance } from '../../src/document/native-instance.js';
import { loadNativeBinding } from '../../src/native/loader.js';
import { PDFium } from '../../src/pdfium.js';

/**
 * Load the WASM binary for testing.
 */
export async function loadWasmBinary(): Promise<ArrayBuffer> {
  const buffer = await readFile('src/vendor/pdfium.wasm');
  const result = new ArrayBuffer(buffer.byteLength);
  new Uint8Array(result).set(buffer);
  return result;
}

/**
 * Initialise a PDFium instance for testing.
 *
 * @param options - Optional init options
 * @returns A fully initialised PDFium instance (caller must dispose)
 */
export async function initPdfium(options: PDFiumInitOptions = {}): Promise<PDFium> {
  const wasmBinary = await loadWasmBinary();
  // Merge wasmBinary into provided options (explicit wasmBinary in options takes precedence if provided)
  return PDFium.init({ wasmBinary, ...options });
}

/**
 * Initialise a WASM backend explicitly (for benchmarks).
 *
 * Always returns the WASM backend, even if native is available.
 *
 * @returns A fully initialised PDFium WASM instance (caller must dispose)
 */
export async function initWasmBackend(): Promise<PDFium> {
  const wasmBinary = await loadWasmBinary();
  return PDFium.init({ wasmBinary, forceWasm: true });
}

/**
 * Initialise a native backend (for benchmarks).
 *
 * Returns null if the native addon is not available for the current platform.
 *
 * @returns A NativePDFiumInstance, or null if unavailable
 */
export async function initNativeBackend(): Promise<NativePDFiumInstance | null> {
  return PDFium.initNative();
}

/**
 * Check if the native backend is available on this platform.
 */
export function hasNativeBackend(): boolean {
  return loadNativeBinding() !== null;
}

/**
 * Load a test PDF document.
 *
 * @param pdfium - An initialised PDFium instance
 * @param filename - PDF filename relative to test/fixtures/
 * @returns The loaded document (caller must dispose)
 */
export async function loadTestDocument(pdfium: PDFium, filename: string, password?: string): Promise<PDFiumDocument> {
  const pdfData = await readFile(`test/fixtures/${filename}`);
  return pdfium.openDocument(pdfData, password ? { password } : {});
}

/**
 * Load PDF test data as Uint8Array.
 *
 * @param filename - PDF filename relative to test/fixtures/
 * @returns The PDF file data
 */
export async function loadTestPdfData(filename: string): Promise<Uint8Array> {
  const buffer = await readFile(`test/fixtures/${filename}`);
  return new Uint8Array(buffer);
}
