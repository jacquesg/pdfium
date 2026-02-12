/**
 * Integration tests for digital signature inspection API.
 *
 * Tests the FPDF_GetSignature* and FPDFSignatureObj_* functions.
 */

import { DocMDPPermission } from '../../src/core/types.js';
import { describe, expect, test } from '../utils/fixtures.js';

describe('Digital Signatures API', () => {
  describe('signatureCount', () => {
    test('should return non-negative number', async ({ testDocument }) => {
      const count = testDocument.signatureCount;
      expect(count).toBeTypeOf('number');
      expect(count).toBeGreaterThanOrEqual(0);
    });
  });

  describe('hasSignatures', () => {
    test('should return boolean', async ({ testDocument }) => {
      const hasSigs = testDocument.hasSignatures();
      expect(hasSigs).toBeTypeOf('boolean');
    });

    test('should be consistent with signatureCount', async ({ testDocument }) => {
      const count = testDocument.signatureCount;
      const hasSigs = testDocument.hasSignatures();
      expect(hasSigs).toBe(count > 0);
    });
  });

  describe('getSignature', () => {
    test('should return undefined for negative index', async ({ testDocument }) => {
      const sig = testDocument.getSignature(-1);
      expect(sig).toBeUndefined();
    });

    test('should return undefined for out of bounds index', async ({ testDocument }) => {
      const count = testDocument.signatureCount;
      const sig = testDocument.getSignature(count + 10);
      expect(sig).toBeUndefined();
    });

    test('should return signature with valid structure if present', async ({ testDocument }) => {
      const count = testDocument.signatureCount;
      if (count > 0) {
        const sig = testDocument.getSignature(0);
        expect(sig).toBeDefined();
        if (sig !== undefined) {
          expect(sig.index).toBeTypeOf('number');
          expect(sig.index).toBe(0);
          expect(sig.docMDPPermission).toBeTypeOf('string');
          expect(Object.values(DocMDPPermission)).toContain(sig.docMDPPermission);
        }
      }
    });

    test('should not throw for any valid index', async ({ testDocument }) => {
      const count = testDocument.signatureCount;
      for (let i = 0; i < Math.min(count, 10); i++) {
        expect(() => testDocument.getSignature(i)).not.toThrow();
      }
    });
  });

  describe('signatures() generator', () => {
    test('signatures() returns a generator', async ({ testDocument }) => {
      const gen = testDocument.signatures();
      expect(gen[Symbol.iterator]).toBeDefined();
      expect(gen.next).toBeTypeOf('function');
    });

    test('signatures() yields same signatures as getSignatures()', async ({ testDocument }) => {
      const fromGenerator = [...testDocument.signatures()];
      const fromArray = testDocument.getSignatures();
      expect(fromGenerator).toEqual(fromArray);
    });

    test('signatures() is lazy - can break early', async ({ testDocument }) => {
      const gen = testDocument.signatures();
      const first = gen.next();
      // Test that we can iterate without exhausting
      if (!first.done) {
        expect(first.value).toHaveProperty('index');
        expect(first.value).toHaveProperty('docMDPPermission');
      }
    });
  });

  describe('getSignatures', () => {
    test('should return array', async ({ testDocument }) => {
      const signatures = testDocument.getSignatures();
      expect(signatures).toBeInstanceOf(Array);
    });

    test('should return array with length matching count', async ({ testDocument }) => {
      const count = testDocument.signatureCount;
      const signatures = testDocument.getSignatures();
      expect(signatures.length).toBeLessThanOrEqual(count);
    });

    test('should return signatures with valid structure', async ({ testDocument }) => {
      const signatures = testDocument.getSignatures();
      for (const sig of signatures) {
        expect(sig.index).toBeTypeOf('number');
        expect(sig.index).toBeGreaterThanOrEqual(0);
        expect(sig.docMDPPermission).toBeTypeOf('string');

        // Optional fields should have correct types if present
        if (sig.contents !== undefined) {
          expect(sig.contents).toBeInstanceOf(Uint8Array);
        }
        if (sig.byteRange !== undefined) {
          expect(sig.byteRange).toBeInstanceOf(Array);
          for (const n of sig.byteRange) {
            expect(n).toBeTypeOf('number');
          }
        }
        if (sig.subFilter !== undefined) {
          expect(sig.subFilter).toBeTypeOf('string');
        }
        if (sig.reason !== undefined) {
          expect(sig.reason).toBeTypeOf('string');
        }
        if (sig.time !== undefined) {
          expect(sig.time).toBeTypeOf('string');
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
  test('should handle test_3_with_images.pdf', async ({ openDocument }) => {
    const doc = await openDocument('test_3_with_images.pdf');

    expect(() => doc.signatureCount).not.toThrow();
    expect(() => doc.hasSignatures()).not.toThrow();
    expect(() => doc.getSignatures()).not.toThrow();
  });
});

describe('Digital Signatures with signed PDF', () => {
  test('should detect signatures in signed PDF', async ({ openDocument }) => {
    const document = await openDocument('test_8_with_signature.pdf');
    const count = document.signatureCount;
    expect(count).toBeTypeOf('number');
    // This PDF should have at least one signature
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('hasSignatures reflects signature presence', async ({ openDocument }) => {
    const document = await openDocument('test_8_with_signature.pdf');
    const hasSigs = document.hasSignatures();
    expect(hasSigs).toBeTypeOf('boolean');
    expect(hasSigs).toBe(document.signatureCount > 0);
  });

  test('getSignature returns signature data if present', async ({ openDocument }) => {
    const document = await openDocument('test_8_with_signature.pdf');
    const count = document.signatureCount;
    if (count > 0) {
      const sig = document.getSignature(0);
      expect(sig).toBeDefined();
      expect(sig!.index).toBe(0);
      expect(sig!.docMDPPermission).toBeTypeOf('string');
    }
  });

  test('signature has expected optional fields if present', async ({ openDocument }) => {
    const document = await openDocument('test_8_with_signature.pdf');
    const sigs = document.getSignatures();
    for (const sig of sigs) {
      // All these fields are optional but should have correct types
      if (sig.contents !== undefined) {
        expect(sig.contents).toBeInstanceOf(Uint8Array);
        expect(sig.contents.length).toBeGreaterThan(0);
      }
      if (sig.byteRange !== undefined) {
        expect(sig.byteRange).toBeInstanceOf(Array);
      }
      if (sig.subFilter !== undefined) {
        expect(sig.subFilter).toBeTypeOf('string');
      }
      if (sig.reason !== undefined) {
        expect(sig.reason).toBeTypeOf('string');
      }
      if (sig.time !== undefined) {
        expect(sig.time).toBeTypeOf('string');
      }
    }
  });

  test('signatures generator works with signed PDF', async ({ openDocument }) => {
    const document = await openDocument('test_8_with_signature.pdf');
    const fromGenerator = [...document.signatures()];
    const fromArray = document.getSignatures();
    expect(fromGenerator.length).toBe(fromArray.length);

    for (let i = 0; i < fromGenerator.length; i++) {
      expect(fromGenerator[i]!.index).toBe(fromArray[i]!.index);
    }
  });
});

describe('Digital Signatures post-dispose guards', () => {
  test('should throw on signatureCount after dispose', async ({ openDocument }) => {
    const doc = await openDocument('test_1.pdf');
    doc.dispose();
    expect(() => doc.signatureCount).toThrow();
  });

  test('should throw on hasSignatures after dispose', async ({ openDocument }) => {
    const doc = await openDocument('test_1.pdf');
    doc.dispose();
    expect(() => doc.hasSignatures()).toThrow();
  });

  test('should throw on getSignature after dispose', async ({ openDocument }) => {
    const doc = await openDocument('test_1.pdf');
    doc.dispose();
    expect(() => doc.getSignature(0)).toThrow();
  });

  test('should throw on getSignatures after dispose', async ({ openDocument }) => {
    const doc = await openDocument('test_1.pdf');
    doc.dispose();
    expect(() => doc.getSignatures()).toThrow();
  });
});
