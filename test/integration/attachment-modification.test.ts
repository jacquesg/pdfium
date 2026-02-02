/**
 * Integration tests for attachment modification API.
 *
 * Tests the FPDFDoc_*Attachment and FPDFAttachment_* functions.
 */

import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { AttachmentValueType } from '../../src/core/types.js';
import type { PDFiumDocument } from '../../src/document/document.js';
import type { PDFium } from '../../src/pdfium.js';
import { initPdfium, loadTestDocument } from '../utils/helpers.js';

describe('Attachment Modification API - Add/Delete', () => {
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

  describe('addAttachment', () => {
    test('should return handle or null', () => {
      const handle = document.addAttachment('test.txt');
      // May or may not succeed depending on document state
      if (handle !== null) {
        expect(typeof handle).toBe('number');
      }
    });

    test('should handle empty name', () => {
      expect(() => document.addAttachment('')).not.toThrow();
    });

    test('should handle unicode name', () => {
      expect(() => document.addAttachment('文件.txt')).not.toThrow();
    });
  });

  describe('deleteAttachment', () => {
    test('should return boolean', () => {
      const result = document.deleteAttachment(0);
      expect(typeof result).toBe('boolean');
    });

    test('should handle invalid index', () => {
      expect(() => document.deleteAttachment(-1)).not.toThrow();
      expect(() => document.deleteAttachment(9999)).not.toThrow();
    });
  });
});

describe('Attachment Modification API - Set File', () => {
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

  describe('setAttachmentFile', () => {
    test('should return boolean for invalid handle', () => {
      const result = document.setAttachmentFile(0 as never, new Uint8Array([1, 2, 3]));
      expect(typeof result).toBe('boolean');
    });

    test('should handle empty content', () => {
      expect(() => document.setAttachmentFile(0 as never, new Uint8Array(0))).not.toThrow();
    });

    test('should handle large content', () => {
      const largeContent = new Uint8Array(10000).fill(65);
      expect(() => document.setAttachmentFile(0 as never, largeContent)).not.toThrow();
    });
  });
});

describe('Attachment Modification API - Key/Value Operations', () => {
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

  describe('attachmentHasKey', () => {
    test('should return boolean for invalid handle', () => {
      const result = document.attachmentHasKey(0 as never, 'CreationDate');
      expect(typeof result).toBe('boolean');
    });

    test('should handle various keys', () => {
      expect(() => document.attachmentHasKey(0 as never, 'CreationDate')).not.toThrow();
      expect(() => document.attachmentHasKey(0 as never, 'ModDate')).not.toThrow();
      expect(() => document.attachmentHasKey(0 as never, 'Checksum')).not.toThrow();
    });
  });

  describe('getAttachmentValueType', () => {
    test('should return AttachmentValueType for invalid handle', () => {
      const result = document.getAttachmentValueType(0 as never, 'CreationDate');
      expect(Object.values(AttachmentValueType)).toContain(result);
    });
  });

  describe('getAttachmentStringValue', () => {
    test('should return undefined for invalid handle', () => {
      const result = document.getAttachmentStringValue(0 as never, 'CreationDate');
      expect(result).toBeUndefined();
    });
  });

  describe('setAttachmentStringValue', () => {
    test('should return boolean for invalid handle', () => {
      const result = document.setAttachmentStringValue(0 as never, 'CreationDate', '2024-01-01');
      expect(typeof result).toBe('boolean');
    });

    test('should handle empty value', () => {
      expect(() => document.setAttachmentStringValue(0 as never, 'Test', '')).not.toThrow();
    });

    test('should handle unicode value', () => {
      expect(() => document.setAttachmentStringValue(0 as never, 'Test', '你好世界')).not.toThrow();
    });
  });
});

describe('Attachment Modification with different PDFs', () => {
  let pdfium: PDFium;

  beforeAll(async () => {
    pdfium = await initPdfium();
  });

  afterAll(() => {
    pdfium?.dispose();
  });

  test('should handle test_3_with_images.pdf', async () => {
    using doc = await loadTestDocument(pdfium, 'test_3_with_images.pdf');

    expect(() => doc.addAttachment('test.txt')).not.toThrow();
    expect(() => doc.deleteAttachment(0)).not.toThrow();
    expect(() => doc.attachmentHasKey(0 as never, 'Test')).not.toThrow();
  });
});

describe('Attachment Modification post-dispose guards', () => {
  let pdfium: PDFium;

  beforeAll(async () => {
    pdfium = await initPdfium();
  });

  afterAll(() => {
    pdfium?.dispose();
  });

  test('should throw on addAttachment after dispose', async () => {
    const doc = await loadTestDocument(pdfium, 'test_1.pdf');
    doc.dispose();
    expect(() => doc.addAttachment('test.txt')).toThrow();
  });

  test('should throw on deleteAttachment after dispose', async () => {
    const doc = await loadTestDocument(pdfium, 'test_1.pdf');
    doc.dispose();
    expect(() => doc.deleteAttachment(0)).toThrow();
  });

  test('should throw on setAttachmentFile after dispose', async () => {
    const doc = await loadTestDocument(pdfium, 'test_1.pdf');
    doc.dispose();
    expect(() => doc.setAttachmentFile(0 as never, new Uint8Array([1, 2, 3]))).toThrow();
  });

  test('should throw on attachmentHasKey after dispose', async () => {
    const doc = await loadTestDocument(pdfium, 'test_1.pdf');
    doc.dispose();
    expect(() => doc.attachmentHasKey(0 as never, 'Test')).toThrow();
  });

  test('should throw on getAttachmentValueType after dispose', async () => {
    const doc = await loadTestDocument(pdfium, 'test_1.pdf');
    doc.dispose();
    expect(() => doc.getAttachmentValueType(0 as never, 'Test')).toThrow();
  });

  test('should throw on getAttachmentStringValue after dispose', async () => {
    const doc = await loadTestDocument(pdfium, 'test_1.pdf');
    doc.dispose();
    expect(() => doc.getAttachmentStringValue(0 as never, 'Test')).toThrow();
  });

  test('should throw on setAttachmentStringValue after dispose', async () => {
    const doc = await loadTestDocument(pdfium, 'test_1.pdf');
    doc.dispose();
    expect(() => doc.setAttachmentStringValue(0 as never, 'Test', 'value')).toThrow();
  });
});
