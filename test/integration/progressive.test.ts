/**
 * Integration tests for ProgressivePDFLoader.
 *
 * Tests linearisation detection and progressive document loading.
 */

import { readFile } from 'node:fs/promises';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';

import { PDFium } from '../../src/pdfium.js';
import { LinearizationStatus } from '../../src/core/types.js';
import { initPdfium } from '../helpers.js';

describe('ProgressivePDFLoader', () => {
  let pdfium: PDFium;

  beforeAll(async () => {
    pdfium = await initPdfium();
  });

  afterAll(() => {
    pdfium?.dispose();
  });

  test('should create a progressive loader from buffer', async () => {
    const data = await readFile('test/data/test_1.pdf');
    using loader = pdfium.createProgressiveLoader(data);
    expect(loader.disposed).toBe(false);
  });

  test('should detect non-linearised document', async () => {
    const data = await readFile('test/data/test_1.pdf');
    using loader = pdfium.createProgressiveLoader(data);
    // Most test PDFs are not linearised
    expect(loader.linearizationStatus).toBe(LinearizationStatus.NotLinearized);
    expect(loader.isLinearised).toBe(false);
  });

  test('should report document as available for complete buffer', async () => {
    const data = await readFile('test/data/test_1.pdf');
    using loader = pdfium.createProgressiveLoader(data);
    expect(loader.isDocumentAvailable).toBe(true);
  });

  test('should get document from loader', async () => {
    const data = await readFile('test/data/test_1.pdf');
    using loader = pdfium.createProgressiveLoader(data);
    using doc = loader.getDocument();
    expect(doc.pageCount).toBe(4);
  });

  test('should throw when extracting document twice', async () => {
    const data = await readFile('test/data/test_1.pdf');
    using loader = pdfium.createProgressiveLoader(data);
    using doc = loader.getDocument();
    expect(doc.pageCount).toBe(4);
    expect(() => loader.getDocument()).toThrow('already extracted');
  });

  test('should report page availability status', async () => {
    const data = await readFile('test/data/test_1.pdf');
    using loader = pdfium.createProgressiveLoader(data);
    // isPageAvailable returns a boolean — for non-linearised docs, behaviour varies
    const result = loader.isPageAvailable(0);
    expect(typeof result).toBe('boolean');
  });

  test('should accept ArrayBuffer input', async () => {
    const data = await readFile('test/data/test_1.pdf');
    using loader = pdfium.createProgressiveLoader(data.buffer);
    expect(loader.isDocumentAvailable).toBe(true);
  });

  test('should get document with password', async () => {
    const data = await readFile('test/data/test_1_pass_12345678.pdf');
    using loader = pdfium.createProgressiveLoader(data);
    using doc = loader.getDocument('12345678');
    expect(doc.pageCount).toBe(4);
  });

  test('should clean up on dispose', async () => {
    const data = await readFile('test/data/test_1.pdf');
    const loader = pdfium.createProgressiveLoader(data);
    expect(loader.disposed).toBe(false);
    loader.dispose();
    expect(loader.disposed).toBe(true);
  });

  test('should work with different test documents', async () => {
    const data = await readFile('test/data/test_3_with_images.pdf');
    using loader = pdfium.createProgressiveLoader(data);
    using doc = loader.getDocument();
    expect(doc.pageCount).toBeGreaterThan(0);
  });
});
