/**
 * Integration tests for PDFium class.
 *
 * These tests require the actual WASM module and test PDF files.
 */

import { readFile } from 'node:fs/promises';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';

import { PDFium } from '../../src/pdfium.js';
import { DocumentError, PageError } from '../../src/core/errors.js';
import type { PDFiumDocument } from '../../src/document/document.js';

/**
 * Load the WASM binary for testing.
 */
async function loadWasmBinary(): Promise<ArrayBuffer> {
  const buffer = await readFile('src/vendor/pdfium.wasm');
  return buffer.buffer as ArrayBuffer;
}

describe('PDFium', () => {
  let pdfium: PDFium;
  let wasmBinary: ArrayBuffer;

  beforeAll(async () => {
    wasmBinary = await loadWasmBinary();
    pdfium = await PDFium.init({ wasmBinary });
  });

  afterAll(() => {
    pdfium?.dispose();
  });

  describe('init', () => {
    test('should initialise successfully', async () => {
      const instance = await PDFium.init({ wasmBinary });
      expect(instance).toBeInstanceOf(PDFium);
      instance.dispose();
    });

    test('should provide module and memory accessors', () => {
      expect(pdfium.module).toBeDefined();
      expect(pdfium.memory).toBeDefined();
    });
  });

  describe('openDocument', () => {
    test('should open a valid PDF document', async () => {
      const pdfData = await readFile('test/data/test_1.pdf');
      using document = await pdfium.openDocument(pdfData);
      expect(document.pageCount).toBe(4);
    });

    test('should throw DocumentError for invalid PDF data', async () => {
      const invalidData = new Uint8Array([0x00, 0x01, 0x02, 0x03]);
      try {
        await pdfium.openDocument(invalidData);
        expect.fail('Expected DocumentError');
      } catch (error) {
        expect(error).toBeInstanceOf(DocumentError);
        if (error instanceof DocumentError) {
          expect(error.code).toBe(201); // DOC_FORMAT_INVALID
        }
      }
    });

    test('should accept ArrayBuffer input', async () => {
      const pdfData = await readFile('test/data/test_1.pdf');
      using document = await pdfium.openDocument(pdfData.buffer);
      expect(document.pageCount).toBe(4);
    });

    test('should throw DocumentError for encrypted document without password', async () => {
      const pdfData = await readFile('test/data/test_1_pass_12345678.pdf');
      try {
        await pdfium.openDocument(pdfData);
        expect.fail('Expected DocumentError');
      } catch (error) {
        expect(error).toBeInstanceOf(DocumentError);
        if (error instanceof DocumentError) {
          expect(error.code).toBe(202); // DOC_PASSWORD_REQUIRED
        }
      }
    });

    test('should open encrypted document with correct password', async () => {
      const pdfData = await readFile('test/data/test_1_pass_12345678.pdf');
      using document = await pdfium.openDocument(pdfData, { password: '12345678' });
      expect(document.pageCount).toBe(4);
    });
  });
});

describe('PDFiumDocument', () => {
  let pdfium: PDFium;
  let document: PDFiumDocument;

  beforeAll(async () => {
    const wasmBinary = await loadWasmBinary();
    pdfium = await PDFium.init({ wasmBinary });

    const pdfData = await readFile('test/data/test_1.pdf');
    document = await pdfium.openDocument(pdfData);
  });

  afterAll(() => {
    document?.dispose();
    pdfium?.dispose();
  });

  describe('pageCount', () => {
    test('should return correct page count', () => {
      expect(document.pageCount).toBe(4);
    });
  });

  describe('getPage', () => {
    test('should load a valid page', () => {
      using page = document.getPage(0);
      expect(page.index).toBe(0);
    });

    test('should throw PageError for invalid page index', () => {
      try {
        document.getPage(100);
        expect.fail('Expected PageError');
      } catch (error) {
        expect(error).toBeInstanceOf(PageError);
        if (error instanceof PageError) {
          expect(error.code).toBe(303); // PAGE_INDEX_OUT_OF_RANGE
        }
      }
    });

    test('should throw PageError for negative page index', () => {
      try {
        document.getPage(-1);
        expect.fail('Expected PageError');
      } catch (error) {
        expect(error).toBeInstanceOf(PageError);
        if (error instanceof PageError) {
          expect(error.code).toBe(303); // PAGE_INDEX_OUT_OF_RANGE
        }
      }
    });
  });

  describe('pages', () => {
    test('should iterate over all pages', () => {
      let count = 0;
      for (const page of document.pages()) {
        using p = page;
        expect(p.index).toBe(count);
        count++;
      }
      expect(count).toBe(4);
    });
  });

  describe('handle', () => {
    test('should provide internal handle for advanced usage', () => {
      expect(document.handle).toBeGreaterThan(0);
    });
  });
});
