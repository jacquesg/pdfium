/**
 * Integration tests for PDFium class.
 *
 * These tests require the actual WASM module and test PDF files.
 */

import { DocumentError, PageError, PDFiumErrorCode } from '../../src/core/errors.js';
import { SaveFlags } from '../../src/core/types.js';
import { INTERNAL } from '../../src/internal/symbols.js';
import { PDFium } from '../../src/pdfium.js';
import { describe, expect, test } from '../utils/fixtures.js';
import { loadTestPdfData, loadWasmBinary } from '../utils/helpers.js';

describe('PDFium', () => {
  describe('init', () => {
    test('should initialise successfully', async () => {
      const wasmBinary = await loadWasmBinary();
      const instance = await PDFium.init({ wasmBinary });
      expect(instance).toBeInstanceOf(PDFium);
      instance.dispose();
    });

    test('provides internal access via symbol', async ({ pdfium }) => {
      const internal = pdfium[INTERNAL];
      expect(internal.module).toBeDefined();
      expect(internal.memory).toBeDefined();
    });

    test('should provide limits accessor', async ({ pdfium }) => {
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
    test('should open a valid PDF document', async ({ openDocument }) => {
      const document = await openDocument('test_1.pdf');
      expect(document.pageCount).toBe(4);
    });

    test('should throw DocumentError for invalid PDF data', async ({ pdfium }) => {
      const invalidData = new Uint8Array([0x00, 0x01, 0x02, 0x03]);
      const err = await pdfium.openDocument(invalidData).catch((e: unknown) => e);
      expect(err).toBeInstanceOf(DocumentError);
      expect((err as DocumentError).code).toBe(201);
    });

    test('should accept ArrayBuffer input', async ({ pdfium }) => {
      const pdfData = await loadTestPdfData('test_1.pdf');
      const arrayBuffer = new ArrayBuffer(pdfData.byteLength);
      new Uint8Array(arrayBuffer).set(pdfData);
      using document = await pdfium.openDocument(arrayBuffer);
      expect(document.pageCount).toBe(4);
    });

    test('should throw DocumentError for encrypted document without password', async ({ pdfium }) => {
      const pdfData = await loadTestPdfData('test_1_pass_12345678.pdf');
      const err = await pdfium.openDocument(pdfData).catch((e: unknown) => e);
      expect(err).toBeInstanceOf(DocumentError);
      expect((err as DocumentError).code).toBe(202);
    });

    test('should open encrypted document with correct password', async ({ openDocument }) => {
      const document = await openDocument('test_1_pass_12345678.pdf', '12345678');
      expect(document.pageCount).toBe(4);
    });

    test('should reject document exceeding size limit', async () => {
      const wasmBinary = await loadWasmBinary();
      using tinyLimit = await PDFium.init({ wasmBinary, limits: { maxDocumentSize: 100 } });
      const pdfData = await loadTestPdfData('test_1.pdf');
      const err = await tinyLimit.openDocument(pdfData).catch((e: unknown) => e);
      expect(err).toBeInstanceOf(DocumentError);
      expect((err as DocumentError).code).toBe(PDFiumErrorCode.DOC_FORMAT_INVALID);
    });

    test('should call onProgress with values from 0 to 1', async ({ pdfium }) => {
      const pdfData = await loadTestPdfData('test_1.pdf');
      const progress: number[] = [];
      using document = await pdfium.openDocument(pdfData, {
        onProgress: (p) => progress.push(p),
      });

      expect(document.pageCount).toBe(4);
      expect(progress[0]).toBe(0);
      expect(progress[progress.length - 1]).toBe(1);
      expect(progress.every((p) => p >= 0 && p <= 1)).toBe(true);
      for (let i = 1; i < progress.length; i++) {
        expect(progress[i]).toBeGreaterThanOrEqual(progress[i - 1] ?? 0);
      }
    });

    test('should not throw if onProgress is not provided', async ({ openDocument }) => {
      const document = await openDocument('test_1.pdf');
      expect(document.pageCount).toBe(4);
    });
  });
});

describe('PDFiumDocument', () => {
  describe('pageCount', () => {
    test('should return correct page count', async ({ testDocument }) => {
      expect(testDocument.pageCount).toBe(4);
    });
  });

  describe('getPage', () => {
    test('should load a valid page', async ({ testDocument }) => {
      using page = testDocument.getPage(0);
      expect(page.index).toBe(0);
    });

    test('should throw PageError for invalid page index', async ({ testDocument }) => {
      expect(() => testDocument.getPage(100)).toThrow(PageError);
      expect(() => testDocument.getPage(100)).toThrow(expect.objectContaining({ code: 303 }));
    });

    test('should throw PageError for negative page index', async ({ testDocument }) => {
      expect(() => testDocument.getPage(-1)).toThrow(PageError);
      expect(() => testDocument.getPage(-1)).toThrow(expect.objectContaining({ code: 303 }));
    });
  });

  describe('pages', () => {
    test('should iterate over all pages', async ({ testDocument }) => {
      let count = 0;
      for (const page of testDocument.pages()) {
        using p = page;
        expect(p.index).toBe(count);
        count++;
      }
      expect(count).toBe(4);
    });
  });

  describe('[INTERNAL]', () => {
    test('provides internal handles via symbol', async ({ testDocument }) => {
      const internal = testDocument[INTERNAL];
      expect(internal.handle).toBeGreaterThan(0);
      expect(internal.formHandle).toBeTypeOf('number');
    });
  });

  describe('getBookmarks', () => {
    test('should return empty array for document without bookmarks', async ({ testDocument }) => {
      const bookmarks = testDocument.getBookmarks();
      expect(bookmarks).toEqual([]);
    });
  });

  describe('attachments', () => {
    test('should return zero attachment count for document without attachments', async ({ testDocument }) => {
      expect(testDocument.attachmentCount).toBe(0);
    });

    test('should return empty array from getAttachments for document without attachments', async ({ testDocument }) => {
      expect(testDocument.getAttachments()).toEqual([]);
    });

    test('should throw for out-of-range attachment index', async ({ testDocument }) => {
      expect(() => testDocument.getAttachment(0)).toThrow();
      expect(() => testDocument.getAttachment(-1)).toThrow();
    });

    test('attachments() returns a generator', async ({ testDocument }) => {
      const gen = testDocument.attachments();
      expect(gen[Symbol.iterator]).toBeDefined();
      expect(gen.next).toBeTypeOf('function');
    });

    test('attachments() yields same attachments as getAttachments()', async ({ testDocument }) => {
      const fromGenerator = [...testDocument.attachments()];
      const fromArray = testDocument.getAttachments();
      expect(fromGenerator).toEqual(fromArray);
    });
  });

  describe('attachments with attachment PDF', () => {
    test('should return attachment count from PDF with attachments', async ({ openDocument }) => {
      const doc = await openDocument('test_9_with_attachment.pdf');
      expect(doc.attachmentCount).toBe(1);
    });

    test('should read attachment name and data', async ({ openDocument }) => {
      const doc = await openDocument('test_9_with_attachment.pdf');
      const attachment = doc.getAttachment(0);
      expect(attachment.index).toBe(0);
      expect(attachment.name).toBe('test-attachment.txt');
      expect(attachment.data.length).toBeGreaterThan(0);
      const text = new TextDecoder().decode(attachment.data);
      expect(text).toBe('Hello from attachment!\n');
    });

    test('should get all attachments via getAttachments', async ({ openDocument }) => {
      const doc = await openDocument('test_9_with_attachment.pdf');
      const attachments = doc.getAttachments();
      expect(attachments.length).toBe(1);
      expect(attachments[0]!.name).toBe('test-attachment.txt');
    });

    test('attachments() generator yields same attachments', async ({ openDocument }) => {
      const doc = await openDocument('test_9_with_attachment.pdf');
      const fromGenerator = [...doc.attachments()];
      const fromArray = doc.getAttachments();
      expect(fromGenerator).toEqual(fromArray);
      expect(fromGenerator.length).toBe(1);
    });

    test('attachments() is lazy - can break early', async ({ openDocument }) => {
      const doc = await openDocument('test_9_with_attachment.pdf');
      const gen = doc.attachments();
      const first = gen.next();
      expect(first.done).toBe(false);
      expect(first.value).toHaveProperty('name');
      expect(first.value).toHaveProperty('data');
    });
  });

  describe('getBookmarks with bookmark PDF', () => {
    test('should return bookmarks from document with bookmarks', async ({ openDocument }) => {
      const doc = await openDocument('test_3_with_images.pdf');
      const bookmarks = doc.getBookmarks();
      expect(bookmarks.length).toBeGreaterThan(0);
    });

    test('bookmark should have title and children', async ({ openDocument }) => {
      const doc = await openDocument('test_3_with_images.pdf');
      const bookmarks = doc.getBookmarks();
      const first = bookmarks[0]!;
      expect(first.title).toBeTypeOf('string');
      expect(first.title.length).toBeGreaterThan(0);
      expect(first.children).toBeInstanceOf(Array);
    });

    test('bookmark should have pageIndex or undefined', async ({ openDocument }) => {
      const doc = await openDocument('test_3_with_images.pdf');
      const bookmarks = doc.getBookmarks();
      const first = bookmarks[0]!;
      if (first.pageIndex !== undefined) {
        expect(first.pageIndex).toBeTypeOf('number');
        expect(first.pageIndex).toBeGreaterThanOrEqual(0);
      }
    });

    test('bookmarks() generator should yield same results as getBookmarks()', async ({ openDocument }) => {
      const doc = await openDocument('test_3_with_images.pdf');
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
    test('should save document to bytes', async ({ testDocument }) => {
      const bytes = testDocument.save();
      expect(bytes).toBeInstanceOf(Uint8Array);
      expect(bytes.length).toBeGreaterThan(0);
      const header = new TextDecoder().decode(bytes.subarray(0, 5));
      expect(header).toBe('%PDF-');
    });

    test('should produce a valid PDF that can be re-opened', async ({ pdfium, testDocument }) => {
      const bytes = testDocument.save();
      using reopened = await pdfium.openDocument(bytes);
      expect(reopened.pageCount).toBe(4);
    });

    test('should save with version option', async ({ pdfium, testDocument }) => {
      const bytes = testDocument.save({ version: 17 });
      expect(bytes.length).toBeGreaterThan(0);
      using reopened = await pdfium.openDocument(bytes);
      expect(reopened.pageCount).toBe(4);
    });

    test('should preserve text content after save round-trip', async ({ pdfium, testDocument }) => {
      const bytes = testDocument.save();
      using reopened = await pdfium.openDocument(bytes);
      using originalPage = testDocument.getPage(0);
      using reopenedPage = reopened.getPage(0);
      const originalText = originalPage.getText();
      const reopenedText = reopenedPage.getText();
      expect(reopenedText).toBe(originalText);
    });
  });

  describe('post-dispose guards', () => {
    test('should throw on pageCount after dispose', async ({ openDocument }) => {
      const doc = await openDocument('test_1.pdf');
      doc.dispose();
      expect(() => doc.pageCount).toThrow();
    });

    test('should throw on getPage after dispose', async ({ openDocument }) => {
      const doc = await openDocument('test_1.pdf');
      doc.dispose();
      expect(() => doc.getPage(0)).toThrow();
    });

    test('should throw on getBookmarks after dispose', async ({ openDocument }) => {
      const doc = await openDocument('test_1.pdf');
      doc.dispose();
      expect(() => doc.getBookmarks()).toThrow();
    });

    test('should throw on save after dispose', async ({ openDocument }) => {
      const doc = await openDocument('test_1.pdf');
      doc.dispose();
      expect(() => doc.save()).toThrow();
    });

    test('should throw on getAttachments after dispose', async ({ openDocument }) => {
      const doc = await openDocument('test_1.pdf');
      doc.dispose();
      expect(() => doc.getAttachments()).toThrow();
    });

    test('should throw on attachmentCount after dispose', async ({ openDocument }) => {
      const doc = await openDocument('test_1.pdf');
      doc.dispose();
      expect(() => doc.attachmentCount).toThrow();
    });
  });

  describe('save with flags', () => {
    test('should save with INCREMENTAL flag', async ({ testDocument }) => {
      const bytes = testDocument.save({ flags: SaveFlags.Incremental });
      expect(bytes).toBeInstanceOf(Uint8Array);
      expect(bytes.length).toBeGreaterThan(0);
    });

    test('should save with NO_INCREMENTAL flag', async ({ testDocument }) => {
      const bytes = testDocument.save({ flags: SaveFlags.NoIncremental });
      expect(bytes).toBeInstanceOf(Uint8Array);
      expect(bytes.length).toBeGreaterThan(0);
    });

    test('should save with REMOVE_SECURITY flag', async ({ testDocument }) => {
      const bytes = testDocument.save({ flags: SaveFlags.RemoveSecurity });
      expect(bytes).toBeInstanceOf(Uint8Array);
      expect(bytes.length).toBeGreaterThan(0);
    });
  });
});

describe('wrong password', () => {
  test('should throw for wrong password on encrypted document', async ({ pdfium }) => {
    const pdfData = await loadTestPdfData('test_1_pass_12345678.pdf');
    const err = await pdfium.openDocument(pdfData, { password: 'wrong_password' }).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(DocumentError);
    expect([PDFiumErrorCode.DOC_PASSWORD_REQUIRED, PDFiumErrorCode.DOC_PASSWORD_INCORRECT]).toContain(
      (err as DocumentError).code,
    );
  });
});

describe('resource lifecycle', () => {
  test('should dispose open pages when document is disposed', async ({ openDocument }) => {
    const doc = await openDocument('test_1.pdf');
    const page = doc.getPage(0);
    expect(page.disposed).toBe(false);
    doc.dispose();
    expect(page.disposed).toBe(true);
  });

  test('should handle page disposed before document', async ({ openDocument }) => {
    const doc = await openDocument('test_1.pdf');
    const page = doc.getPage(0);
    page.dispose();
    expect(page.disposed).toBe(true);
    expect(() => doc.dispose()).not.toThrow();
  });

  test('should track pages from pages() generator', async ({ openDocument }) => {
    const doc = await openDocument('test_1.pdf');
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

describe('openDocument progress callback edge cases', () => {
  test('progress values are monotonically non-decreasing', async ({ pdfium }) => {
    const pdfData = await loadTestPdfData('test_1.pdf');
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

  test('progress starts at 0 and ends at 1', async ({ pdfium }) => {
    const pdfData = await loadTestPdfData('test_1.pdf');
    const progress: number[] = [];
    using doc = await pdfium.openDocument(pdfData, {
      onProgress: (p) => progress.push(p),
    });
    expect(doc).toBeDefined();

    expect(progress[0]).toBe(0);
    expect(progress[progress.length - 1]).toBe(1);
  });

  test('progress callback receives number type', async ({ pdfium }) => {
    const pdfData = await loadTestPdfData('test_1.pdf');
    const progress: unknown[] = [];
    using doc = await pdfium.openDocument(pdfData, {
      onProgress: (p) => progress.push(p),
    });
    expect(doc).toBeDefined();

    expect(progress.every((p) => typeof p === 'number')).toBe(true);
  });

  test('openDocument works without progress callback', async ({ openDocument }) => {
    const doc = await openDocument('test_1.pdf');
    expect(doc).toBeDefined();
    expect(doc.pageCount).toBe(4);
  });
});

describe('document generators on disposed resources', () => {
  test('attachments() throws on disposed document', async ({ openDocument }) => {
    const doc = await openDocument('test_9_with_attachment.pdf');
    doc.dispose();
    expect(() => doc.attachments().next()).toThrow();
  });

  test('signatures() throws on disposed document', async ({ openDocument }) => {
    const doc = await openDocument('test_8_with_signature.pdf');
    doc.dispose();
    expect(() => doc.signatures().next()).toThrow();
  });

  test('pages() throws on disposed document', async ({ openDocument }) => {
    const doc = await openDocument('test_1.pdf');
    doc.dispose();
    expect(() => doc.pages().next()).toThrow();
  });

  test('INTERNAL access throws on disposed document', async ({ openDocument }) => {
    const doc = await openDocument('test_1.pdf');
    doc.dispose();
    expect(() => doc[INTERNAL]).toThrow();
  });
});

describe('empty collection generators on document', () => {
  test('attachments() yields nothing for document without attachments', async ({ testDocument }) => {
    const attachments = [...testDocument.attachments()];
    expect(attachments).toEqual([]);
  });

  test('signatures() yields nothing for document without signatures', async ({ testDocument }) => {
    const signatures = [...testDocument.signatures()];
    expect(signatures).toEqual([]);
  });
});

describe('document metadata and properties', () => {
  test('getMetadata returns metadata object', async ({ openDocument }) => {
    const doc = await openDocument('test_10_with_metadata.pdf');
    const metadata = doc.getMetadata();
    expect(metadata).toBeDefined();
    expect(metadata).toBeTypeOf('object');
  });

  test('getMetadata works on document without metadata', async ({ testDocument }) => {
    const metadata = testDocument.getMetadata();
    expect(metadata).toBeDefined();
    expect(metadata).toBeTypeOf('object');
  });

  test('namedDestinationCount returns a number', async ({ testDocument }) => {
    expect(testDocument.namedDestinationCount).toBeTypeOf('number');
    expect(testDocument.namedDestinationCount).toBeGreaterThanOrEqual(0);
  });

  test('getViewerPreference returns undefined for missing key', async ({ testDocument }) => {
    const pref = testDocument.getViewerPreference('NonExistentPref');
    expect(pref).toBeUndefined();
  });

  test('javaScriptActionCount returns a number', async ({ testDocument }) => {
    expect(testDocument.javaScriptActionCount).toBeTypeOf('number');
    expect(testDocument.javaScriptActionCount).toBeGreaterThanOrEqual(0);
  });

  test('signatureCount returns a number', async ({ testDocument }) => {
    expect(testDocument.signatureCount).toBeTypeOf('number');
    expect(testDocument.signatureCount).toBeGreaterThanOrEqual(0);
  });

  test('attachmentCount returns a number', async ({ testDocument }) => {
    expect(testDocument.attachmentCount).toBeTypeOf('number');
    expect(testDocument.attachmentCount).toBeGreaterThanOrEqual(0);
  });
});
