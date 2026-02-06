/**
 * Integration tests for native PDFium binding.
 *
 * These tests verify the native addon loading mechanism and basic operations
 * through both the low-level binding and the high-level NativePDFiumInstance API.
 * Tests skip gracefully when the native .node binary is not built.
 */

import { readFile } from 'node:fs/promises';
import { describe, expect, test } from 'vitest';
import { AnnotationType } from '../../src/core/types.js';
import { NativePDFiumInstance } from '../../src/document/native-instance.js';
import { loadNativeBinding } from '../../src/native/loader.js';
import type { NativePdfium } from '../../src/native/types.js';
import { PDFium } from '../../src/pdfium.js';

/**
 * Try to load the native binding. Returns null if unavailable.
 */
function tryLoadNative(): NativePdfium | null {
  return loadNativeBinding();
}

const native = tryLoadNative();
const hasNative = native !== null;

// Skip the entire suite when native binding is not available
describe.skipIf(!hasNative)('native PDFium binding (low-level)', () => {
  let binding: NativePdfium;

  test('loads the native binding successfully', () => {
    const result = loadNativeBinding();
    expect(result).not.toBeNull();
    binding = result!;
  });

  test('initialises and destroys the library', () => {
    binding.initLibrary();
    binding.destroyLibrary();
  });

  describe('document operations', () => {
    test('loads a document and gets page count', async () => {
      binding.initLibrary();
      try {
        const pdfData = await readFile('test/fixtures/test_1.pdf');
        const docHandle = binding.loadDocument(Buffer.from(pdfData));
        expect(docHandle).toBeGreaterThan(0);

        const pageCount = binding.getPageCount(docHandle);
        expect(pageCount).toBeGreaterThan(0);

        binding.closeDocument(docHandle);
      } finally {
        binding.destroyLibrary();
      }
    });

    test('loads a page and gets dimensions', async () => {
      binding.initLibrary();
      try {
        const pdfData = await readFile('test/fixtures/test_1.pdf');
        const docHandle = binding.loadDocument(Buffer.from(pdfData));
        const pageHandle = binding.loadPage(docHandle, 0);
        expect(pageHandle).toBeGreaterThan(0);

        const width = binding.getPageWidth(pageHandle);
        const height = binding.getPageHeight(pageHandle);
        expect(width).toBeGreaterThan(0);
        expect(height).toBeGreaterThan(0);

        binding.closePage(pageHandle);
        binding.closeDocument(docHandle);
      } finally {
        binding.destroyLibrary();
      }
    });

    test('extracts text from a page', async () => {
      binding.initLibrary();
      try {
        const pdfData = await readFile('test/fixtures/test_1.pdf');
        const docHandle = binding.loadDocument(Buffer.from(pdfData));
        const pageHandle = binding.loadPage(docHandle, 0);
        const textPageHandle = binding.loadTextPage(pageHandle);
        expect(textPageHandle).toBeGreaterThan(0);

        const charCount = binding.countTextChars(textPageHandle);
        expect(charCount).toBeGreaterThanOrEqual(0);

        const text = binding.getFullText(textPageHandle);
        expect(typeof text).toBe('string');

        binding.closeTextPage(textPageHandle);
        binding.closePage(pageHandle);
        binding.closeDocument(docHandle);
      } finally {
        binding.destroyLibrary();
      }
    });

    test('renders a page to RGBA buffer', async () => {
      binding.initLibrary();
      try {
        const pdfData = await readFile('test/fixtures/test_1.pdf');
        const docHandle = binding.loadDocument(Buffer.from(pdfData));
        const pageHandle = binding.loadPage(docHandle, 0);

        const width = Math.round(binding.getPageWidth(pageHandle));
        const height = Math.round(binding.getPageHeight(pageHandle));

        const pixelData = binding.renderPage(pageHandle, width, height, 0, 0, 0xffffffff);
        expect(pixelData).toBeInstanceOf(Buffer);
        expect(pixelData.length).toBe(width * height * 4);

        binding.closePage(pageHandle);
        binding.closeDocument(docHandle);
      } finally {
        binding.destroyLibrary();
      }
    });

    test('reads document metadata via low-level binding', async () => {
      binding.initLibrary();
      try {
        const pdfData = await readFile('test/fixtures/test_1.pdf');
        const docHandle = binding.loadDocument(Buffer.from(pdfData));

        // getMetaText returns string or null
        const producer = binding.getMetaText(docHandle, 'Producer');
        expect(producer === null || typeof producer === 'string').toBe(true);

        // getFileVersion returns number or null
        const version = binding.getFileVersion(docHandle);
        expect(version === null || typeof version === 'number').toBe(true);

        // permissions returns number
        expect(typeof binding.getDocPermissions(docHandle)).toBe('number');
        expect(typeof binding.getDocUserPermissions(docHandle)).toBe('number');

        // pageMode returns number
        expect(typeof binding.getPageMode(docHandle)).toBe('number');

        // securityHandlerRevision returns number
        expect(typeof binding.getSecurityHandlerRevision(docHandle)).toBe('number');

        // isTagged returns boolean
        expect(typeof binding.isTagged(docHandle)).toBe('boolean');

        // getPageLabel returns string or null
        const label = binding.getPageLabel(docHandle, 0);
        expect(label === null || typeof label === 'string').toBe(true);

        binding.closeDocument(docHandle);
      } finally {
        binding.destroyLibrary();
      }
    });

    test('reads character font info via low-level binding', async () => {
      binding.initLibrary();
      try {
        const pdfData = await readFile('test/fixtures/test_1.pdf');
        const docHandle = binding.loadDocument(Buffer.from(pdfData));
        const pageHandle = binding.loadPage(docHandle, 0);
        const textPageHandle = binding.loadTextPage(pageHandle);

        const charCount = binding.countTextChars(textPageHandle);
        if (charCount > 0) {
          const fontSize = binding.getCharFontSize(textPageHandle, 0);
          expect(fontSize).toBeGreaterThan(0);

          const fontWeight = binding.getCharFontWeight(textPageHandle, 0);
          expect(typeof fontWeight).toBe('number');

          const fontInfo = binding.getCharFontInfo(textPageHandle, 0);
          expect(fontInfo).not.toBeNull();
          expect(fontInfo!.name.length).toBeGreaterThan(0);
          expect(typeof fontInfo!.flags).toBe('number');

          const renderMode = binding.getCharRenderMode(textPageHandle, 0);
          expect(renderMode).toBeGreaterThanOrEqual(0);
        }

        binding.closeTextPage(textPageHandle);
        binding.closePage(pageHandle);
        binding.closeDocument(docHandle);
      } finally {
        binding.destroyLibrary();
      }
    });

    test('reads bookmarks via low-level binding', async () => {
      binding.initLibrary();
      try {
        // test_1.pdf likely has no bookmarks
        const pdfData = await readFile('test/fixtures/test_1.pdf');
        const docHandle = binding.loadDocument(Buffer.from(pdfData));
        const bookmarks = binding.getBookmarks(docHandle);
        expect(Array.isArray(bookmarks)).toBe(true);
        binding.closeDocument(docHandle);

        // test_3_with_images.pdf has bookmarks
        const pdfData2 = await readFile('test/fixtures/test_3_with_images.pdf');
        const docHandle2 = binding.loadDocument(Buffer.from(pdfData2));
        const bookmarks2 = binding.getBookmarks(docHandle2);
        expect(bookmarks2.length).toBeGreaterThan(0);
        expect(typeof bookmarks2[0]!.title).toBe('string');
        expect(typeof bookmarks2[0]!.pageIndex).toBe('number');
        expect(Array.isArray(bookmarks2[0]!.children)).toBe(true);
        binding.closeDocument(docHandle2);
      } finally {
        binding.destroyLibrary();
      }
    });

    test('reads annotations via low-level binding', async () => {
      binding.initLibrary();
      try {
        const pdfData = await readFile('test/fixtures/test_1.pdf');
        const docHandle = binding.loadDocument(Buffer.from(pdfData));
        const pageHandle = binding.loadPage(docHandle, 0);

        const annotations = binding.getAnnotations(pageHandle);
        expect(Array.isArray(annotations)).toBe(true);

        for (const ann of annotations) {
          expect(typeof ann.index).toBe('number');
          expect(typeof ann.subtype).toBe('number');
          expect(typeof ann.left).toBe('number');
          expect(typeof ann.top).toBe('number');
          expect(typeof ann.right).toBe('number');
          expect(typeof ann.bottom).toBe('number');
          expect(typeof ann.hasColour).toBe('boolean');
        }

        binding.closePage(pageHandle);
        binding.closeDocument(docHandle);
      } finally {
        binding.destroyLibrary();
      }
    });

    test('mutates annotations via low-level binding', async () => {
      binding.initLibrary();
      try {
        const pdfData = await readFile('test/fixtures/test_1.pdf');
        const docHandle = binding.loadDocument(Buffer.from(pdfData));
        const pageHandle = binding.loadPage(docHandle, 0);

        const initialAnnotations = binding.getAnnotations(pageHandle);
        const initialCount = initialAnnotations.length;

        // Create a Text annotation (subtype 1)
        const newIndex = binding.createAnnotation(pageHandle, 1);
        expect(newIndex).toBeGreaterThanOrEqual(0);

        const afterCreate = binding.getAnnotations(pageHandle);
        expect(afterCreate.length).toBe(initialCount + 1);

        // Set rect
        expect(binding.setAnnotationRect(pageHandle, newIndex, 10, 200, 100, 10)).toBe(true);

        // Set colour
        expect(binding.setAnnotationColour(pageHandle, newIndex, 0, 255, 0, 0, 255)).toBe(true);

        // Set and get flags
        expect(binding.setAnnotationFlags(pageHandle, newIndex, 4)).toBe(true);
        expect(binding.getAnnotationFlags(pageHandle, newIndex)).toBe(4);

        // Set string value
        expect(binding.setAnnotationStringValue(pageHandle, newIndex, 'Contents', 'Test note')).toBe(true);

        // Set border
        expect(binding.setAnnotationBorder(pageHandle, newIndex, 0, 0, 2)).toBe(true);

        // Remove annotation
        expect(binding.removeAnnotation(pageHandle, newIndex)).toBe(true);

        const afterRemove = binding.getAnnotations(pageHandle);
        expect(afterRemove.length).toBe(initialCount);

        binding.closePage(pageHandle);
        binding.closeDocument(docHandle);
      } finally {
        binding.destroyLibrary();
      }
    });

    test('reads links via low-level binding', async () => {
      binding.initLibrary();
      try {
        const pdfData = await readFile('test/fixtures/test_1.pdf');
        const docHandle = binding.loadDocument(Buffer.from(pdfData));
        const pageHandle = binding.loadPage(docHandle, 0);

        const links = binding.getLinks(pageHandle, docHandle);
        expect(Array.isArray(links)).toBe(true);

        for (const link of links) {
          expect(typeof link.index).toBe('number');
          expect(typeof link.left).toBe('number');
          expect(typeof link.bottom).toBe('number');
          expect(typeof link.right).toBe('number');
          expect(typeof link.top).toBe('number');
          expect(typeof link.hasAction).toBe('boolean');
          expect(typeof link.actionType).toBe('number');
          expect(typeof link.hasDest).toBe('boolean');
          expect(typeof link.destPageIndex).toBe('number');
        }

        binding.closePage(pageHandle);
        binding.closeDocument(docHandle);
      } finally {
        binding.destroyLibrary();
      }
    });

    test('reads and sets page boxes via low-level binding', async () => {
      binding.initLibrary();
      try {
        const pdfData = await readFile('test/fixtures/test_1.pdf');
        const docHandle = binding.loadDocument(Buffer.from(pdfData));
        const pageHandle = binding.loadPage(docHandle, 0);

        // getPageBox (0=MediaBox) should return an array for a valid page
        const mediaBox = binding.getPageBox(pageHandle, 0);
        expect(mediaBox).not.toBeNull();
        expect(mediaBox).toHaveLength(4);

        // setPageBox (1=CropBox) then read back
        binding.setPageBox(pageHandle, 1, 10, 10, 200, 300);
        const cropBox = binding.getPageBox(pageHandle, 1);
        expect(cropBox).not.toBeNull();
        expect(cropBox![0]).toBeCloseTo(10, 0);
        expect(cropBox![1]).toBeCloseTo(10, 0);
        expect(cropBox![2]).toBeCloseTo(200, 0);
        expect(cropBox![3]).toBeCloseTo(300, 0);

        binding.closePage(pageHandle);
        binding.closeDocument(docHandle);
      } finally {
        binding.destroyLibrary();
      }
    });

    test('reads text character extended operations via low-level binding', async () => {
      binding.initLibrary();
      try {
        const pdfData = await readFile('test/fixtures/test_1.pdf');
        const docHandle = binding.loadDocument(Buffer.from(pdfData));
        const pageHandle = binding.loadPage(docHandle, 0);
        const textPageHandle = binding.loadTextPage(pageHandle);

        const charCount = binding.countTextChars(textPageHandle);
        if (charCount > 0) {
          expect(binding.getCharUnicode(textPageHandle, 0)).toBeGreaterThan(0);
          expect(typeof binding.isCharGenerated(textPageHandle, 0)).toBe('boolean');
          expect(typeof binding.isCharHyphen(textPageHandle, 0)).toBe('boolean');
          expect(typeof binding.hasCharUnicodeMapError(textPageHandle, 0)).toBe('boolean');
          expect(typeof binding.getCharAngle(textPageHandle, 0)).toBe('number');

          const origin = binding.getCharOrigin(textPageHandle, 0);
          expect(origin).not.toBeNull();

          const box = binding.getCharBox(textPageHandle, 0);
          expect(box).not.toBeNull();

          const looseBox = binding.getCharLooseBox(textPageHandle, 0);
          expect(looseBox).not.toBeNull();

          const fillColour = binding.getCharFillColour(textPageHandle, 0);
          expect(fillColour === null || typeof fillColour.r === 'number').toBe(true);

          const strokeColour = binding.getCharStrokeColour(textPageHandle, 0);
          expect(strokeColour === null || typeof strokeColour.r === 'number').toBe(true);

          const matrix = binding.getCharMatrix(textPageHandle, 0);
          if (matrix !== null) {
            expect(matrix).toHaveLength(6);
          }
        }

        binding.closeTextPage(textPageHandle);
        binding.closePage(pageHandle);
        binding.closeDocument(docHandle);
      } finally {
        binding.destroyLibrary();
      }
    });

    test('searches text and gets rects via low-level binding', async () => {
      binding.initLibrary();
      try {
        const pdfData = await readFile('test/fixtures/test_1.pdf');
        const docHandle = binding.loadDocument(Buffer.from(pdfData));
        const pageHandle = binding.loadPage(docHandle, 0);
        const textPageHandle = binding.loadTextPage(pageHandle);

        const text = binding.getFullText(textPageHandle);
        if (text.length > 3) {
          const query = [...text].slice(0, 3).join('');
          const results = binding.findText(textPageHandle, query, 0);
          expect(results.length).toBeGreaterThan(0);
          expect(results[0]!.index).toBeGreaterThanOrEqual(0);
          expect(results[0]!.count).toBe(query.length);
        }

        // Count and get text rects
        const charCount = binding.countTextChars(textPageHandle);
        if (charCount > 0) {
          const rectCount = binding.countTextRects(textPageHandle, 0, 1);
          expect(rectCount).toBeGreaterThanOrEqual(0);

          if (rectCount > 0) {
            const rect = binding.getTextRect(textPageHandle, 0);
            expect(rect).not.toBeNull();
          }
        }

        // Bounded text
        const bounded = binding.getBoundedText(textPageHandle, 0, 1000, 1000, 0);
        expect(typeof bounded).toBe('string');

        binding.closeTextPage(textPageHandle);
        binding.closePage(pageHandle);
        binding.closeDocument(docHandle);
      } finally {
        binding.destroyLibrary();
      }
    });

    test('page operations via low-level binding', async () => {
      binding.initLibrary();
      try {
        const pdfData = await readFile('test/fixtures/test_1.pdf');
        const docHandle = binding.loadDocument(Buffer.from(pdfData));
        const pageHandle = binding.loadPage(docHandle, 0);

        // Rotation
        expect(binding.getPageRotation(pageHandle)).toBeGreaterThanOrEqual(0);
        binding.setPageRotation(pageHandle, 1);
        expect(binding.getPageRotation(pageHandle)).toBe(1);
        binding.setPageRotation(pageHandle, 0);

        // Transparency
        expect(typeof binding.hasPageTransparency(pageHandle)).toBe('boolean');

        // Flatten
        const flatResult = binding.flattenPage(pageHandle, 0);
        expect(flatResult).toBeGreaterThanOrEqual(0);

        // Generate content
        expect(typeof binding.generateContent(pageHandle)).toBe('boolean');

        binding.closePage(pageHandle);
        binding.closeDocument(docHandle);
      } finally {
        binding.destroyLibrary();
      }
    });

    test('coordinate conversion via low-level binding', async () => {
      binding.initLibrary();
      try {
        const pdfData = await readFile('test/fixtures/test_1.pdf');
        const docHandle = binding.loadDocument(Buffer.from(pdfData));
        const pageHandle = binding.loadPage(docHandle, 0);

        const width = Math.round(binding.getPageWidth(pageHandle));
        const height = Math.round(binding.getPageHeight(pageHandle));

        const pageCoord = binding.deviceToPage(pageHandle, 0, 0, width, height, 0, 100, 100);
        expect(typeof pageCoord.x).toBe('number');
        expect(typeof pageCoord.y).toBe('number');

        const deviceCoord = binding.pageToDevice(pageHandle, 0, 0, width, height, 0, pageCoord.x, pageCoord.y);
        expect(typeof deviceCoord.x).toBe('number');
        expect(typeof deviceCoord.y).toBe('number');

        binding.closePage(pageHandle);
        binding.closeDocument(docHandle);
      } finally {
        binding.destroyLibrary();
      }
    });
  });
});

describe.skipIf(!hasNative)('NativePDFiumInstance (high-level)', () => {
  test('opens a document and gets page count', async () => {
    using pdfium = NativePDFiumInstance.fromBinding(native!, undefined);
    const pdfData = await readFile('test/fixtures/test_1.pdf');
    using doc = pdfium.openDocument(pdfData);
    expect(doc.pageCount).toBeGreaterThan(0);
  });

  test('loads a page and reads dimensions', async () => {
    using pdfium = NativePDFiumInstance.fromBinding(native!, undefined);
    const pdfData = await readFile('test/fixtures/test_1.pdf');
    using doc = pdfium.openDocument(pdfData);
    using page = doc.getPage(0);

    expect(page.width).toBeGreaterThan(0);
    expect(page.height).toBeGreaterThan(0);
    expect(page.size).toEqual({ width: page.width, height: page.height });
    expect(page.index).toBe(0);
  });

  test('extracts text from a page', async () => {
    using pdfium = NativePDFiumInstance.fromBinding(native!, undefined);
    const pdfData = await readFile('test/fixtures/test_1.pdf');
    using doc = pdfium.openDocument(pdfData);
    using page = doc.getPage(0);

    const text = page.getText();
    expect(typeof text).toBe('string');
    expect(page.charCount).toBeGreaterThanOrEqual(0);
  });

  test('renders a page to RGBA buffer', async () => {
    using pdfium = NativePDFiumInstance.fromBinding(native!, undefined);
    const pdfData = await readFile('test/fixtures/test_1.pdf');
    using doc = pdfium.openDocument(pdfData);
    using page = doc.getPage(0);

    const result = page.render({ scale: 1 });
    expect(result.width).toBe(Math.round(page.width));
    expect(result.height).toBe(Math.round(page.height));
    expect(result.data.length).toBe(result.width * result.height * 4);
    expect(result.originalWidth).toBe(page.width);
    expect(result.originalHeight).toBe(page.height);
  });

  test('iterates over all pages', async () => {
    using pdfium = NativePDFiumInstance.fromBinding(native!, undefined);
    const pdfData = await readFile('test/fixtures/test_1.pdf');
    using doc = pdfium.openDocument(pdfData);

    const pageCount = doc.pageCount;
    let count = 0;
    for (const page of doc.pages()) {
      using p = page;
      expect(p.width).toBeGreaterThan(0);
      count++;
    }
    expect(count).toBe(pageCount);
  });

  test('throws on invalid page index', async () => {
    using pdfium = NativePDFiumInstance.fromBinding(native!, undefined);
    const pdfData = await readFile('test/fixtures/test_1.pdf');
    using doc = pdfium.openDocument(pdfData);

    expect(() => doc.getPage(-1)).toThrow();
    expect(() => doc.getPage(999)).toThrow();
  });

  test('throws on oversized document', () => {
    using pdfium = NativePDFiumInstance.fromBinding(native!, { maxDocumentSize: 10 });
    const data = new Uint8Array(100);
    expect(() => pdfium.openDocument(data)).toThrow(/exceeds maximum/);
  });

  test('reads document metadata', async () => {
    using pdfium = NativePDFiumInstance.fromBinding(native!, undefined);
    const pdfData = await readFile('test/fixtures/test_1.pdf');
    using doc = pdfium.openDocument(pdfData);

    const metadata = doc.getMetadata();
    expect(metadata).toBeDefined();
    expect(typeof metadata).toBe('object');

    // fileVersion should be a number (e.g. 15 for PDF 1.5)
    const version = doc.fileVersion;
    if (version !== undefined) {
      expect(version).toBeGreaterThan(0);
    }

    // rawPermissions should be a number
    expect(typeof doc.rawPermissions).toBe('number');
    expect(typeof doc.userPermissions).toBe('number');

    // pageMode should be a valid enum value
    expect(doc.pageMode).toBeGreaterThanOrEqual(0);
    expect(doc.pageMode).toBeLessThanOrEqual(6);

    // securityHandlerRevision: -1 for unencrypted
    expect(typeof doc.securityHandlerRevision).toBe('number');

    // isTagged returns boolean
    expect(typeof doc.isTagged()).toBe('boolean');
  });

  test('reads page labels', async () => {
    using pdfium = NativePDFiumInstance.fromBinding(native!, undefined);
    const pdfData = await readFile('test/fixtures/test_1.pdf');
    using doc = pdfium.openDocument(pdfData);

    // getPageLabel returns string or undefined
    const label = doc.getPageLabel(0);
    expect(label === undefined || typeof label === 'string').toBe(true);

    // Out-of-range index should return null/undefined
    const badLabel = doc.getPageLabel(999);
    expect(badLabel).toBeUndefined();
  });

  test('reads page boxes', async () => {
    using pdfium = NativePDFiumInstance.fromBinding(native!, undefined);
    const pdfData = await readFile('test/fixtures/test_1.pdf');
    using doc = pdfium.openDocument(pdfData);
    using page = doc.getPage(0);

    // MediaBox should always be present for a valid page
    const mediaBox = page.mediaBox;
    expect(mediaBox).toBeDefined();
    expect(mediaBox!.left).toBeDefined();
    expect(mediaBox!.bottom).toBeDefined();
    expect(mediaBox!.right).toBeGreaterThan(0);
    expect(mediaBox!.top).toBeGreaterThan(0);

    // CropBox may or may not be set
    const cropBox = page.cropBox;
    expect(cropBox === undefined || typeof cropBox.left === 'number').toBe(true);

    // Test getPageBox method directly
    const { PageBoxType } = await import('../../src/core/types.js');
    const box = page.getPageBox(PageBoxType.MediaBox);
    expect(box).toEqual(mediaBox);
  });

  test('sets page boxes', async () => {
    using pdfium = NativePDFiumInstance.fromBinding(native!, undefined);
    const pdfData = await readFile('test/fixtures/test_1.pdf');
    using doc = pdfium.openDocument(pdfData);
    using page = doc.getPage(0);

    const { PageBoxType } = await import('../../src/core/types.js');

    // Set a crop box
    page.setPageBox(PageBoxType.CropBox, { left: 10, bottom: 10, right: 200, top: 300 });

    // Read it back
    const cropBox = page.cropBox;
    expect(cropBox).toBeDefined();
    expect(cropBox!.left).toBeCloseTo(10, 0);
    expect(cropBox!.bottom).toBeCloseTo(10, 0);
    expect(cropBox!.right).toBeCloseTo(200, 0);
    expect(cropBox!.top).toBeCloseTo(300, 0);
  });

  test('reads signature count', async () => {
    using pdfium = NativePDFiumInstance.fromBinding(native!, undefined);
    const pdfData = await readFile('test/fixtures/test_1.pdf');
    using doc = pdfium.openDocument(pdfData);

    // signatureCount should be a number (likely 0 for unsigned PDFs)
    expect(typeof doc.signatureCount).toBe('number');
    expect(doc.signatureCount).toBeGreaterThanOrEqual(0);

    // hasSignatures returns boolean
    expect(typeof doc.hasSignatures()).toBe('boolean');

    // getSignatures returns array
    const sigs = doc.getSignatures();
    expect(Array.isArray(sigs)).toBe(true);
    expect(sigs.length).toBe(doc.signatureCount);
  });

  test('imports pages from another document', async () => {
    using pdfium = NativePDFiumInstance.fromBinding(native!, undefined);
    const pdfData = await readFile('test/fixtures/test_1.pdf');
    using srcDoc = pdfium.openDocument(pdfData);
    using destDoc = pdfium.openDocument(pdfData);

    const originalCount = destDoc.pageCount;

    // Import all pages from source
    destDoc.importPages(srcDoc);
    expect(destDoc.pageCount).toBe(originalCount * 2);

    // Import by index
    using destDoc2 = pdfium.openDocument(pdfData);
    destDoc2.importPagesByIndex(srcDoc, [0]);
    expect(destDoc2.pageCount).toBe(originalCount + 1);
  });

  test('creates N-up document', async () => {
    using pdfium = NativePDFiumInstance.fromBinding(native!, undefined);
    const pdfData = await readFile('test/fixtures/test_1.pdf');
    using srcDoc = pdfium.openDocument(pdfData);

    using nupDoc = srcDoc.createNUpDocument({
      outputWidth: 842,
      outputHeight: 595,
      pagesPerRow: 2,
      pagesPerColumn: 1,
    });

    expect(nupDoc).toBeDefined();
    expect(nupDoc!.pageCount).toBeGreaterThan(0);
  });

  test('saves a document to bytes', async () => {
    using pdfium = NativePDFiumInstance.fromBinding(native!, undefined);
    const pdfData = await readFile('test/fixtures/test_1.pdf');
    using doc = pdfium.openDocument(pdfData);

    // Save without specific version
    const saved = doc.save();
    expect(saved).toBeInstanceOf(Uint8Array);
    expect(saved.length).toBeGreaterThan(0);
    // Verify it starts with %PDF header
    const header = new TextDecoder().decode(saved.slice(0, 5));
    expect(header).toBe('%PDF-');

    // Save with specific version
    const savedV17 = doc.save({ version: 17 });
    expect(savedV17.length).toBeGreaterThan(0);

    // Verify the saved output can be re-loaded
    using reloaded = pdfium.openDocument(saved);
    expect(reloaded.pageCount).toBe(doc.pageCount);
  });

  test('reads attachments', async () => {
    using pdfium = NativePDFiumInstance.fromBinding(native!, undefined);
    // Test with a PDF that has no attachments
    const pdfData = await readFile('test/fixtures/test_1.pdf');
    using doc = pdfium.openDocument(pdfData);
    expect(doc.attachmentCount).toBe(0);
    expect(doc.getAttachments()).toEqual([]);
    expect(doc.getAttachment(0)).toBeUndefined();
  });

  test('reads attachments from PDF with attachments', async () => {
    using pdfium = NativePDFiumInstance.fromBinding(native!, undefined);
    const pdfData = await readFile('test/fixtures/test_9_with_attachment.pdf');
    using doc = pdfium.openDocument(pdfData);

    expect(doc.attachmentCount).toBe(1);

    const attachment = doc.getAttachment(0);
    expect(attachment).toBeDefined();
    expect(attachment!.index).toBe(0);
    expect(attachment!.name).toBe('test-attachment.txt');
    expect(attachment!.data).toBeInstanceOf(Uint8Array);
    expect(attachment!.data.length).toBeGreaterThan(0);

    // Verify getAttachments matches
    const allAttachments = doc.getAttachments();
    expect(allAttachments).toHaveLength(1);
    expect(allAttachments[0]!.name).toBe('test-attachment.txt');

    // Out of range
    expect(doc.getAttachment(1)).toBeUndefined();
    expect(doc.getAttachment(-1)).toBeUndefined();
  });

  test('returns empty bookmarks for document without bookmarks', async () => {
    using pdfium = NativePDFiumInstance.fromBinding(native!, undefined);
    const pdfData = await readFile('test/fixtures/test_1.pdf');
    using doc = pdfium.openDocument(pdfData);
    const bookmarks = doc.getBookmarks();
    expect(bookmarks).toEqual([]);
  });

  test('reads bookmarks from document with bookmarks', async () => {
    using pdfium = NativePDFiumInstance.fromBinding(native!, undefined);
    const pdfData = await readFile('test/fixtures/test_3_with_images.pdf');
    using doc = pdfium.openDocument(pdfData);
    const bookmarks = doc.getBookmarks();
    expect(bookmarks.length).toBeGreaterThan(0);

    const first = bookmarks[0]!;
    expect(typeof first.title).toBe('string');
    expect(first.title.length).toBeGreaterThan(0);
    expect(Array.isArray(first.children)).toBe(true);

    // pageIndex should be a number >= 0, or undefined
    if (first.pageIndex !== undefined) {
      expect(typeof first.pageIndex).toBe('number');
      expect(first.pageIndex).toBeGreaterThanOrEqual(0);
    }
  });

  test('bookmarks() generator yields same results as getBookmarks()', async () => {
    using pdfium = NativePDFiumInstance.fromBinding(native!, undefined);
    const pdfData = await readFile('test/fixtures/test_3_with_images.pdf');
    using doc = pdfium.openDocument(pdfData);
    const eager = doc.getBookmarks();
    const lazy = [...doc.bookmarks()];
    expect(lazy.length).toBe(eager.length);
    for (let i = 0; i < eager.length; i++) {
      expect(lazy[i]!.title).toBe(eager[i]!.title);
      expect(lazy[i]!.pageIndex).toBe(eager[i]!.pageIndex);
    }
  });

  test('reads annotations from a page', async () => {
    using pdfium = NativePDFiumInstance.fromBinding(native!, undefined);
    const pdfData = await readFile('test/fixtures/test_1.pdf');
    using doc = pdfium.openDocument(pdfData);
    using page = doc.getPage(0);

    const annotations = page.getAnnotations();
    expect(Array.isArray(annotations)).toBe(true);
    expect(page.annotationCount).toBe(annotations.length);

    for (const ann of annotations) {
      expect(typeof ann.index).toBe('number');
      expect(ann.index).toBeGreaterThanOrEqual(0);
      expect(typeof ann.type).toBe('number');
      expect(ann.bounds).toBeDefined();
      expect(typeof ann.bounds.left).toBe('number');
      expect(typeof ann.bounds.top).toBe('number');
      expect(typeof ann.bounds.right).toBe('number');
      expect(typeof ann.bounds.bottom).toBe('number');
    }
  });

  test('reads annotations from PDF with annotations', async () => {
    using pdfium = NativePDFiumInstance.fromBinding(native!, undefined);
    // test_3_with_images.pdf is a multi-page PDF that may have annotations
    const pdfData = await readFile('test/fixtures/test_3_with_images.pdf');
    using doc = pdfium.openDocument(pdfData);

    // Check all pages for annotations
    let totalAnnotations = 0;
    for (const page of doc.pages()) {
      using p = page;
      const annotations = p.getAnnotations();
      totalAnnotations += annotations.length;
    }
    // Just verify it doesn't crash; total can be 0
    expect(totalAnnotations).toBeGreaterThanOrEqual(0);
  });

  test('reads links from a page', async () => {
    using pdfium = NativePDFiumInstance.fromBinding(native!, undefined);
    const pdfData = await readFile('test/fixtures/test_1.pdf');
    using doc = pdfium.openDocument(pdfData);
    using page = doc.getPage(0);

    const links = page.getLinks();
    expect(Array.isArray(links)).toBe(true);

    for (const link of links) {
      expect(typeof link.index).toBe('number');
      expect(link.bounds).toBeDefined();
      expect(typeof link.bounds.left).toBe('number');
      expect(typeof link.bounds.right).toBe('number');
      if (link.action) {
        expect(typeof link.action.type).toBe('number');
      }
      if (link.destination) {
        expect(typeof link.destination.pageIndex).toBe('number');
        expect(typeof link.destination.fitType).toBe('number');
      }
    }
  });

  test('reads links from PDF with links', async () => {
    using pdfium = NativePDFiumInstance.fromBinding(native!, undefined);
    const pdfData = await readFile('test/fixtures/test_3_with_images.pdf');
    using doc = pdfium.openDocument(pdfData);

    let totalLinks = 0;
    for (const page of doc.pages()) {
      using p = page;
      const links = p.getLinks();
      totalLinks += links.length;
    }
    // Just verify it doesn't crash; total can be 0
    expect(totalLinks).toBeGreaterThanOrEqual(0);
  });

  test('creates and mutates annotations via high-level API', async () => {
    using pdfium = NativePDFiumInstance.fromBinding(native!, undefined);
    const pdfData = await readFile('test/fixtures/test_1.pdf');
    using doc = pdfium.openDocument(pdfData);
    using page = doc.getPage(0);

    const initialCount = page.annotationCount;

    // Create a Text annotation
    const newIndex = page.createAnnotation(AnnotationType.Text);
    expect(newIndex).toBeGreaterThanOrEqual(0);
    expect(page.annotationCount).toBe(initialCount + 1);

    // Set rect
    expect(page.setAnnotationRect(newIndex, { left: 10, top: 200, right: 100, bottom: 10 })).toBe(true);

    // Set colour
    expect(page.setAnnotationColour(newIndex, { r: 255, g: 0, b: 0, a: 255 })).toBe(true);

    // Set flags (Hidden = 4)
    expect(page.setAnnotationFlags(newIndex, 4)).toBe(true);
    expect(page.getAnnotationFlags(newIndex)).toBe(4);

    // Set string value
    expect(page.setAnnotationStringValue(newIndex, 'Contents', 'Hello from native')).toBe(true);

    // Set border
    expect(page.setAnnotationBorder(newIndex, 0, 0, 1.5)).toBe(true);

    // Remove
    expect(page.removeAnnotation(newIndex)).toBe(true);
    expect(page.annotationCount).toBe(initialCount);
  });

  test('annotation mutations persist after save', async () => {
    using pdfium = NativePDFiumInstance.fromBinding(native!, undefined);
    const pdfData = await readFile('test/fixtures/test_1.pdf');
    using doc = pdfium.openDocument(pdfData);
    using page = doc.getPage(0);

    // Create annotation and set properties
    const newIndex = page.createAnnotation(AnnotationType.Text);
    page.setAnnotationRect(newIndex, { left: 50, top: 100, right: 150, bottom: 50 });
    page.setAnnotationColour(newIndex, { r: 0, g: 255, b: 0, a: 255 });
    page.setAnnotationStringValue(newIndex, 'Contents', 'Persistent note');

    // Save and reopen
    const savedBytes = doc.save();
    expect(savedBytes.length).toBeGreaterThan(0);

    using doc2 = pdfium.openDocument(savedBytes);
    using page2 = doc2.getPage(0);

    // Verify annotation persists
    const annotations = page2.getAnnotations();
    expect(annotations.length).toBeGreaterThan(0);

    // The last annotation should be our new one
    const last = annotations[annotations.length - 1];
    expect(last).toBeDefined();
    expect(last!.type).toBe(AnnotationType.Text);
  });

  test('reads character font info', async () => {
    using pdfium = NativePDFiumInstance.fromBinding(native!, undefined);
    const pdfData = await readFile('test/fixtures/test_1.pdf');
    using doc = pdfium.openDocument(pdfData);
    using page = doc.getPage(0);

    const charCount = page.charCount;
    if (charCount > 0) {
      // Font size should be positive for valid characters
      const fontSize = page.getCharFontSize(0);
      expect(fontSize).toBeGreaterThan(0);

      // Font weight: valid range 100-900, or -1 if unavailable
      const fontWeight = page.getCharFontWeight(0);
      expect(fontWeight === -1 || (fontWeight >= 100 && fontWeight <= 900)).toBe(true);

      // Font name should be a non-empty string
      const fontName = page.getCharFontName(0);
      expect(fontName).toBeDefined();
      expect(typeof fontName).toBe('string');
      expect(fontName!.length).toBeGreaterThan(0);

      // Render mode: 0-7
      const renderMode = page.getCharRenderMode(0);
      expect(renderMode).toBeGreaterThanOrEqual(0);
      expect(renderMode).toBeLessThanOrEqual(7);

      // Out-of-range index should return defaults
      expect(page.getCharFontSize(-1)).toBe(0);
      expect(page.getCharFontWeight(-1)).toBe(-1);
      expect(page.getCharFontName(-1)).toBeUndefined();
    }
  });

  test('reads text character extended operations', async () => {
    using pdfium = NativePDFiumInstance.fromBinding(native!, undefined);
    const pdfData = await readFile('test/fixtures/test_1.pdf');
    using doc = pdfium.openDocument(pdfData);
    using page = doc.getPage(0);

    const charCount = page.charCount;
    if (charCount > 0) {
      // Unicode codepoint
      const unicode = page.getCharUnicode(0);
      expect(unicode).toBeGreaterThan(0);

      // Boolean character properties
      expect(typeof page.isCharGenerated(0)).toBe('boolean');
      expect(typeof page.isCharHyphen(0)).toBe('boolean');
      expect(typeof page.hasCharUnicodeMapError(0)).toBe('boolean');

      // Character angle (radians)
      const angle = page.getCharAngle(0);
      expect(typeof angle).toBe('number');

      // Character origin
      const origin = page.getCharOrigin(0);
      expect(origin).toBeDefined();
      expect(typeof origin!.x).toBe('number');
      expect(typeof origin!.y).toBe('number');

      // Character box
      const box = page.getCharBox(0);
      expect(box).toBeDefined();
      expect(typeof box!.left).toBe('number');
      expect(typeof box!.right).toBe('number');
      expect(typeof box!.bottom).toBe('number');
      expect(typeof box!.top).toBe('number');

      // Character loose box
      const looseBox = page.getCharLooseBox(0);
      expect(looseBox).toBeDefined();
      expect(typeof looseBox!.left).toBe('number');

      // Fill colour
      const fillColour = page.getCharFillColour(0);
      if (fillColour) {
        expect(typeof fillColour.r).toBe('number');
        expect(typeof fillColour.g).toBe('number');
        expect(typeof fillColour.b).toBe('number');
        expect(typeof fillColour.a).toBe('number');
      }

      // Stroke colour
      const strokeColour = page.getCharStrokeColour(0);
      expect(strokeColour === undefined || typeof strokeColour.r === 'number').toBe(true);

      // Character matrix
      const matrix = page.getCharMatrix(0);
      if (matrix) {
        expect(matrix).toHaveLength(6);
      }

      // Out-of-range returns defaults
      expect(page.getCharUnicode(-1)).toBe(0);
      expect(page.isCharGenerated(-1)).toBe(false);
      expect(page.getCharOrigin(-1)).toBeUndefined();
      expect(page.getCharBox(-1)).toBeUndefined();
    }
  });

  test('searches text on a page', async () => {
    using pdfium = NativePDFiumInstance.fromBinding(native!, undefined);
    const pdfData = await readFile('test/fixtures/test_1.pdf');
    using doc = pdfium.openDocument(pdfData);
    using page = doc.getPage(0);

    const text = page.getText();
    if (text.length > 3) {
      // Search for the first 3 characters of the text
      const query = [...text].slice(0, 3).join('');
      const results = [...page.findText(query)];
      expect(results.length).toBeGreaterThan(0);

      const first = results[0]!;
      expect(first.charIndex).toBeGreaterThanOrEqual(0);
      expect(first.charCount).toBe(query.length);
      expect(Array.isArray(first.rects)).toBe(true);
    }

    // Empty query returns no results
    expect([...page.findText('')]).toHaveLength(0);
  });

  test('gets char index at position', async () => {
    using pdfium = NativePDFiumInstance.fromBinding(native!, undefined);
    const pdfData = await readFile('test/fixtures/test_1.pdf');
    using doc = pdfium.openDocument(pdfData);
    using page = doc.getPage(0);

    // Just verify the method works — result depends on PDF content
    const index = page.getCharIndexAtPos(100, 100);
    expect(typeof index).toBe('number');
  });

  test('reads page rotation and transparency', async () => {
    using pdfium = NativePDFiumInstance.fromBinding(native!, undefined);
    const pdfData = await readFile('test/fixtures/test_1.pdf');
    using doc = pdfium.openDocument(pdfData);
    using page = doc.getPage(0);

    // Rotation should be 0-3
    expect(page.rotation).toBeGreaterThanOrEqual(0);
    expect(page.rotation).toBeLessThanOrEqual(3);

    // Transparency returns boolean
    expect(typeof page.hasTransparency()).toBe('boolean');
  });

  test('flattens a page', async () => {
    using pdfium = NativePDFiumInstance.fromBinding(native!, undefined);
    const pdfData = await readFile('test/fixtures/test_1.pdf');
    using doc = pdfium.openDocument(pdfData);
    using page = doc.getPage(0);

    // Flatten returns 0=fail, 1=success, 2=nothing to flatten
    const result = page.flatten();
    expect(result).toBeGreaterThanOrEqual(0);
    expect(result).toBeLessThanOrEqual(2);
  });

  test('converts coordinates between device and page', async () => {
    using pdfium = NativePDFiumInstance.fromBinding(native!, undefined);
    const pdfData = await readFile('test/fixtures/test_1.pdf');
    using doc = pdfium.openDocument(pdfData);
    using page = doc.getPage(0);

    const { PageRotation: Rot } = await import('../../src/core/types.js');
    const context = {
      startX: 0,
      startY: 0,
      sizeX: Math.round(page.width),
      sizeY: Math.round(page.height),
      rotate: Rot.None,
    };

    // Device to page
    const pageCoord = page.deviceToPage(context, 100, 100);
    expect(typeof pageCoord.x).toBe('number');
    expect(typeof pageCoord.y).toBe('number');

    // Page to device
    const deviceCoord = page.pageToDevice(context, pageCoord.x, pageCoord.y);
    expect(typeof deviceCoord.x).toBe('number');
    expect(typeof deviceCoord.y).toBe('number');

    // Round-trip should be approximately consistent
    expect(deviceCoord.x).toBeCloseTo(100, 0);
    expect(deviceCoord.y).toBeCloseTo(100, 0);
  });

  test('generates content after modifications', async () => {
    using pdfium = NativePDFiumInstance.fromBinding(native!, undefined);
    const pdfData = await readFile('test/fixtures/test_1.pdf');
    using doc = pdfium.openDocument(pdfData);
    using page = doc.getPage(0);

    const result = page.generateContent();
    expect(typeof result).toBe('boolean');
  });

  test('gets bounded text', async () => {
    using pdfium = NativePDFiumInstance.fromBinding(native!, undefined);
    const pdfData = await readFile('test/fixtures/test_1.pdf');
    using doc = pdfium.openDocument(pdfData);
    using page = doc.getPage(0);

    // Get text in the full page area
    const text = page.getBoundedText(0, page.height, page.width, 0);
    expect(typeof text).toBe('string');
  });

  test('disposes documents and pages on instance dispose', async () => {
    const pdfium = NativePDFiumInstance.fromBinding(native!, undefined);
    const pdfData = await readFile('test/fixtures/test_1.pdf');
    const doc = pdfium.openDocument(pdfData);
    const page = doc.getPage(0);

    // Dispose the instance — should cascade to documents and pages
    pdfium.dispose();

    // Verify the page and doc are disposed (accessing should throw)
    expect(() => page.width).toThrow();
    expect(() => doc.pageCount).toThrow();
  });
});

describe('PDFium.initNative()', () => {
  test('returns NativePDFiumInstance or null without throwing', async () => {
    const result = await PDFium.initNative();
    if (hasNative) {
      expect(result).not.toBeNull();
      expect(result).toBeInstanceOf(NativePDFiumInstance);
      result!.dispose();
    } else {
      expect(result).toBeNull();
    }
  });

  test.skipIf(!hasNative)('opens documents via PDFium.initNative()', async () => {
    const pdfium = await PDFium.initNative();
    expect(pdfium).not.toBeNull();

    try {
      const pdfData = await readFile('test/fixtures/test_1.pdf');
      using doc = pdfium!.openDocument(pdfData);
      expect(doc.pageCount).toBeGreaterThan(0);
    } finally {
      pdfium!.dispose();
    }
  });
});

describe('PDFium.init({ useNative: true })', () => {
  test('returns NativePDFiumInstance when native is available', async () => {
    using pdfium = await PDFium.init({ useNative: true });
    if (hasNative) {
      expect(pdfium).toBeInstanceOf(NativePDFiumInstance);
    } else {
      expect(pdfium).toBeInstanceOf(PDFium);
    }
  });

  test.skipIf(!hasNative)('opens documents via native-preferred init', async () => {
    using pdfium = (await PDFium.init({ useNative: true })) as NativePDFiumInstance;
    expect(pdfium).toBeInstanceOf(NativePDFiumInstance);

    const pdfData = await readFile('test/fixtures/test_1.pdf');
    using doc = pdfium.openDocument(pdfData);
    expect(doc.pageCount).toBeGreaterThan(0);
  });

  test('falls back to WASM when useNative is false or omitted', async () => {
    using pdfium = await PDFium.init();
    expect(pdfium).toBeInstanceOf(PDFium);
  });
});

describe('native loader', () => {
  test('loadNativeBinding returns NativePdfium or null', () => {
    const result = loadNativeBinding();
    if (hasNative) {
      expect(result).not.toBeNull();
    } else {
      expect(result).toBeNull();
    }
  });
});

describe('PDFium.init({ forceWasm: true })', () => {
  test('returns PDFium (WASM) instance regardless of native availability', async () => {
    using pdfium = await PDFium.init({ forceWasm: true });
    // Should always be PDFium (WASM), never NativePDFiumInstance
    expect(pdfium).toBeInstanceOf(PDFium);
  });

  test('throws InitialisationError when combined with useNative: true', async () => {
    await expect(PDFium.init({ forceWasm: true, useNative: true })).rejects.toThrow(
      'Cannot use forceWasm and useNative together',
    );
  });

  test('opens and processes documents via WASM backend', async () => {
    using pdfium = await PDFium.init({ forceWasm: true });
    const pdfData = await readFile('test/fixtures/test_1.pdf');
    using doc = await pdfium.openDocument(pdfData);
    expect(doc.pageCount).toBeGreaterThan(0);

    using page = doc.getPage(0);
    expect(page.width).toBeGreaterThan(0);

    const text = page.getText();
    expect(typeof text).toBe('string');
  });

  test.skipIf(!hasNative)('returns WASM instance even when native is available', async () => {
    // First verify native is available
    {
      using nativeInstance = await PDFium.init({ useNative: true });
      expect(nativeInstance).toBeInstanceOf(NativePDFiumInstance);
    }

    // Now verify forceWasm overrides this
    using wasmInstance = await PDFium.init({ forceWasm: true });
    expect(wasmInstance).toBeInstanceOf(PDFium);
    expect(wasmInstance).not.toBeInstanceOf(NativePDFiumInstance);
  });
});
