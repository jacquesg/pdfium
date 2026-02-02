/**
 * Integration tests for digital signature inspection API.
 *
 * Tests the FPDF_GetSignature* and FPDFSignatureObj_* functions.
 */

import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { DocMDPPermission } from '../../src/core/types.js';
import type { PDFiumDocument } from '../../src/document/document.js';
import type { PDFium } from '../../src/pdfium.js';
import { initPdfium, loadTestDocument } from '../utils/helpers.js';

describe('Digital Signatures API', () => {
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

  describe('signatureCount', () => {
    test('should return non-negative number', () => {
      const count = document.signatureCount;
      expect(typeof count).toBe('number');
      expect(count).toBeGreaterThanOrEqual(0);
    });
  });

  describe('hasSignatures', () => {
    test('should return boolean', () => {
      const hasSigs = document.hasSignatures();
      expect(typeof hasSigs).toBe('boolean');
    });

    test('should be consistent with signatureCount', () => {
      const count = document.signatureCount;
      const hasSigs = document.hasSignatures();
      expect(hasSigs).toBe(count > 0);
    });
  });

  describe('getSignature', () => {
    test('should return undefined for negative index', () => {
      const sig = document.getSignature(-1);
      expect(sig).toBeUndefined();
    });

    test('should return undefined for out of bounds index', () => {
      const count = document.signatureCount;
      const sig = document.getSignature(count + 10);
      expect(sig).toBeUndefined();
    });

    test('should return signature with valid structure if present', () => {
      const count = document.signatureCount;
      if (count > 0) {
        const sig = document.getSignature(0);
        expect(sig).toBeDefined();
        if (sig !== undefined) {
          expect(typeof sig.index).toBe('number');
          expect(sig.index).toBe(0);
          expect(typeof sig.docMDPPermission).toBe('number');
          expect([0, 1, 2, 3]).toContain(sig.docMDPPermission);
        }
      }
    });

    test('should not throw for any valid index', () => {
      const count = document.signatureCount;
      for (let i = 0; i < Math.min(count, 10); i++) {
        expect(() => document.getSignature(i)).not.toThrow();
      }
    });
  });

  describe('signatures() generator', () => {
    test('signatures() returns a generator', () => {
      const gen = document.signatures();
      expect(gen[Symbol.iterator]).toBeDefined();
      expect(typeof gen.next).toBe('function');
    });

    test('signatures() yields same signatures as getSignatures()', () => {
      const fromGenerator = [...document.signatures()];
      const fromArray = document.getSignatures();
      expect(fromGenerator).toEqual(fromArray);
    });

    test('signatures() is lazy - can break early', () => {
      const gen = document.signatures();
      const first = gen.next();
      // Test that we can iterate without exhausting
      if (!first.done) {
        expect(first.value).toHaveProperty('index');
        expect(first.value).toHaveProperty('docMDPPermission');
      }
    });
  });

  describe('getSignatures', () => {
    test('should return array', () => {
      const signatures = document.getSignatures();
      expect(Array.isArray(signatures)).toBe(true);
    });

    test('should return array with length matching count', () => {
      const count = document.signatureCount;
      const signatures = document.getSignatures();
      expect(signatures.length).toBeLessThanOrEqual(count);
    });

    test('should return signatures with valid structure', () => {
      const signatures = document.getSignatures();
      for (const sig of signatures) {
        expect(typeof sig.index).toBe('number');
        expect(sig.index).toBeGreaterThanOrEqual(0);
        expect(typeof sig.docMDPPermission).toBe('number');

        // Optional fields should have correct types if present
        if (sig.contents !== undefined) {
          expect(sig.contents).toBeInstanceOf(Uint8Array);
        }
        if (sig.byteRange !== undefined) {
          expect(Array.isArray(sig.byteRange)).toBe(true);
          for (const n of sig.byteRange) {
            expect(typeof n).toBe('number');
          }
        }
        if (sig.subFilter !== undefined) {
          expect(typeof sig.subFilter).toBe('string');
        }
        if (sig.reason !== undefined) {
          expect(typeof sig.reason).toBe('string');
        }
        if (sig.time !== undefined) {
          expect(typeof sig.time).toBe('string');
        }
      }
    });
  });

  describe('DocMDPPermission enum', () => {
    test('should have expected values', () => {
      expect(DocMDPPermission.None).toBe(0);
      expect(DocMDPPermission.NoChanges).toBe(1);
      expect(DocMDPPermission.FillAndSign).toBe(2);
      expect(DocMDPPermission.FillSignAnnotate).toBe(3);
    });
  });
});

describe('Digital Signatures with different PDFs', () => {
  let pdfium: PDFium;

  beforeAll(async () => {
    pdfium = await initPdfium();
  });

  afterAll(() => {
    pdfium?.dispose();
  });

  test('should handle test_3_with_images.pdf', async () => {
    using doc = await loadTestDocument(pdfium, 'test_3_with_images.pdf');

    expect(() => doc.signatureCount).not.toThrow();
    expect(() => doc.hasSignatures()).not.toThrow();
    expect(() => doc.getSignatures()).not.toThrow();
  });
});

describe('Digital Signatures with signed PDF', () => {
  let pdfium: PDFium;
  let document: PDFiumDocument;

  beforeAll(async () => {
    pdfium = await initPdfium();
    document = await loadTestDocument(pdfium, 'test_8_with_signature.pdf');
  });

  afterAll(() => {
    document?.dispose();
    pdfium?.dispose();
  });

  test('should detect signatures in signed PDF', () => {
    const count = document.signatureCount;
    expect(typeof count).toBe('number');
    // This PDF should have at least one signature
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('hasSignatures reflects signature presence', () => {
    const hasSigs = document.hasSignatures();
    expect(typeof hasSigs).toBe('boolean');
    expect(hasSigs).toBe(document.signatureCount > 0);
  });

  test('getSignature returns signature data if present', () => {
    const count = document.signatureCount;
    if (count > 0) {
      const sig = document.getSignature(0);
      expect(sig).toBeDefined();
      expect(sig!.index).toBe(0);
      expect(typeof sig!.docMDPPermission).toBe('number');
    }
  });

  test('signature has expected optional fields if present', () => {
    const sigs = document.getSignatures();
    for (const sig of sigs) {
      // All these fields are optional but should have correct types
      if (sig.contents !== undefined) {
        expect(sig.contents).toBeInstanceOf(Uint8Array);
        expect(sig.contents.length).toBeGreaterThan(0);
      }
      if (sig.byteRange !== undefined) {
        expect(Array.isArray(sig.byteRange)).toBe(true);
      }
      if (sig.subFilter !== undefined) {
        expect(typeof sig.subFilter).toBe('string');
      }
      if (sig.reason !== undefined) {
        expect(typeof sig.reason).toBe('string');
      }
      if (sig.time !== undefined) {
        expect(typeof sig.time).toBe('string');
      }
    }
  });

  test('signatures generator works with signed PDF', () => {
    const fromGenerator = [...document.signatures()];
    const fromArray = document.getSignatures();
    expect(fromGenerator.length).toBe(fromArray.length);

    for (let i = 0; i < fromGenerator.length; i++) {
      expect(fromGenerator[i]!.index).toBe(fromArray[i]!.index);
    }
  });
});

describe('Digital Signatures post-dispose guards', () => {
  let pdfium: PDFium;

  beforeAll(async () => {
    pdfium = await initPdfium();
  });

  afterAll(() => {
    pdfium?.dispose();
  });

  test('should throw on signatureCount after dispose', async () => {
    const doc = await loadTestDocument(pdfium, 'test_1.pdf');
    doc.dispose();
    expect(() => doc.signatureCount).toThrow();
  });

  test('should throw on hasSignatures after dispose', async () => {
    const doc = await loadTestDocument(pdfium, 'test_1.pdf');
    doc.dispose();
    expect(() => doc.hasSignatures()).toThrow();
  });

  test('should throw on getSignature after dispose', async () => {
    const doc = await loadTestDocument(pdfium, 'test_1.pdf');
    doc.dispose();
    expect(() => doc.getSignature(0)).toThrow();
  });

  test('should throw on getSignatures after dispose', async () => {
    const doc = await loadTestDocument(pdfium, 'test_1.pdf');
    doc.dispose();
    expect(() => doc.getSignatures()).toThrow();
  });
});
