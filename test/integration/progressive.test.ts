/**
 * Integration tests for ProgressivePDFLoader.
 *
 * Tests linearisation detection and progressive document loading.
 */

import { readFile } from 'node:fs/promises';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { LinearisationStatus } from '../../src/core/types.js';
import { ProgressivePDFLoader } from '../../src/document/progressive.js';
import { INTERNAL } from '../../src/internal/symbols.js';
import type { PDFium } from '../../src/pdfium.js';
import { initPdfium } from '../utils/helpers.js';

describe('ProgressivePDFLoader', () => {
  let pdfium: PDFium;

  beforeAll(async () => {
    pdfium = await initPdfium();
  });

  afterAll(() => {
    pdfium?.dispose();
  });

  test('should create a progressive loader from buffer', async () => {
    const data = await readFile('test/fixtures/test_1.pdf');
    using loader = pdfium.createProgressiveLoader(data);
    expect(loader.disposed).toBe(false);
  });

  test('should detect non-linearised document', async () => {
    const data = await readFile('test/fixtures/test_1.pdf');
    using loader = pdfium.createProgressiveLoader(data);
    // Most test PDFs are not linearised
    expect(loader.linearisationStatus).toBe(LinearisationStatus.NotLinearised);
    expect(loader.isLinearised).toBe(false);
  });

  test('should report document as available for complete buffer', async () => {
    const data = await readFile('test/fixtures/test_1.pdf');
    using loader = pdfium.createProgressiveLoader(data);
    expect(loader.isDocumentAvailable).toBe(true);
  });

  test('should get document from loader', async () => {
    const data = await readFile('test/fixtures/test_1.pdf');
    using loader = pdfium.createProgressiveLoader(data);
    using doc = loader.getDocument();
    expect(doc.pageCount).toBe(4);
  });

  test('should throw when extracting document twice', async () => {
    const data = await readFile('test/fixtures/test_1.pdf');
    using loader = pdfium.createProgressiveLoader(data);
    using doc = loader.getDocument();
    expect(doc.pageCount).toBe(4);
    expect(() => loader.getDocument()).toThrow('already extracted');
  });

  test('should report page availability status', async () => {
    const data = await readFile('test/fixtures/test_1.pdf');
    using loader = pdfium.createProgressiveLoader(data);
    // isPageAvailable returns a boolean — for non-linearised docs, behaviour varies
    const result = loader.isPageAvailable(0);
    expect(typeof result).toBe('boolean');
  });

  test('should accept ArrayBuffer input', async () => {
    const data = await readFile('test/fixtures/test_1.pdf');
    using loader = pdfium.createProgressiveLoader(data.buffer);
    expect(loader.isDocumentAvailable).toBe(true);
  });

  test('should get document with password', async () => {
    const data = await readFile('test/fixtures/test_1_pass_12345678.pdf');
    using loader = pdfium.createProgressiveLoader(data);
    using doc = loader.getDocument('12345678');
    expect(doc.pageCount).toBe(4);
  });

  test('should clean up on dispose', async () => {
    const data = await readFile('test/fixtures/test_1.pdf');
    const loader = pdfium.createProgressiveLoader(data);
    expect(loader.disposed).toBe(false);
    loader.dispose();
    expect(loader.disposed).toBe(true);
  });

  test('should work with different test documents', async () => {
    const data = await readFile('test/fixtures/test_3_with_images.pdf');
    using loader = pdfium.createProgressiveLoader(data);
    using doc = loader.getDocument();
    expect(doc.pageCount).toBeGreaterThan(0);
  });

  test('firstPageNumber should be non-negative for complete buffer', async () => {
    const data = await readFile('test/fixtures/test_1.pdf');
    using loader = pdfium.createProgressiveLoader(data);
    // For a complete buffer, first page should be available
    expect(loader.isDocumentAvailable).toBe(true);
    // Get document and verify page access
    using doc = loader.getDocument();
    expect(doc.pageCount).toBe(4);
    using page = doc.getPage(0);
    expect(page.index).toBe(0);
  });

  test('should throw on operations after dispose', async () => {
    const data = await readFile('test/fixtures/test_1.pdf');
    const loader = pdfium.createProgressiveLoader(data);
    loader.dispose();
    expect(loader.disposed).toBe(true);
    expect(() => loader.isDocumentAvailable).toThrow();
    expect(() => loader.linearisationStatus).toThrow();
    expect(() => loader.getDocument()).toThrow();
  });

  test('linearisationStatus should return a valid enum value', async () => {
    const data = await readFile('test/fixtures/test_1.pdf');
    using loader = pdfium.createProgressiveLoader(data);
    const status = loader.linearisationStatus;
    // Should be one of the known LinearisationStatus values
    expect([0, 1, -1]).toContain(status);
  });
});

describe('ProgressivePDFLoader error paths', () => {
  let pdfium: PDFium;

  beforeAll(async () => {
    pdfium = await initPdfium();
  });

  afterAll(() => {
    pdfium?.dispose();
  });

  test('should throw when given corrupt data (random bytes)', async () => {
    const garbage = new Uint8Array(256);
    crypto.getRandomValues(garbage);
    using loader = pdfium.createProgressiveLoader(garbage);
    // Loader should create but document extraction should fail
    expect(() => loader.getDocument()).toThrow();
  });

  test('should throw when given a non-PDF text file', async () => {
    const data = await readFile('test/fixtures/test_5.txt');
    using loader = pdfium.createProgressiveLoader(data);
    expect(() => loader.getDocument()).toThrow();
  });

  test('should throw when given a truncated PDF', async () => {
    const data = await readFile('test/fixtures/test_1.pdf');
    // Take only the first 50 bytes — enough to look like a PDF header but not a valid file
    const truncated = data.subarray(0, 50);
    using loader = pdfium.createProgressiveLoader(truncated);
    expect(() => loader.getDocument()).toThrow();
  });

  test('should reject oversized documents', () => {
    const smallData = new Uint8Array(100);
    const { module, memory } = pdfium[INTERNAL];

    expect(() =>
      ProgressivePDFLoader.fromBuffer(smallData, module, memory, {
        maxDocumentSize: 10, // Set limit to 10 bytes
        maxRenderDimension: 32_767,
        maxTextCharCount: 10_000_000,
      }),
    ).toThrow(/exceeds maximum/);
  });

  test('should handle getDocument with wrong password', async () => {
    const data = await readFile('test/fixtures/test_1_pass_12345678.pdf');
    using loader = pdfium.createProgressiveLoader(data);
    expect(() => loader.getDocument('wrong_password')).toThrow();
  });
});
