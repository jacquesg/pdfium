/**
 * Integration tests for PDFium class.
 *
 * These tests require the actual WASM module and test PDF files.
 */

import { readFile } from 'node:fs/promises';
import { describe, expect, test } from 'vitest';
import { DocumentError, PageError, PDFiumErrorCode } from '../../src/core/errors.js';
import { SaveFlags } from '../../src/core/types.js';
import { INTERNAL } from '../../src/internal/symbols.js';
import { PDFium } from '../../src/pdfium.js';
import { initPdfium, loadWasmBinary } from '../utils/helpers.js';

describe('PDFium', () => {
  describe('init', () => {
    test('should initialise successfully', async () => {
      const wasmBinary = await loadWasmBinary();
      const instance = await PDFium.init({ wasmBinary });
      expect(instance).toBeInstanceOf(PDFium);
      instance.dispose();
    });

    test('provides internal access via symbol', async () => {
      using pdfium = await initPdfium();
      const internal = pdfium[INTERNAL];
      expect(internal.module).toBeDefined();
      expect(internal.memory).toBeDefined();
    });

    test('should provide limits accessor', async () => {
      using pdfium = await initPdfium();
      expect(pdfium.limits).toBeDefined();
      expect(pdfium.limits.maxDocumentSize).toBeGreaterThan(0);
      expect(pdfium.limits.maxRenderDimension).toBeGreaterThan(0);
      expect(pdfium.limits.maxTextCharCount).toBeGreaterThan(0);
    });

    test('should respect custom limits', async () => {
      const wasmBinary = await loadWasmBinary();
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
      using pdfium = await initPdfium();
      const pdfData = await readFile('test/fixtures/test_1.pdf');
      using document = await pdfium.openDocument(pdfData);
      expect(document.pageCount).toBe(4);
    });

    test('should throw DocumentError for invalid PDF data', async () => {
      using pdfium = await initPdfium();
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
      using pdfium = await initPdfium();
      const pdfData = await readFile('test/fixtures/test_1.pdf');
      using document = await pdfium.openDocument(pdfData.buffer);
      expect(document.pageCount).toBe(4);
    });

    test('should throw DocumentError for encrypted document without password', async () => {
      using pdfium = await initPdfium();
      const pdfData = await readFile('test/fixtures/test_1_pass_12345678.pdf');
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
      using pdfium = await initPdfium();
      const pdfData = await readFile('test/fixtures/test_1_pass_12345678.pdf');
      using document = await pdfium.openDocument(pdfData, { password: '12345678' });
      expect(document.pageCount).toBe(4);
    });

    test('should reject document exceeding size limit', async () => {
      const wasmBinary = await loadWasmBinary();
      using tinyLimit = await PDFium.init({ wasmBinary, limits: { maxDocumentSize: 100 } });
      const pdfData = await readFile('test/fixtures/test_1.pdf');
      try {
        await tinyLimit.openDocument(pdfData);
        expect.fail('Expected DocumentError');
      } catch (error) {
        expect(error).toBeInstanceOf(DocumentError);
        if (error instanceof DocumentError) {
          expect(error.code).toBe(PDFiumErrorCode.DOC_FORMAT_INVALID);
        }
      }
    });

    test('should call onProgress with values from 0 to 1', async () => {
      using pdfium = await initPdfium();
      const pdfData = await readFile('test/fixtures/test_1.pdf');
      const progress: number[] = [];
      using document = await pdfium.openDocument(pdfData, {
        onProgress: (p) => progress.push(p),
      });

      expect(document.pageCount).toBe(4);
      expect(progress[0]).toBe(0);
      expect(progress[progress.length - 1]).toBe(1);
      expect(progress.every((p) => p >= 0 && p <= 1)).toBe(true);
      // Progress should be monotonically increasing
      for (let i = 1; i < progress.length; i++) {
        expect(progress[i]).toBeGreaterThanOrEqual(progress[i - 1] ?? 0);
      }
    });

    test('should not throw if onProgress is not provided', async () => {
      using pdfium = await initPdfium();
      const pdfData = await readFile('test/fixtures/test_1.pdf');
      using document = await pdfium.openDocument(pdfData);
      expect(document.pageCount).toBe(4);
    });
  });
});

describe('PDFiumDocument', () => {
  describe('pageCount', () => {
    test('should return correct page count', async () => {
      using pdfium = await initPdfium();
      const pdfData = await readFile('test/fixtures/test_1.pdf');
      using document = await pdfium.openDocument(pdfData);
      expect(document.pageCount).toBe(4);
    });
  });

  describe('getPage', () => {
    test('should load a valid page', async () => {
      using pdfium = await initPdfium();
      const pdfData = await readFile('test/fixtures/test_1.pdf');
      using document = await pdfium.openDocument(pdfData);
      using page = document.getPage(0);
      expect(page.index).toBe(0);
    });

    test('should throw PageError for invalid page index', async () => {
      using pdfium = await initPdfium();
      const pdfData = await readFile('test/fixtures/test_1.pdf');
      using document = await pdfium.openDocument(pdfData);
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

    test('should throw PageError for negative page index', async () => {
      using pdfium = await initPdfium();
      const pdfData = await readFile('test/fixtures/test_1.pdf');
      using document = await pdfium.openDocument(pdfData);
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
    test('should iterate over all pages', async () => {
      using pdfium = await initPdfium();
      const pdfData = await readFile('test/fixtures/test_1.pdf');
      using document = await pdfium.openDocument(pdfData);
      let count = 0;
      for (const page of document.pages()) {
        using p = page;
        expect(p.index).toBe(count);
        count++;
      }
      expect(count).toBe(4);
    });
  });

  describe('[INTERNAL]', () => {
    test('provides internal handles via symbol', async () => {
      using pdfium = await initPdfium();
      const pdfData = await readFile('test/fixtures/test_1.pdf');
      using document = await pdfium.openDocument(pdfData);
      const internal = document[INTERNAL];
      expect(internal.handle).toBeGreaterThan(0);
      // Form handle may be 0 if no form fill environment was initialised
      expect(typeof internal.formHandle).toBe('number');
    });
  });

  describe('getBookmarks', () => {
    test('should return empty array for document without bookmarks', async () => {
      using pdfium = await initPdfium();
      const pdfData = await readFile('test/fixtures/test_1.pdf');
      using document = await pdfium.openDocument(pdfData);
      const bookmarks = document.getBookmarks();
      expect(bookmarks).toEqual([]);
    });
  });

  describe('attachments', () => {
    test('should return zero attachment count for document without attachments', async () => {
      using pdfium = await initPdfium();
      const pdfData = await readFile('test/fixtures/test_1.pdf');
      using document = await pdfium.openDocument(pdfData);
      expect(document.attachmentCount).toBe(0);
    });

    test('should return empty array from getAttachments for document without attachments', async () => {
      using pdfium = await initPdfium();
      const pdfData = await readFile('test/fixtures/test_1.pdf');
      using document = await pdfium.openDocument(pdfData);
      expect(document.getAttachments()).toEqual([]);
    });

    test('should throw for out-of-range attachment index', async () => {
      using pdfium = await initPdfium();
      const pdfData = await readFile('test/fixtures/test_1.pdf');
      using document = await pdfium.openDocument(pdfData);
      expect(() => document.getAttachment(0)).toThrow();
      expect(() => document.getAttachment(-1)).toThrow();
    });

    test('attachments() returns a generator', async () => {
      using pdfium = await initPdfium();
      const pdfData = await readFile('test/fixtures/test_1.pdf');
      using document = await pdfium.openDocument(pdfData);
      const gen = document.attachments();
      expect(gen[Symbol.iterator]).toBeDefined();
      expect(typeof gen.next).toBe('function');
    });

    test('attachments() yields same attachments as getAttachments()', async () => {
      using pdfium = await initPdfium();
      const pdfData = await readFile('test/fixtures/test_1.pdf');
      using document = await pdfium.openDocument(pdfData);
      const fromGenerator = [...document.attachments()];
      const fromArray = document.getAttachments();
      expect(fromGenerator).toEqual(fromArray);
    });
  });

  describe('attachments with attachment PDF', () => {
    test('should return attachment count from PDF with attachments', async () => {
      using pdfium = await initPdfium();
      const pdfData = await readFile('test/fixtures/test_9_with_attachment.pdf');
      using doc = await pdfium.openDocument(pdfData);
      expect(doc.attachmentCount).toBe(1);
    });

    test('should read attachment name and data', async () => {
      using pdfium = await initPdfium();
      const pdfData = await readFile('test/fixtures/test_9_with_attachment.pdf');
      using doc = await pdfium.openDocument(pdfData);
      const attachment = doc.getAttachment(0);
      expect(attachment.index).toBe(0);
      expect(attachment.name).toBe('test-attachment.txt');
      expect(attachment.data.length).toBeGreaterThan(0);
      const text = new TextDecoder().decode(attachment.data);
      expect(text).toBe('Hello from attachment!\n');
    });

    test('should get all attachments via getAttachments', async () => {
      using pdfium = await initPdfium();
      const pdfData = await readFile('test/fixtures/test_9_with_attachment.pdf');
      using doc = await pdfium.openDocument(pdfData);
      const attachments = doc.getAttachments();
      expect(attachments.length).toBe(1);
      expect(attachments[0]!.name).toBe('test-attachment.txt');
    });

    test('attachments() generator yields same attachments', async () => {
      using pdfium = await initPdfium();
      const pdfData = await readFile('test/fixtures/test_9_with_attachment.pdf');
      using doc = await pdfium.openDocument(pdfData);
      const fromGenerator = [...doc.attachments()];
      const fromArray = doc.getAttachments();
      expect(fromGenerator).toEqual(fromArray);
      expect(fromGenerator.length).toBe(1);
    });

    test('attachments() is lazy - can break early', async () => {
      using pdfium = await initPdfium();
      const pdfData = await readFile('test/fixtures/test_9_with_attachment.pdf');
      using doc = await pdfium.openDocument(pdfData);
      const gen = doc.attachments();
      const first = gen.next();
      expect(first.done).toBe(false);
      expect(first.value).toHaveProperty('name');
      expect(first.value).toHaveProperty('data');
    });
  });

  describe('getBookmarks with bookmark PDF', () => {
    test('should return bookmarks from document with bookmarks', async () => {
      using pdfium = await initPdfium();
      const pdfData = await readFile('test/fixtures/test_3_with_images.pdf');
      using doc = await pdfium.openDocument(pdfData);
      const bookmarks = doc.getBookmarks();
      expect(bookmarks.length).toBeGreaterThan(0);
    });

    test('bookmark should have title and children', async () => {
      using pdfium = await initPdfium();
      const pdfData = await readFile('test/fixtures/test_3_with_images.pdf');
      using doc = await pdfium.openDocument(pdfData);
      const bookmarks = doc.getBookmarks();
      const first = bookmarks[0]!;
      expect(typeof first.title).toBe('string');
      expect(first.title.length).toBeGreaterThan(0);
      expect(Array.isArray(first.children)).toBe(true);
    });

    test('bookmark should have pageIndex or undefined', async () => {
      using pdfium = await initPdfium();
      const pdfData = await readFile('test/fixtures/test_3_with_images.pdf');
      using doc = await pdfium.openDocument(pdfData);
      const bookmarks = doc.getBookmarks();
      const first = bookmarks[0]!;
      if (first.pageIndex !== undefined) {
        expect(typeof first.pageIndex).toBe('number');
        expect(first.pageIndex).toBeGreaterThanOrEqual(0);
      }
    });

    test('bookmarks() generator should yield same results as getBookmarks()', async () => {
      using pdfium = await initPdfium();
      const pdfData = await readFile('test/fixtures/test_3_with_images.pdf');
      using doc = await pdfium.openDocument(pdfData);
      const eager = doc.getBookmarks();
      const lazy = [...doc.bookmarks()];
      expect(lazy.length).toBe(eager.length);
      for (let i = 0; i < eager.length; i++) {
        expect(lazy[i]!.title).toBe(eager[i]!.title);
        expect(lazy[i]!.pageIndex).toBe(eager[i]!.pageIndex);
      }
    });
  });

  describe('save', () => {
    test('should save document to bytes', async () => {
      using pdfium = await initPdfium();
      const pdfData = await readFile('test/fixtures/test_1.pdf');
      using document = await pdfium.openDocument(pdfData);
      const bytes = document.save();
      expect(bytes).toBeInstanceOf(Uint8Array);
      expect(bytes.length).toBeGreaterThan(0);
      // PDF files start with %PDF-
      const header = new TextDecoder().decode(bytes.subarray(0, 5));
      expect(header).toBe('%PDF-');
    });

    test('should produce a valid PDF that can be re-opened', async () => {
      using pdfium = await initPdfium();
      const pdfData = await readFile('test/fixtures/test_1.pdf');
      using document = await pdfium.openDocument(pdfData);
      const bytes = document.save();
      using reopened = await pdfium.openDocument(bytes);
      expect(reopened.pageCount).toBe(4);
    });

    test('should save with version option', async () => {
      using pdfium = await initPdfium();
      const pdfData = await readFile('test/fixtures/test_1.pdf');
      using document = await pdfium.openDocument(pdfData);
      const bytes = document.save({ version: 17 });
      expect(bytes.length).toBeGreaterThan(0);
      using reopened = await pdfium.openDocument(bytes);
      expect(reopened.pageCount).toBe(4);
    });

    test('should preserve text content after save round-trip', async () => {
      using pdfium = await initPdfium();
      const pdfData = await readFile('test/fixtures/test_1.pdf');
      using document = await pdfium.openDocument(pdfData);
      const bytes = document.save();
      using reopened = await pdfium.openDocument(bytes);
      using originalPage = document.getPage(0);
      using reopenedPage = reopened.getPage(0);
      const originalText = originalPage.getText();
      const reopenedText = reopenedPage.getText();
      expect(reopenedText).toBe(originalText);
    });
  });

  describe('post-dispose guards', () => {
    test('should throw on pageCount after dispose', async () => {
      using pdfium = await initPdfium();
      const pdfData = await readFile('test/fixtures/test_1.pdf');
      const doc = await pdfium.openDocument(pdfData);
      doc.dispose();
      expect(() => doc.pageCount).toThrow();
    });

    test('should throw on getPage after dispose', async () => {
      using pdfium = await initPdfium();
      const pdfData = await readFile('test/fixtures/test_1.pdf');
      const doc = await pdfium.openDocument(pdfData);
      doc.dispose();
      expect(() => doc.getPage(0)).toThrow();
    });

    test('should throw on getBookmarks after dispose', async () => {
      using pdfium = await initPdfium();
      const pdfData = await readFile('test/fixtures/test_1.pdf');
      const doc = await pdfium.openDocument(pdfData);
      doc.dispose();
      expect(() => doc.getBookmarks()).toThrow();
    });

    test('should throw on save after dispose', async () => {
      using pdfium = await initPdfium();
      const pdfData = await readFile('test/fixtures/test_1.pdf');
      const doc = await pdfium.openDocument(pdfData);
      doc.dispose();
      expect(() => doc.save()).toThrow();
    });

    test('should throw on getAttachments after dispose', async () => {
      using pdfium = await initPdfium();
      const pdfData = await readFile('test/fixtures/test_1.pdf');
      const doc = await pdfium.openDocument(pdfData);
      doc.dispose();
      expect(() => doc.getAttachments()).toThrow();
    });

    test('should throw on attachmentCount after dispose', async () => {
      using pdfium = await initPdfium();
      const pdfData = await readFile('test/fixtures/test_1.pdf');
      const doc = await pdfium.openDocument(pdfData);
      doc.dispose();
      expect(() => doc.attachmentCount).toThrow();
    });
  });

  describe('save with flags', () => {
    test('should save with INCREMENTAL flag', async () => {
      using pdfium = await initPdfium();
      const pdfData = await readFile('test/fixtures/test_1.pdf');
      using document = await pdfium.openDocument(pdfData);
      const bytes = document.save({ flags: SaveFlags.Incremental });
      expect(bytes).toBeInstanceOf(Uint8Array);
      expect(bytes.length).toBeGreaterThan(0);
    });

    test('should save with NO_INCREMENTAL flag', async () => {
      using pdfium = await initPdfium();
      const pdfData = await readFile('test/fixtures/test_1.pdf');
      using document = await pdfium.openDocument(pdfData);
      const bytes = document.save({ flags: SaveFlags.NoIncremental });
      expect(bytes).toBeInstanceOf(Uint8Array);
      expect(bytes.length).toBeGreaterThan(0);
    });

    test('should save with REMOVE_SECURITY flag', async () => {
      using pdfium = await initPdfium();
      const pdfData = await readFile('test/fixtures/test_1.pdf');
      using document = await pdfium.openDocument(pdfData);
      const bytes = document.save({ flags: SaveFlags.RemoveSecurity });
      expect(bytes).toBeInstanceOf(Uint8Array);
      expect(bytes.length).toBeGreaterThan(0);
    });
  });

  describe('wrong password', () => {
    test('should throw for wrong password on encrypted document', async () => {
      using pdfium = await initPdfium();
      const pdfData = await readFile('test/fixtures/test_1_pass_12345678.pdf');
      try {
        await pdfium.openDocument(pdfData, { password: 'wrong_password' });
        expect.fail('Expected DocumentError');
      } catch (error) {
        expect(error).toBeInstanceOf(DocumentError);
        if (error instanceof DocumentError) {
          expect([PDFiumErrorCode.DOC_PASSWORD_REQUIRED, PDFiumErrorCode.DOC_PASSWORD_INCORRECT]).toContain(error.code);
        }
      }
    });
  });

  describe('resource lifecycle', () => {
    test('should dispose open pages when document is disposed', async () => {
      using pdfium = await initPdfium();
      const pdfData = await readFile('test/fixtures/test_1.pdf');
      const doc = await pdfium.openDocument(pdfData);
      const page = doc.getPage(0);
      expect(page.disposed).toBe(false);
      doc.dispose();
      expect(page.disposed).toBe(true);
    });

    test('should handle page disposed before document', async () => {
      using pdfium = await initPdfium();
      const pdfData = await readFile('test/fixtures/test_1.pdf');
      const doc = await pdfium.openDocument(pdfData);
      const page = doc.getPage(0);
      page.dispose();
      expect(page.disposed).toBe(true);
      // Document dispose should not double-free
      expect(() => doc.dispose()).not.toThrow();
    });

    test('should track pages from pages() generator', async () => {
      using pdfium = await initPdfium();
      const pdfData = await readFile('test/fixtures/test_1.pdf');
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

describe('openDocument progress callback edge cases', () => {
  test('progress values are monotonically non-decreasing', async () => {
    using pdfium = await initPdfium();
    const pdfData = await readFile('test/fixtures/test_1.pdf');
    const progress: number[] = [];
    using doc = await pdfium.openDocument(pdfData, {
      onProgress: (p) => progress.push(p),
    });
    expect(doc).toBeDefined();

    expect(progress.length).toBeGreaterThan(2);
    for (let i = 1; i < progress.length; i++) {
      const prev = progress[i - 1];
      const curr = progress[i];
      expect(curr).toBeGreaterThanOrEqual(prev ?? 0);
    }
  });

  test('progress starts at 0 and ends at 1', async () => {
    using pdfium = await initPdfium();
    const pdfData = await readFile('test/fixtures/test_1.pdf');
    const progress: number[] = [];
    using doc = await pdfium.openDocument(pdfData, {
      onProgress: (p) => progress.push(p),
    });
    expect(doc).toBeDefined();

    expect(progress[0]).toBe(0);
    expect(progress[progress.length - 1]).toBe(1);
  });

  test('progress callback receives number type', async () => {
    using pdfium = await initPdfium();
    const pdfData = await readFile('test/fixtures/test_1.pdf');
    const progress: unknown[] = [];
    using doc = await pdfium.openDocument(pdfData, {
      onProgress: (p) => progress.push(p),
    });
    expect(doc).toBeDefined();

    expect(progress.every((p) => typeof p === 'number')).toBe(true);
  });

  test('openDocument works without progress callback', async () => {
    using pdfium = await initPdfium();
    const pdfData = await readFile('test/fixtures/test_1.pdf');
    using doc = await pdfium.openDocument(pdfData);
    expect(doc).toBeDefined();
    expect(doc.pageCount).toBe(4);
  });
});

describe('document generators on disposed resources', () => {
  test('attachments() throws on disposed document', async () => {
    using pdfium = await initPdfium();
    const pdfData = await readFile('test/fixtures/test_9_with_attachment.pdf');
    const doc = await pdfium.openDocument(pdfData);
    doc.dispose();
    expect(() => doc.attachments().next()).toThrow();
  });

  test('signatures() throws on disposed document', async () => {
    using pdfium = await initPdfium();
    const pdfData = await readFile('test/fixtures/test_8_with_signature.pdf');
    const doc = await pdfium.openDocument(pdfData);
    doc.dispose();
    expect(() => doc.signatures().next()).toThrow();
  });

  test('pages() throws on disposed document', async () => {
    using pdfium = await initPdfium();
    const pdfData = await readFile('test/fixtures/test_1.pdf');
    const doc = await pdfium.openDocument(pdfData);
    doc.dispose();
    expect(() => doc.pages().next()).toThrow();
  });

  test('INTERNAL access throws on disposed document', async () => {
    using pdfium = await initPdfium();
    const pdfData = await readFile('test/fixtures/test_1.pdf');
    const doc = await pdfium.openDocument(pdfData);
    doc.dispose();
    expect(() => doc[INTERNAL]).toThrow();
  });
});

describe('empty collection generators on document', () => {
  test('attachments() yields nothing for document without attachments', async () => {
    using pdfium = await initPdfium();
    const pdfData = await readFile('test/fixtures/test_1.pdf');
    using doc = await pdfium.openDocument(pdfData);
    const attachments = [...doc.attachments()];
    expect(attachments).toEqual([]);
  });

  test('signatures() yields nothing for document without signatures', async () => {
    using pdfium = await initPdfium();
    const pdfData = await readFile('test/fixtures/test_1.pdf');
    using doc = await pdfium.openDocument(pdfData);
    const signatures = [...doc.signatures()];
    expect(signatures).toEqual([]);
  });
});

describe('document metadata and properties', () => {
  test('getMetadata returns metadata object', async () => {
    using pdfium = await initPdfium();
    const pdfData = await readFile('test/fixtures/test_10_with_metadata.pdf');
    using doc = await pdfium.openDocument(pdfData);
    const metadata = doc.getMetadata();
    expect(metadata).toBeDefined();
    expect(typeof metadata).toBe('object');
  });

  test('getMetadata works on document without metadata', async () => {
    using pdfium = await initPdfium();
    const pdfData = await readFile('test/fixtures/test_1.pdf');
    using doc = await pdfium.openDocument(pdfData);
    const metadata = doc.getMetadata();
    expect(metadata).toBeDefined();
    expect(typeof metadata).toBe('object');
  });

  test('namedDestinationCount returns a number', async () => {
    using pdfium = await initPdfium();
    const pdfData = await readFile('test/fixtures/test_1.pdf');
    using doc = await pdfium.openDocument(pdfData);
    expect(typeof doc.namedDestinationCount).toBe('number');
    expect(doc.namedDestinationCount).toBeGreaterThanOrEqual(0);
  });

  test('getViewerPreference returns undefined for missing key', async () => {
    using pdfium = await initPdfium();
    const pdfData = await readFile('test/fixtures/test_1.pdf');
    using doc = await pdfium.openDocument(pdfData);
    const pref = doc.getViewerPreference('NonExistentPref');
    expect(pref).toBeUndefined();
  });

  test('javaScriptActionCount returns a number', async () => {
    using pdfium = await initPdfium();
    const pdfData = await readFile('test/fixtures/test_1.pdf');
    using doc = await pdfium.openDocument(pdfData);
    expect(typeof doc.javaScriptActionCount).toBe('number');
    expect(doc.javaScriptActionCount).toBeGreaterThanOrEqual(0);
  });

  test('signatureCount returns a number', async () => {
    using pdfium = await initPdfium();
    const pdfData = await readFile('test/fixtures/test_1.pdf');
    using doc = await pdfium.openDocument(pdfData);
    expect(typeof doc.signatureCount).toBe('number');
    expect(doc.signatureCount).toBeGreaterThanOrEqual(0);
  });

  test('attachmentCount returns a number', async () => {
    using pdfium = await initPdfium();
    const pdfData = await readFile('test/fixtures/test_1.pdf');
    using doc = await pdfium.openDocument(pdfData);
    expect(typeof doc.attachmentCount).toBe('number');
    expect(doc.attachmentCount).toBeGreaterThanOrEqual(0);
  });
});

describe('document page retrieval', () => {
  test('getPage throws for negative index', async () => {
    using pdfium = await initPdfium();
    const pdfData = await readFile('test/fixtures/test_1.pdf');
    using doc = await pdfium.openDocument(pdfData);
    expect(() => doc.getPage(-1)).toThrow();
  });

  test('getPage throws for index >= pageCount', async () => {
    using pdfium = await initPdfium();
    const pdfData = await readFile('test/fixtures/test_1.pdf');
    using doc = await pdfium.openDocument(pdfData);
    expect(() => doc.getPage(doc.pageCount)).toThrow();
    expect(() => doc.getPage(999)).toThrow();
  });

  test('pages() generator yields correct number of pages', async () => {
    using pdfium = await initPdfium();
    const pdfData = await readFile('test/fixtures/test_1.pdf');
    using doc = await pdfium.openDocument(pdfData);
    const pages = [...doc.pages()];
    expect(pages.length).toBe(doc.pageCount);
    // Clean up pages
    for (const page of pages) {
      page.dispose();
    }
  });

  test('getPageLabel returns string or undefined', async () => {
    using pdfium = await initPdfium();
    const pdfData = await readFile('test/fixtures/test_1.pdf');
    using doc = await pdfium.openDocument(pdfData);
    const label = doc.getPageLabel(0);
    // May or may not have labels
    expect(label === undefined || typeof label === 'string').toBe(true);
  });
});

describe('document save options', () => {
  test('save with no flags', async () => {
    using pdfium = await initPdfium();
    const pdfData = await readFile('test/fixtures/test_1.pdf');
    using doc = await pdfium.openDocument(pdfData);
    const bytes = doc.save();
    expect(bytes).toBeInstanceOf(Uint8Array);
    expect(bytes.length).toBeGreaterThan(0);
  });

  test('save with incremental flag', async () => {
    using pdfium = await initPdfium();
    const pdfData = await readFile('test/fixtures/test_1.pdf');
    using doc = await pdfium.openDocument(pdfData);
    const bytes = doc.save({ flags: SaveFlags.Incremental });
    expect(bytes).toBeInstanceOf(Uint8Array);
    expect(bytes.length).toBeGreaterThan(0);
  });

  test('save with noIncremental flag', async () => {
    using pdfium = await initPdfium();
    const pdfData = await readFile('test/fixtures/test_1.pdf');
    using doc = await pdfium.openDocument(pdfData);
    const bytes = doc.save({ flags: SaveFlags.NoIncremental });
    expect(bytes).toBeInstanceOf(Uint8Array);
    expect(bytes.length).toBeGreaterThan(0);
  });

  test('save with removeSecurityFlag', async () => {
    using pdfium = await initPdfium();
    const pdfData = await readFile('test/fixtures/test_1.pdf');
    using doc = await pdfium.openDocument(pdfData);
    const bytes = doc.save({ flags: SaveFlags.RemoveSecurity });
    expect(bytes).toBeInstanceOf(Uint8Array);
    expect(bytes.length).toBeGreaterThan(0);
  });
});
