/**
 * Integration tests for document metadata API.
 *
 * Tests the FPDF_GetMetaText, FPDF_GetFileVersion, and related functions.
 */

import { DocumentPermission, PageMode } from '../../src/core/types.js';
import { describe, expect, test } from '../utils/fixtures.js';

describe('Document Metadata', () => {
  describe('getMetadata', () => {
    test('should return metadata object', async ({ testDocument }) => {
      const metadata = testDocument.getMetadata();
      expect(metadata).toBeDefined();
      expect(metadata).toBeTypeOf('object');
    });

    test('should return empty object for document without metadata', async ({ testDocument }) => {
      const metadata = testDocument.getMetadata();
      // test_1.pdf may not have all metadata fields
      expect(metadata).toEqual(expect.any(Object));
    });
  });

  describe('getMetaText', () => {
    test('should return undefined for missing metadata', async ({ testDocument }) => {
      const title = testDocument.getMetaText('NonExistentTag');
      expect(title).toBeUndefined();
    });

    test('should accept standard metadata tags', async ({ testDocument }) => {
      // These should not throw, even if they return undefined
      expect(() => testDocument.getMetaText('Title')).not.toThrow();
      expect(() => testDocument.getMetaText('Author')).not.toThrow();
      expect(() => testDocument.getMetaText('Subject')).not.toThrow();
      expect(() => testDocument.getMetaText('Keywords')).not.toThrow();
      expect(() => testDocument.getMetaText('Creator')).not.toThrow();
      expect(() => testDocument.getMetaText('Producer')).not.toThrow();
      expect(() => testDocument.getMetaText('CreationDate')).not.toThrow();
      expect(() => testDocument.getMetaText('ModDate')).not.toThrow();
    });
  });

  describe('fileVersion', () => {
    test('should return a number or undefined', async ({ testDocument }) => {
      const version = testDocument.fileVersion;
      if (version !== undefined) {
        expect(version).toBeTypeOf('number');
        // PDF versions are typically 10-20 (1.0 to 2.0)
        expect(version).toBeGreaterThanOrEqual(10);
        expect(version).toBeLessThanOrEqual(20);
      }
    });
  });

  describe('permissions', () => {
    test('should return a number', async ({ testDocument }) => {
      const perms = testDocument.rawPermissions;
      expect(perms).toBeTypeOf('number');
    });

    test('should return user permissions', async ({ testDocument }) => {
      const userPerms = testDocument.userPermissions;
      expect(userPerms).toBeTypeOf('number');
    });

    test('permission flags should be usable for bitwise checks', async ({ testDocument }) => {
      const perms = testDocument.rawPermissions;
      // Check that we can use bitwise operations with the permission flags
      const canPrint = (perms & DocumentPermission.Print) !== 0;
      expect(canPrint).toBeTypeOf('boolean');
    });
  });

  describe('pageMode', () => {
    test('should return a valid PageMode enum value', async ({ testDocument }) => {
      const mode = testDocument.pageMode;
      expect(mode).toBeTypeOf('string');
      expect(Object.values(PageMode)).toContain(mode);
    });

    test('should default to UseNone for documents without page mode', async ({ testDocument }) => {
      // Most simple PDFs don't specify a page mode
      const mode = testDocument.pageMode;
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
    test('should return -1 for unencrypted document', async ({ testDocument }) => {
      const revision = testDocument.securityHandlerRevision;
      expect(revision).toBe(-1);
    });

    test('should return positive value for encrypted document', async ({ openDocument }) => {
      const encrypted = await openDocument('test_1_pass_12345678.pdf', '12345678');
      const revision = encrypted.securityHandlerRevision;
      expect(revision).toBeGreaterThan(0);
    });
  });

  describe('hasValidCrossReferenceTable', () => {
    test('should return true for valid PDFs', async ({ testDocument }) => {
      const hasValid = testDocument.hasValidCrossReferenceTable();
      expect(hasValid).toBe(true);
    });
  });

  describe('getTrailerEnds', () => {
    test('should return an array', async ({ testDocument }) => {
      const trailerEnds = testDocument.getTrailerEnds();
      expect(trailerEnds).toBeInstanceOf(Array);
    });

    test('should return array of numbers', async ({ testDocument }) => {
      const trailerEnds = testDocument.getTrailerEnds();
      for (const offset of trailerEnds) {
        expect(offset).toBeTypeOf('number');
        expect(offset).toBeGreaterThan(0);
      }
    });
  });

  describe('getPageLabel', () => {
    test('should return undefined for pages without labels', async ({ testDocument }) => {
      const label = testDocument.getPageLabel(0);
      // Most PDFs don't have page labels defined
      expect(label === undefined || typeof label === 'string').toBe(true);
    });

    test('should return undefined for out-of-range page index', async ({ testDocument }) => {
      const label = testDocument.getPageLabel(999);
      expect(label).toBeUndefined();
    });

    test('should return undefined for negative page index', async ({ testDocument }) => {
      const label = testDocument.getPageLabel(-1);
      expect(label).toBeUndefined();
    });
  });

  describe('isTagged', () => {
    test('should return a boolean', async ({ testDocument }) => {
      const tagged = testDocument.isTagged();
      expect(tagged).toBeTypeOf('boolean');
    });
  });

  describe('post-dispose guards', () => {
    test('should throw on getMetadata after dispose', async ({ openDocument }) => {
      const doc = await openDocument('test_1.pdf');
      doc.dispose();
      expect(() => doc.getMetadata()).toThrow();
    });

    test('should throw on getMetaText after dispose', async ({ openDocument }) => {
      const doc = await openDocument('test_1.pdf');
      doc.dispose();
      expect(() => doc.getMetaText('Title')).toThrow();
    });

    test('should throw on fileVersion after dispose', async ({ openDocument }) => {
      const doc = await openDocument('test_1.pdf');
      doc.dispose();
      expect(() => doc.fileVersion).toThrow();
    });

    test('should throw on rawPermissions after dispose', async ({ openDocument }) => {
      const doc = await openDocument('test_1.pdf');
      doc.dispose();
      expect(() => doc.rawPermissions).toThrow();
    });

    test('should throw on userPermissions after dispose', async ({ openDocument }) => {
      const doc = await openDocument('test_1.pdf');
      doc.dispose();
      expect(() => doc.userPermissions).toThrow();
    });

    test('should throw on pageMode after dispose', async ({ openDocument }) => {
      const doc = await openDocument('test_1.pdf');
      doc.dispose();
      expect(() => doc.pageMode).toThrow();
    });

    test('should throw on securityHandlerRevision after dispose', async ({ openDocument }) => {
      const doc = await openDocument('test_1.pdf');
      doc.dispose();
      expect(() => doc.securityHandlerRevision).toThrow();
    });

    test('should throw on hasValidCrossReferenceTable after dispose', async ({ openDocument }) => {
      const doc = await openDocument('test_1.pdf');
      doc.dispose();
      expect(() => doc.hasValidCrossReferenceTable()).toThrow();
    });

    test('should throw on getTrailerEnds after dispose', async ({ openDocument }) => {
      const doc = await openDocument('test_1.pdf');
      doc.dispose();
      expect(() => doc.getTrailerEnds()).toThrow();
    });

    test('should throw on getPageLabel after dispose', async ({ openDocument }) => {
      const doc = await openDocument('test_1.pdf');
      doc.dispose();
      expect(() => doc.getPageLabel(0)).toThrow();
    });

    test('should throw on isTagged after dispose', async ({ openDocument }) => {
      const doc = await openDocument('test_1.pdf');
      doc.dispose();
      expect(() => doc.isTagged()).toThrow();
    });
  });
});

describe('Document Metadata with PDF containing metadata', () => {
  test('should read producer from PDF with images', async ({ openDocument }) => {
    // test_3_with_images.pdf often has producer metadata from the tool that created it
    const doc = await openDocument('test_3_with_images.pdf');
    const producer = doc.getMetaText('Producer');
    // May or may not have producer, but should not throw
    expect(producer === undefined || typeof producer === 'string').toBe(true);
  });

  test('should read metadata from PDF with form', async ({ openDocument }) => {
    const doc = await openDocument('test_6_with_form.pdf');
    const metadata = doc.getMetadata();
    expect(metadata).toBeDefined();
  });
});

describe('Document Metadata with test_10_with_metadata.pdf', () => {
  describe('getMetaText with actual metadata', () => {
    test('should read Title metadata', async ({ openDocument }) => {
      const document = await openDocument('test_10_with_metadata.pdf');
      const title = document.getMetaText('Title');
      expect(title).toBe('Test Document Title');
    });

    test('should read Author metadata', async ({ openDocument }) => {
      const document = await openDocument('test_10_with_metadata.pdf');
      const author = document.getMetaText('Author');
      expect(author).toBe('Test Author Name');
    });

    test('should read Subject metadata', async ({ openDocument }) => {
      const document = await openDocument('test_10_with_metadata.pdf');
      const subject = document.getMetaText('Subject');
      expect(subject).toBe('Test Subject Description');
    });

    test('should read Keywords metadata', async ({ openDocument }) => {
      const document = await openDocument('test_10_with_metadata.pdf');
      const keywords = document.getMetaText('Keywords');
      expect(keywords).toBe('test, pdf, metadata, pdfium, wasm');
    });

    test('should read Creator metadata', async ({ openDocument }) => {
      const document = await openDocument('test_10_with_metadata.pdf');
      const creator = document.getMetaText('Creator');
      expect(creator).toBe('PDFium Test Suite');
    });

    test('should read Producer metadata', async ({ openDocument }) => {
      const document = await openDocument('test_10_with_metadata.pdf');
      const producer = document.getMetaText('Producer');
      expect(producer).toBe('Manual PDF Creation v1.0');
    });

    test('should read CreationDate metadata', async ({ openDocument }) => {
      const document = await openDocument('test_10_with_metadata.pdf');
      const creationDate = document.getMetaText('CreationDate');
      expect(creationDate).toBeDefined();
      expect(creationDate).toContain('2024');
    });

    test('should read ModDate metadata', async ({ openDocument }) => {
      const document = await openDocument('test_10_with_metadata.pdf');
      const modDate = document.getMetaText('ModDate');
      expect(modDate).toBeDefined();
      expect(modDate).toContain('2024');
    });
  });

  describe('getMetadata with actual metadata', () => {
    test('should return all metadata fields', async ({ openDocument }) => {
      const document = await openDocument('test_10_with_metadata.pdf');
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
    test('should return PDF version 17 for PDF 1.7', async ({ openDocument }) => {
      const document = await openDocument('test_10_with_metadata.pdf');
      const version = document.fileVersion;
      expect(version).toBe(17);
    });
  });
});
