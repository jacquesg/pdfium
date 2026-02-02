/**
 * Integration tests for PDFium class.
 *
 * These tests require the actual WASM module and test PDF files.
 */

import { readFile } from 'node:fs/promises';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';

import { PDFium } from '../../src/pdfium.js';
import { DocumentError, PageError, PDFiumErrorCode } from '../../src/core/errors.js';
import type { PDFiumDocument } from '../../src/document/document.js';
import { initPdfium, loadWasmBinary } from '../helpers.js';

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

    test('should provide limits accessor', () => {
      expect(pdfium.limits).toBeDefined();
      expect(pdfium.limits.maxDocumentSize).toBeGreaterThan(0);
      expect(pdfium.limits.maxRenderDimension).toBeGreaterThan(0);
      expect(pdfium.limits.maxTextCharCount).toBeGreaterThan(0);
    });

    test('should respect custom limits', async () => {
      const instance = await PDFium.init({
        wasmBinary,
        limits: { maxDocumentSize: 1024, maxRenderDimension: 100 },
      });
      expect(instance.limits.maxDocumentSize).toBe(1024);
      expect(instance.limits.maxRenderDimension).toBe(100);
      instance.dispose();
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

    test('should reject document exceeding size limit', async () => {
      const tinyLimit = await PDFium.init({ wasmBinary, limits: { maxDocumentSize: 100 } });
      const pdfData = await readFile('test/data/test_1.pdf');
      try {
        await tinyLimit.openDocument(pdfData);
        expect.fail('Expected DocumentError');
      } catch (error) {
        expect(error).toBeInstanceOf(DocumentError);
        if (error instanceof DocumentError) {
          expect(error.code).toBe(PDFiumErrorCode.DOC_FORMAT_INVALID);
        }
      } finally {
        tinyLimit.dispose();
      }
    });
  });
});

describe('PDFiumDocument', () => {
  let pdfium: PDFium;
  let document: PDFiumDocument;

  beforeAll(async () => {
    pdfium = await initPdfium();

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

  describe('getBookmarks', () => {
    test('should return empty array for document without bookmarks', () => {
      const bookmarks = document.getBookmarks();
      expect(bookmarks).toEqual([]);
    });
  });

  describe('formHandle', () => {
    test('should provide form handle for advanced usage', () => {
      // Form handle may be 0 if no form fill environment was initialised
      expect(typeof document.formHandle).toBe('number');
    });
  });

  describe('attachments', () => {
    test('should return zero attachment count for document without attachments', () => {
      expect(document.attachmentCount).toBe(0);
    });

    test('should return empty array from getAttachments for document without attachments', () => {
      expect(document.getAttachments()).toEqual([]);
    });

    test('should throw for out-of-range attachment index', () => {
      expect(() => document.getAttachment(0)).toThrow();
      expect(() => document.getAttachment(-1)).toThrow();
    });
  });

  describe('attachments with attachment PDF', () => {
    test('should return attachment count from PDF with attachments', async () => {
      const pdfData = await readFile('test/data/test_9_with_attachment.pdf');
      using doc = await pdfium.openDocument(pdfData);
      expect(doc.attachmentCount).toBe(1);
    });

    test('should read attachment name and data', async () => {
      const pdfData = await readFile('test/data/test_9_with_attachment.pdf');
      using doc = await pdfium.openDocument(pdfData);
      const attachment = doc.getAttachment(0);
      expect(attachment.index).toBe(0);
      expect(attachment.name).toBe('test-attachment.txt');
      expect(attachment.data.length).toBeGreaterThan(0);
      const text = new TextDecoder().decode(attachment.data);
      expect(text).toBe('Hello from attachment!\n');
    });

    test('should get all attachments via getAttachments', async () => {
      const pdfData = await readFile('test/data/test_9_with_attachment.pdf');
      using doc = await pdfium.openDocument(pdfData);
      const attachments = doc.getAttachments();
      expect(attachments.length).toBe(1);
      expect(attachments[0]!.name).toBe('test-attachment.txt');
    });
  });

  describe('getBookmarks with bookmark PDF', () => {
    test('should return bookmarks from document with bookmarks', async () => {
      const pdfData = await readFile('test/data/test_3_with_images.pdf');
      using doc = await pdfium.openDocument(pdfData);
      const bookmarks = doc.getBookmarks();
      expect(bookmarks.length).toBeGreaterThan(0);
    });

    test('bookmark should have title and children', async () => {
      const pdfData = await readFile('test/data/test_3_with_images.pdf');
      using doc = await pdfium.openDocument(pdfData);
      const bookmarks = doc.getBookmarks();
      const first = bookmarks[0]!;
      expect(typeof first.title).toBe('string');
      expect(first.title.length).toBeGreaterThan(0);
      expect(Array.isArray(first.children)).toBe(true);
    });

    test('bookmark should have pageIndex or undefined', async () => {
      const pdfData = await readFile('test/data/test_3_with_images.pdf');
      using doc = await pdfium.openDocument(pdfData);
      const bookmarks = doc.getBookmarks();
      const first = bookmarks[0]!;
      if (first.pageIndex !== undefined) {
        expect(typeof first.pageIndex).toBe('number');
        expect(first.pageIndex).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('save', () => {
    test('should save document to bytes', () => {
      const bytes = document.save();
      expect(bytes).toBeInstanceOf(Uint8Array);
      expect(bytes.length).toBeGreaterThan(0);
      // PDF files start with %PDF-
      const header = new TextDecoder().decode(bytes.subarray(0, 5));
      expect(header).toBe('%PDF-');
    });

    test('should produce a valid PDF that can be re-opened', async () => {
      const bytes = document.save();
      using reopened = await pdfium.openDocument(bytes);
      expect(reopened.pageCount).toBe(4);
    });

    test('should save with version option', async () => {
      const bytes = document.save({ version: 17 });
      expect(bytes.length).toBeGreaterThan(0);
      using reopened = await pdfium.openDocument(bytes);
      expect(reopened.pageCount).toBe(4);
    });

    test('should preserve text content after save round-trip', async () => {
      const bytes = document.save();
      using reopened = await pdfium.openDocument(bytes);
      using originalPage = document.getPage(0);
      using reopenedPage = reopened.getPage(0);
      const originalText = originalPage.getText();
      const reopenedText = reopenedPage.getText();
      expect(reopenedText).toBe(originalText);
    });
  });

  describe('resource lifecycle', () => {
    test('should dispose open pages when document is disposed', async () => {
      const pdfData = await readFile('test/data/test_1.pdf');
      const doc = await pdfium.openDocument(pdfData);
      const page = doc.getPage(0);
      expect(page.disposed).toBe(false);
      doc.dispose();
      expect(page.disposed).toBe(true);
    });

    test('should handle page disposed before document', async () => {
      const pdfData = await readFile('test/data/test_1.pdf');
      const doc = await pdfium.openDocument(pdfData);
      const page = doc.getPage(0);
      page.dispose();
      expect(page.disposed).toBe(true);
      // Document dispose should not double-free
      expect(() => doc.dispose()).not.toThrow();
    });

    test('should track pages from pages() generator', async () => {
      const pdfData = await readFile('test/data/test_1.pdf');
      const doc = await pdfium.openDocument(pdfData);
      const pages: { disposed: boolean }[] = [];
      for (const page of doc.pages()) {
        pages.push(page);
      }
      expect(pages.length).toBe(4);
      doc.dispose();
      for (const page of pages) {
        expect(page.disposed).toBe(true);
      }
    });
  });
});
