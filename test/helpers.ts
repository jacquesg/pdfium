/**
 * Shared test helpers for PDFium tests.
 *
 * Provides common utilities for loading the WASM binary and initialising
 * PDFium instances in test contexts.
 */

import { readFile } from 'node:fs/promises';
import { PDFium } from '../src/pdfium.js';
import type { PDFiumDocument } from '../src/document/document.js';

/**
 * Load the WASM binary for testing.
 */
export async function loadWasmBinary(): Promise<ArrayBuffer> {
  const buffer = await readFile('src/vendor/pdfium.wasm');
  return buffer.buffer as ArrayBuffer;
}

/**
 * Initialise a PDFium instance for testing.
 *
 * @returns A fully initialised PDFium instance (caller must dispose)
 */
export async function initPdfium(): Promise<PDFium> {
  const wasmBinary = await loadWasmBinary();
  return PDFium.init({ wasmBinary });
}

/**
 * Load a test PDF document.
 *
 * @param pdfium - An initialised PDFium instance
 * @param filename - PDF filename relative to test/data/
 * @returns The loaded document (caller must dispose)
 */
export async function loadTestDocument(pdfium: PDFium, filename: string): Promise<PDFiumDocument> {
  const pdfData = await readFile(`test/data/${filename}`);
  return pdfium.openDocument(pdfData);
}
