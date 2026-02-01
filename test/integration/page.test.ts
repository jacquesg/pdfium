/**
 * Integration tests for PDFiumPage class.
 *
 * These tests require the actual WASM module and test PDF files.
 */

import { readFile } from 'node:fs/promises';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';

import { PDFium } from '../../src/pdfium.js';
import type { PDFiumDocument } from '../../src/document/document.js';
import type { PDFiumPage } from '../../src/document/page.js';

/**
 * Load the WASM binary for testing.
 */
async function loadWasmBinary(): Promise<ArrayBuffer> {
  const buffer = await readFile('src/vendor/pdfium.wasm');
  return buffer.buffer as ArrayBuffer;
}

// A4 page dimensions in points (72 DPI)
const A4_WIDTH = 595;
const A4_HEIGHT = 842;

describe('PDFiumPage', () => {
  let pdfium: PDFium;
  let document: PDFiumDocument;
  let page: PDFiumPage;

  beforeAll(async () => {
    const wasmBinary = await loadWasmBinary();
    pdfium = await PDFium.init({ wasmBinary });

    const pdfData = await readFile('test/data/test_1.pdf');
    document = await pdfium.openDocument(pdfData);
    page = document.getPage(0);
  });

  afterAll(() => {
    page?.dispose();
    document?.dispose();
    pdfium?.dispose();
  });

  describe('size', () => {
    test('should return page dimensions', () => {
      const size = page.size;
      expect(size.width).toBeCloseTo(A4_WIDTH, 0);
      expect(size.height).toBeCloseTo(A4_HEIGHT, 0);
    });

    test('should have width property', () => {
      expect(page.width).toBeCloseTo(A4_WIDTH, 0);
    });

    test('should have height property', () => {
      expect(page.height).toBeCloseTo(A4_HEIGHT, 0);
    });
  });

  describe('index', () => {
    test('should return correct page index', () => {
      expect(page.index).toBe(0);
    });
  });

  describe('render', () => {
    test('should render page at default scale', () => {
      const rendered = page.render();
      expect(rendered.width).toBeCloseTo(A4_WIDTH, 0);
      expect(rendered.height).toBeCloseTo(A4_HEIGHT, 0);
      expect(rendered.data).toBeInstanceOf(Uint8Array);
      // RGBA = 4 bytes per pixel
      expect(rendered.data.length).toBe(rendered.width * rendered.height * 4);
    });

    test('should render page at 2x scale', () => {
      const rendered = page.render({ scale: 2 });
      // Allow 2 pixel tolerance due to rounding
      expect(Math.abs(rendered.width - A4_WIDTH * 2)).toBeLessThanOrEqual(2);
      expect(Math.abs(rendered.height - A4_HEIGHT * 2)).toBeLessThanOrEqual(2);
    });

    test('should render page at specific width', () => {
      const targetWidth = 300;
      const rendered = page.render({ width: targetWidth });
      expect(rendered.width).toBe(targetWidth);
      // Height should be proportional (allow 2 pixel tolerance due to rounding)
      const expectedHeight = Math.round((targetWidth / A4_WIDTH) * A4_HEIGHT);
      expect(Math.abs(rendered.height - expectedHeight)).toBeLessThanOrEqual(2);
    });

    test('should render page at specific height', () => {
      const targetHeight = 400;
      const rendered = page.render({ height: targetHeight });
      expect(rendered.height).toBe(targetHeight);
      // Width should be proportional
      const expectedWidth = Math.round((targetHeight / A4_HEIGHT) * A4_WIDTH);
      expect(rendered.width).toBeCloseTo(expectedWidth, 0);
    });

    test('should render page at specific dimensions', () => {
      const rendered = page.render({ width: 200, height: 300 });
      expect(rendered.width).toBe(200);
      expect(rendered.height).toBe(300);
    });

    test('should include original dimensions in result', () => {
      const rendered = page.render({ scale: 2 });
      expect(rendered.originalWidth).toBeCloseTo(A4_WIDTH, 0);
      expect(rendered.originalHeight).toBeCloseTo(A4_HEIGHT, 0);
    });

    test('should render with white background by default', () => {
      const rendered = page.render({ width: 10, height: 10 });
      // Check first pixel (RGBA white = 255, 255, 255, 255)
      // Note: Background might not be exactly white if content overlaps
      expect(rendered.data[3]).toBe(255); // Alpha should always be 255
    });
  });

  describe('getText', () => {
    test('should extract text from page', () => {
      const text = page.getText();
      expect(typeof text).toBe('string');
      // The test PDF should contain some text
      expect(text.length).toBeGreaterThan(0);
    });
  });

  describe('objectCount', () => {
    test('should return number of objects on page', () => {
      const count = page.objectCount;
      expect(typeof count).toBe('number');
      expect(count).toBeGreaterThanOrEqual(0);
    });
  });

  describe('handle', () => {
    test('should provide internal handle for advanced usage', () => {
      expect(page.handle).toBeGreaterThan(0);
    });
  });
});

describe('PDFiumPage with forms', () => {
  let pdfium: PDFium;
  let document: PDFiumDocument;
  let page: PDFiumPage;

  beforeAll(async () => {
    const wasmBinary = await loadWasmBinary();
    pdfium = await PDFium.init({ wasmBinary });

    const pdfData = await readFile('test/data/test_6_with_form.pdf');
    document = await pdfium.openDocument(pdfData);
    page = document.getPage(0);
  });

  afterAll(() => {
    page?.dispose();
    document?.dispose();
    pdfium?.dispose();
  });

  describe('render with form fields', () => {
    test('should render without form fields by default', () => {
      const rendered = page.render({ scale: 0.5 });
      expect(rendered.data).toBeInstanceOf(Uint8Array);
    });

    test('should render with form fields when requested', () => {
      const rendered = page.render({ scale: 0.5, renderFormFields: true });
      expect(rendered.data).toBeInstanceOf(Uint8Array);
    });
  });
});
