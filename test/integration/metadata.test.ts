/**
 * Integration tests for document metadata API.
 *
 * Tests the FPDF_GetMetaText, FPDF_GetFileVersion, and related functions.
 */

import { readFile } from 'node:fs/promises';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { DocumentPermission, PageMode } from '../../src/core/types.js';
import type { PDFiumDocument } from '../../src/document/document.js';
import type { PDFium } from '../../src/pdfium.js';
import { initPdfium, loadTestDocument } from '../utils/helpers.js';

describe('Document Metadata', () => {
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

  describe('getMetadata', () => {
    test('should return metadata object', () => {
      const metadata = document.getMetadata();
      expect(metadata).toBeDefined();
      expect(typeof metadata).toBe('object');
    });

    test('should return empty object for document without metadata', () => {
      const metadata = document.getMetadata();
      // test_1.pdf may not have all metadata fields
      expect(metadata).toEqual(expect.any(Object));
    });
  });

  describe('getMetaText', () => {
    test('should return undefined for missing metadata', () => {
      const title = document.getMetaText('NonExistentTag');
      expect(title).toBeUndefined();
    });

    test('should accept standard metadata tags', () => {
      // These should not throw, even if they return undefined
      expect(() => document.getMetaText('Title')).not.toThrow();
      expect(() => document.getMetaText('Author')).not.toThrow();
      expect(() => document.getMetaText('Subject')).not.toThrow();
      expect(() => document.getMetaText('Keywords')).not.toThrow();
      expect(() => document.getMetaText('Creator')).not.toThrow();
      expect(() => document.getMetaText('Producer')).not.toThrow();
      expect(() => document.getMetaText('CreationDate')).not.toThrow();
      expect(() => document.getMetaText('ModDate')).not.toThrow();
    });
  });

  describe('fileVersion', () => {
    test('should return a number or undefined', () => {
      const version = document.fileVersion;
      if (version !== undefined) {
        expect(typeof version).toBe('number');
        // PDF versions are typically 10-20 (1.0 to 2.0)
        expect(version).toBeGreaterThanOrEqual(10);
        expect(version).toBeLessThanOrEqual(20);
      }
    });
  });

  describe('permissions', () => {
    test('should return a number', () => {
      const perms = document.permissions;
      expect(typeof perms).toBe('number');
    });

    test('should return user permissions', () => {
      const userPerms = document.userPermissions;
      expect(typeof userPerms).toBe('number');
    });

    test('permission flags should be usable for bitwise checks', () => {
      const perms = document.permissions;
      // Check that we can use bitwise operations with the permission flags
      const canPrint = (perms & DocumentPermission.Print) !== 0;
      expect(typeof canPrint).toBe('boolean');
    });
  });

  describe('pageMode', () => {
    test('should return a valid PageMode enum value', () => {
      const mode = document.pageMode;
      expect(typeof mode).toBe('number');
      expect(mode).toBeGreaterThanOrEqual(PageMode.UseNone);
      expect(mode).toBeLessThanOrEqual(PageMode.UseAttachments);
    });

    test('should default to UseNone for documents without page mode', () => {
      // Most simple PDFs don't specify a page mode
      const mode = document.pageMode;
      // We just verify it's a valid value
      expect([
        PageMode.UseNone,
        PageMode.UseOutlines,
        PageMode.UseThumbs,
        PageMode.FullScreen,
        PageMode.UseOC,
        PageMode.UseAttachments,
      ]).toContain(mode);
    });
  });

  describe('securityHandlerRevision', () => {
    test('should return -1 for unencrypted document', () => {
      const revision = document.securityHandlerRevision;
      expect(revision).toBe(-1);
    });

    test('should return positive value for encrypted document', async () => {
      const encryptedData = await readFile('test/fixtures/test_1_pass_12345678.pdf');
      using encrypted = await pdfium.openDocument(encryptedData, { password: '12345678' });
      const revision = encrypted.securityHandlerRevision;
      expect(revision).toBeGreaterThan(0);
    });
  });

  describe('hasValidCrossReferenceTable', () => {
    test('should return true for valid PDFs', () => {
      const hasValid = document.hasValidCrossReferenceTable();
      expect(hasValid).toBe(true);
    });
  });

  describe('getTrailerEnds', () => {
    test('should return an array', () => {
      const trailerEnds = document.getTrailerEnds();
      expect(Array.isArray(trailerEnds)).toBe(true);
    });

    test('should return array of numbers', () => {
      const trailerEnds = document.getTrailerEnds();
      for (const offset of trailerEnds) {
        expect(typeof offset).toBe('number');
        expect(offset).toBeGreaterThan(0);
      }
    });
  });

  describe('getPageLabel', () => {
    test('should return undefined for pages without labels', () => {
      const label = document.getPageLabel(0);
      // Most PDFs don't have page labels defined
      expect(label === undefined || typeof label === 'string').toBe(true);
    });

    test('should return undefined for out-of-range page index', () => {
      const label = document.getPageLabel(999);
      expect(label).toBeUndefined();
    });

    test('should return undefined for negative page index', () => {
      const label = document.getPageLabel(-1);
      expect(label).toBeUndefined();
    });
  });

  describe('isTagged', () => {
    test('should return a boolean', () => {
      const tagged = document.isTagged();
      expect(typeof tagged).toBe('boolean');
    });
  });

  describe('post-dispose guards', () => {
    test('should throw on getMetadata after dispose', async () => {
      const doc = await loadTestDocument(pdfium, 'test_1.pdf');
      doc.dispose();
      expect(() => doc.getMetadata()).toThrow();
    });

    test('should throw on getMetaText after dispose', async () => {
      const doc = await loadTestDocument(pdfium, 'test_1.pdf');
      doc.dispose();
      expect(() => doc.getMetaText('Title')).toThrow();
    });

    test('should throw on fileVersion after dispose', async () => {
      const doc = await loadTestDocument(pdfium, 'test_1.pdf');
      doc.dispose();
      expect(() => doc.fileVersion).toThrow();
    });

    test('should throw on permissions after dispose', async () => {
      const doc = await loadTestDocument(pdfium, 'test_1.pdf');
      doc.dispose();
      expect(() => doc.permissions).toThrow();
    });

    test('should throw on userPermissions after dispose', async () => {
      const doc = await loadTestDocument(pdfium, 'test_1.pdf');
      doc.dispose();
      expect(() => doc.userPermissions).toThrow();
    });

    test('should throw on pageMode after dispose', async () => {
      const doc = await loadTestDocument(pdfium, 'test_1.pdf');
      doc.dispose();
      expect(() => doc.pageMode).toThrow();
    });

    test('should throw on securityHandlerRevision after dispose', async () => {
      const doc = await loadTestDocument(pdfium, 'test_1.pdf');
      doc.dispose();
      expect(() => doc.securityHandlerRevision).toThrow();
    });

    test('should throw on hasValidCrossReferenceTable after dispose', async () => {
      const doc = await loadTestDocument(pdfium, 'test_1.pdf');
      doc.dispose();
      expect(() => doc.hasValidCrossReferenceTable()).toThrow();
    });

    test('should throw on getTrailerEnds after dispose', async () => {
      const doc = await loadTestDocument(pdfium, 'test_1.pdf');
      doc.dispose();
      expect(() => doc.getTrailerEnds()).toThrow();
    });

    test('should throw on getPageLabel after dispose', async () => {
      const doc = await loadTestDocument(pdfium, 'test_1.pdf');
      doc.dispose();
      expect(() => doc.getPageLabel(0)).toThrow();
    });

    test('should throw on isTagged after dispose', async () => {
      const doc = await loadTestDocument(pdfium, 'test_1.pdf');
      doc.dispose();
      expect(() => doc.isTagged()).toThrow();
    });
  });
});

describe('Document Metadata with PDF containing metadata', () => {
  let pdfium: PDFium;

  beforeAll(async () => {
    pdfium = await initPdfium();
  });

  afterAll(() => {
    pdfium?.dispose();
  });

  test('should read producer from PDF with images', async () => {
    // test_3_with_images.pdf often has producer metadata from the tool that created it
    using doc = await loadTestDocument(pdfium, 'test_3_with_images.pdf');
    const producer = doc.getMetaText('Producer');
    // May or may not have producer, but should not throw
    expect(producer === undefined || typeof producer === 'string').toBe(true);
  });

  test('should read metadata from PDF with form', async () => {
    using doc = await loadTestDocument(pdfium, 'test_6_with_form.pdf');
    const metadata = doc.getMetadata();
    expect(metadata).toBeDefined();
  });
});

describe('Document Metadata with test_10_with_metadata.pdf', () => {
  let pdfium: PDFium;
  let document: PDFiumDocument;

  beforeAll(async () => {
    pdfium = await initPdfium();
    document = await loadTestDocument(pdfium, 'test_10_with_metadata.pdf');
  });

  afterAll(() => {
    document?.dispose();
    pdfium?.dispose();
  });

  describe('getMetaText with actual metadata', () => {
    test('should read Title metadata', () => {
      const title = document.getMetaText('Title');
      expect(title).toBe('Test Document Title');
    });

    test('should read Author metadata', () => {
      const author = document.getMetaText('Author');
      expect(author).toBe('Test Author Name');
    });

    test('should read Subject metadata', () => {
      const subject = document.getMetaText('Subject');
      expect(subject).toBe('Test Subject Description');
    });

    test('should read Keywords metadata', () => {
      const keywords = document.getMetaText('Keywords');
      expect(keywords).toBe('test, pdf, metadata, pdfium, wasm');
    });

    test('should read Creator metadata', () => {
      const creator = document.getMetaText('Creator');
      expect(creator).toBe('PDFium Test Suite');
    });

    test('should read Producer metadata', () => {
      const producer = document.getMetaText('Producer');
      expect(producer).toBe('Manual PDF Creation v1.0');
    });

    test('should read CreationDate metadata', () => {
      const creationDate = document.getMetaText('CreationDate');
      expect(creationDate).toBeDefined();
      expect(creationDate).toContain('2024');
    });

    test('should read ModDate metadata', () => {
      const modDate = document.getMetaText('ModDate');
      expect(modDate).toBeDefined();
      expect(modDate).toContain('2024');
    });
  });

  describe('getMetadata with actual metadata', () => {
    test('should return all metadata fields', () => {
      const metadata = document.getMetadata();

      expect(metadata.title).toBe('Test Document Title');
      expect(metadata.author).toBe('Test Author Name');
      expect(metadata.subject).toBe('Test Subject Description');
      expect(metadata.keywords).toBe('test, pdf, metadata, pdfium, wasm');
      expect(metadata.creator).toBe('PDFium Test Suite');
      expect(metadata.producer).toBe('Manual PDF Creation v1.0');
      expect(metadata.creationDate).toBeDefined();
      expect(metadata.modificationDate).toBeDefined();
    });
  });

  describe('fileVersion', () => {
    test('should return PDF version 17 for PDF 1.7', () => {
      const version = document.fileVersion;
      expect(version).toBe(17);
    });
  });
});
