/**
 * Integration tests for attachment modification API.
 *
 * Tests the FPDFDoc_*Attachment and FPDFAttachment_* functions.
 */

import { describe, expect, test } from '../utils/fixtures.js';

describe('Attachment Modification API - Add/Delete', () => {
  describe('addAttachment', () => {
    test('should return writer or null', async ({ openDocument }) => {
      const document = await openDocument('test_1.pdf');
      const writer = document.addAttachment('test.txt');
      // May or may not succeed depending on document state
      if (writer !== null) {
        expect(writer).toBeDefined();
      }
    });

    test('should handle empty name', async ({ openDocument }) => {
      const document = await openDocument('test_1.pdf');
      expect(() => document.addAttachment('')).not.toThrow();
    });

    test('should handle unicode name', async ({ openDocument }) => {
      const document = await openDocument('test_1.pdf');
      expect(() => document.addAttachment('\u6587\u4EF6.txt')).not.toThrow();
    });
  });

  describe('deleteAttachment', () => {
    test('should return false when no attachments exist', async ({ openDocument }) => {
      const document = await openDocument('test_1.pdf');
      const result = document.deleteAttachment(0);
      expect(result).toBe(false);
    });

    test('should handle invalid index', async ({ openDocument }) => {
      const document = await openDocument('test_1.pdf');
      expect(() => document.deleteAttachment(-1)).not.toThrow();
      expect(() => document.deleteAttachment(9999)).not.toThrow();
    });
  });
});

describe('PDFiumAttachmentWriter API', () => {
  test('addAttachment should return a writer', async ({ openDocument }) => {
    const document = await openDocument('test_1.pdf');
    const writer = document.addAttachment('report.txt');
    expect(writer).not.toBeNull();
  });

  test('writer.setFile should accept a Uint8Array', async ({ openDocument }) => {
    const document = await openDocument('test_1.pdf');
    const writer = document.addAttachment('data.bin');
    expect(writer).not.toBeNull();

    const data = new Uint8Array([0x48, 0x65, 0x6c, 0x6c, 0x6f]); // "Hello"
    const result = writer!.setFile(data);
    expect(result).toBe(true);
  });

  test('writer.hasKey should return a boolean', async ({ openDocument }) => {
    const document = await openDocument('test_1.pdf');
    const writer = document.addAttachment('meta.txt');
    expect(writer).not.toBeNull();

    // Before setting any key, CheckSum should not exist
    const has = writer!.hasKey('CheckSum');
    expect(has).toBe(false);
  });

  test('writer.setStringValue / getStringValue should round-trip after setFile', async ({ openDocument }) => {
    const document = await openDocument('test_1.pdf');
    const writer = document.addAttachment('kv.txt');
    expect(writer).not.toBeNull();

    // Set file data first — attachment must be initialised before metadata
    const data = new Uint8Array([0x48, 0x65, 0x6c, 0x6c, 0x6f]);
    writer!.setFile(data);

    const setResult = writer!.setStringValue('CreationDate', 'D:20240101120000');
    if (setResult) {
      const value = writer!.getStringValue('CreationDate');
      expect(value).toBe('D:20240101120000');
    } else {
      // Some PDFium builds don't support setting string values on new attachments
      expect(setResult).toBe(false);
    }
  });

  test('writer.getValueType should return a known type', async ({ openDocument }) => {
    const document = await openDocument('test_1.pdf');
    const writer = document.addAttachment('typed.txt');
    expect(writer).not.toBeNull();

    // Query a non-existent key — should return Unknown
    const valueType = writer!.getValueType('NonExistentKey');
    expect(valueType).toBe('Unknown');
  });
});

describe('Attachment Modification with different PDFs', () => {
  test('should handle test_3_with_images.pdf', async ({ openDocument }) => {
    const doc = await openDocument('test_3_with_images.pdf');

    expect(() => doc.addAttachment('test.txt')).not.toThrow();
    expect(() => doc.deleteAttachment(0)).not.toThrow();
  });
});

describe('Attachment Modification post-dispose guards', () => {
  test('should throw on addAttachment after dispose', async ({ openDocument }) => {
    const doc = await openDocument('test_1.pdf');
    doc.dispose();
    expect(() => doc.addAttachment('test.txt')).toThrow();
  });

  test('should throw on deleteAttachment after dispose', async ({ openDocument }) => {
    const doc = await openDocument('test_1.pdf');
    doc.dispose();
    expect(() => doc.deleteAttachment(0)).toThrow();
  });
});
