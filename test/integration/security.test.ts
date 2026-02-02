/**
 * Security-focused integration tests.
 *
 * Tests for NaN/Infinity guards, integer overflow protection, and
 * recursion depth limits.
 */

import { afterAll, beforeAll, describe, expect, test } from 'vitest';

import { PDFiumErrorCode, RenderError } from '../../src/core/errors.js';
import { PDFium } from '../../src/pdfium.js';
import type { PDFiumDocument } from '../../src/document/document.js';
import type { PDFiumPage } from '../../src/document/page.js';
import { initPdfium, loadTestDocument } from '../helpers.js';

describe('Security: render dimension validation', () => {
  let pdfium: PDFium;
  let document: PDFiumDocument;
  let page: PDFiumPage;

  beforeAll(async () => {
    pdfium = await initPdfium();
    document = await loadTestDocument(pdfium, 'test_1.pdf');
    page = document.getPage(0);
  });

  afterAll(() => {
    page?.dispose();
    document?.dispose();
    pdfium?.dispose();
  });

  test('NaN width should throw RenderError with RENDER_INVALID_DIMENSIONS', () => {
    try {
      page.render({ width: NaN, height: 100 });
      expect.fail('Expected RenderError');
    } catch (error) {
      expect(error).toBeInstanceOf(RenderError);
      if (error instanceof RenderError) {
        expect(error.code).toBe(PDFiumErrorCode.RENDER_INVALID_DIMENSIONS);
      }
    }
  });

  test('Infinity height should throw RenderError with RENDER_INVALID_DIMENSIONS', () => {
    try {
      page.render({ width: 100, height: Infinity });
      expect.fail('Expected RenderError');
    } catch (error) {
      expect(error).toBeInstanceOf(RenderError);
      if (error instanceof RenderError) {
        expect(error.code).toBe(PDFiumErrorCode.RENDER_INVALID_DIMENSIONS);
      }
    }
  });

  test('NaN scale should throw RenderError with RENDER_INVALID_DIMENSIONS', () => {
    try {
      page.render({ scale: NaN });
      expect.fail('Expected RenderError');
    } catch (error) {
      expect(error).toBeInstanceOf(RenderError);
      if (error instanceof RenderError) {
        expect(error.code).toBe(PDFiumErrorCode.RENDER_INVALID_DIMENSIONS);
      }
    }
  });

  test('-Infinity dimensions should throw RenderError', () => {
    expect(() => page.render({ width: -Infinity })).toThrow(RenderError);
    expect(() => page.render({ height: -Infinity })).toThrow(RenderError);
  });
});

describe('Security: integer overflow protection', () => {
  let pdfium: PDFium;
  let document: PDFiumDocument;
  let page: PDFiumPage;

  beforeAll(async () => {
    const { readFile } = await import('node:fs/promises');
    const wasmBuffer = await readFile('src/vendor/pdfium.wasm');
    // Use high render limit to test the overflow guard, not the dimension limit
    pdfium = await PDFium.init({
      wasmBinary: wasmBuffer.buffer as ArrayBuffer,
      limits: { maxRenderDimension: 1_000_000 },
    });
    document = await loadTestDocument(pdfium, 'test_1.pdf');
    page = document.getPage(0);
  });

  afterAll(() => {
    page?.dispose();
    document?.dispose();
    pdfium?.dispose();
  });

  test('extremely large dimensions should throw (overflow guard)', () => {
    // Width * height * 4 would overflow Number.MAX_SAFE_INTEGER
    expect(() => page.render({ width: 100_000, height: 100_000 })).toThrow(RenderError);
  });
});

describe('Security: page index validation', () => {
  let pdfium: PDFium;
  let document: PDFiumDocument;

  beforeAll(async () => {
    pdfium = await initPdfium();
    document = await loadTestDocument(pdfium, 'test_1.pdf');
  });

  afterAll(() => {
    document?.dispose();
    pdfium?.dispose();
  });

  test('NaN page index should throw', () => {
    expect(() => document.getPage(NaN)).toThrow();
  });

  test('Infinity page index should throw', () => {
    expect(() => document.getPage(Infinity)).toThrow();
  });

  test('floating point page index should throw', () => {
    expect(() => document.getPage(1.5)).toThrow();
  });
});
