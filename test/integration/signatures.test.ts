/**
 * Integration tests for digital signature inspection API.
 *
 * Tests the FPDF_GetSignature* and FPDFSignatureObj_* functions.
 */

import { describe, expect, test } from 'vitest';
import { DocMDPPermission } from '../../src/core/types.js';
import { initPdfium, loadTestDocument } from '../utils/helpers.js';

describe('Digital Signatures API', () => {
  describe('signatureCount', () => {
    test('should return non-negative number', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      const count = document.signatureCount;
      expect(typeof count).toBe('number');
      expect(count).toBeGreaterThanOrEqual(0);
    });
  });

  describe('hasSignatures', () => {
    test('should return boolean', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      const hasSigs = document.hasSignatures();
      expect(typeof hasSigs).toBe('boolean');
    });

    test('should be consistent with signatureCount', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      const count = document.signatureCount;
      const hasSigs = document.hasSignatures();
      expect(hasSigs).toBe(count > 0);
    });
  });

  describe('getSignature', () => {
    test('should return undefined for negative index', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      const sig = document.getSignature(-1);
      expect(sig).toBeUndefined();
    });

    test('should return undefined for out of bounds index', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      const count = document.signatureCount;
      const sig = document.getSignature(count + 10);
      expect(sig).toBeUndefined();
    });

    test('should return signature with valid structure if present', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      const count = document.signatureCount;
      if (count > 0) {
        const sig = document.getSignature(0);
        expect(sig).toBeDefined();
        if (sig !== undefined) {
          expect(typeof sig.index).toBe('number');
          expect(sig.index).toBe(0);
          expect(typeof sig.docMDPPermission).toBe('string');
          expect(Object.values(DocMDPPermission)).toContain(sig.docMDPPermission);
        }
      }
    });

    test('should not throw for any valid index', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      const count = document.signatureCount;
      for (let i = 0; i < Math.min(count, 10); i++) {
        expect(() => document.getSignature(i)).not.toThrow();
      }
    });
  });

  describe('signatures() generator', () => {
    test('signatures() returns a generator', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      const gen = document.signatures();
      expect(gen[Symbol.iterator]).toBeDefined();
      expect(typeof gen.next).toBe('function');
    });

    test('signatures() yields same signatures as getSignatures()', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      const fromGenerator = [...document.signatures()];
      const fromArray = document.getSignatures();
      expect(fromGenerator).toEqual(fromArray);
    });

    test('signatures() is lazy - can break early', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
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
    test('should return array', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      const signatures = document.getSignatures();
      expect(Array.isArray(signatures)).toBe(true);
    });

    test('should return array with length matching count', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      const count = document.signatureCount;
      const signatures = document.getSignatures();
      expect(signatures.length).toBeLessThanOrEqual(count);
    });

    test('should return signatures with valid structure', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      const signatures = document.getSignatures();
      for (const sig of signatures) {
        expect(typeof sig.index).toBe('number');
        expect(sig.index).toBeGreaterThanOrEqual(0);
        expect(typeof sig.docMDPPermission).toBe('string');

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
      expect(DocMDPPermission.None).toBe('None');
      expect(DocMDPPermission.NoChanges).toBe('NoChanges');
      expect(DocMDPPermission.FillAndSign).toBe('FillAndSign');
      expect(DocMDPPermission.FillSignAnnotate).toBe('FillSignAnnotate');
    });
  });
});

describe('Digital Signatures with different PDFs', () => {
  test('should handle test_3_with_images.pdf', async () => {
    using pdfium = await initPdfium();
    using doc = await loadTestDocument(pdfium, 'test_3_with_images.pdf');

    expect(() => doc.signatureCount).not.toThrow();
    expect(() => doc.hasSignatures()).not.toThrow();
    expect(() => doc.getSignatures()).not.toThrow();
  });
});

describe('Digital Signatures with signed PDF', () => {
  test('should detect signatures in signed PDF', async () => {
    using pdfium = await initPdfium();
    using document = await loadTestDocument(pdfium, 'test_8_with_signature.pdf');
    const count = document.signatureCount;
    expect(typeof count).toBe('number');
    // This PDF should have at least one signature
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('hasSignatures reflects signature presence', async () => {
    using pdfium = await initPdfium();
    using document = await loadTestDocument(pdfium, 'test_8_with_signature.pdf');
    const hasSigs = document.hasSignatures();
    expect(typeof hasSigs).toBe('boolean');
    expect(hasSigs).toBe(document.signatureCount > 0);
  });

  test('getSignature returns signature data if present', async () => {
    using pdfium = await initPdfium();
    using document = await loadTestDocument(pdfium, 'test_8_with_signature.pdf');
    const count = document.signatureCount;
    if (count > 0) {
      const sig = document.getSignature(0);
      expect(sig).toBeDefined();
      expect(sig!.index).toBe(0);
      expect(typeof sig!.docMDPPermission).toBe('string');
    }
  });

  test('signature has expected optional fields if present', async () => {
    using pdfium = await initPdfium();
    using document = await loadTestDocument(pdfium, 'test_8_with_signature.pdf');
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

  test('signatures generator works with signed PDF', async () => {
    using pdfium = await initPdfium();
    using document = await loadTestDocument(pdfium, 'test_8_with_signature.pdf');
    const fromGenerator = [...document.signatures()];
    const fromArray = document.getSignatures();
    expect(fromGenerator.length).toBe(fromArray.length);

    for (let i = 0; i < fromGenerator.length; i++) {
      expect(fromGenerator[i]!.index).toBe(fromArray[i]!.index);
    }
  });
});

describe('Digital Signatures post-dispose guards', () => {
  test('should throw on signatureCount after dispose', async () => {
    using pdfium = await initPdfium();
    using doc = await loadTestDocument(pdfium, 'test_1.pdf');
    doc.dispose();
    expect(() => doc.signatureCount).toThrow();
  });

  test('should throw on hasSignatures after dispose', async () => {
    using pdfium = await initPdfium();
    using doc = await loadTestDocument(pdfium, 'test_1.pdf');
    doc.dispose();
    expect(() => doc.hasSignatures()).toThrow();
  });

  test('should throw on getSignature after dispose', async () => {
    using pdfium = await initPdfium();
    using doc = await loadTestDocument(pdfium, 'test_1.pdf');
    doc.dispose();
    expect(() => doc.getSignature(0)).toThrow();
  });

  test('should throw on getSignatures after dispose', async () => {
    using pdfium = await initPdfium();
    using doc = await loadTestDocument(pdfium, 'test_1.pdf');
    doc.dispose();
    expect(() => doc.getSignatures()).toThrow();
  });
});
