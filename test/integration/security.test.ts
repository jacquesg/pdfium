/**
 * Security-focused integration tests.
 *
 * Tests for NaN/Infinity guards, integer overflow protection, and
 * recursion depth limits.
 */

import { describe, expect, test } from 'vitest';

import { PDFiumErrorCode, RenderError } from '../../src/core/errors.js';
import { PDFium } from '../../src/pdfium.js';
import { initPdfium, loadTestDocument, loadWasmBinary } from '../utils/helpers.js';

describe('Security: render dimension validation', () => {
  test('NaN width should throw RenderError with RENDER_INVALID_DIMENSIONS', async () => {
    using pdfium = await initPdfium();
    using document = await loadTestDocument(pdfium, 'test_1.pdf');
    using page = document.getPage(0);
    try {
      page.render({ width: NaN, height: 100 });
      expect.fail('Expected RenderError');
    } catch (error) {
      expect(error).toBeInstanceOf(RenderError);
      if (error instanceof RenderError) {
        expect(error.code).toBe(PDFiumErrorCode.RENDER_INVALID_DIMENSIONS);
      }
    }
  });

  test('Infinity height should throw RenderError with RENDER_INVALID_DIMENSIONS', async () => {
    using pdfium = await initPdfium();
    using document = await loadTestDocument(pdfium, 'test_1.pdf');
    using page = document.getPage(0);
    try {
      page.render({ width: 100, height: Infinity });
      expect.fail('Expected RenderError');
    } catch (error) {
      expect(error).toBeInstanceOf(RenderError);
      if (error instanceof RenderError) {
        expect(error.code).toBe(PDFiumErrorCode.RENDER_INVALID_DIMENSIONS);
      }
    }
  });

  test('NaN scale should throw RenderError with RENDER_INVALID_DIMENSIONS', async () => {
    using pdfium = await initPdfium();
    using document = await loadTestDocument(pdfium, 'test_1.pdf');
    using page = document.getPage(0);
    try {
      page.render({ scale: NaN });
      expect.fail('Expected RenderError');
    } catch (error) {
      expect(error).toBeInstanceOf(RenderError);
      if (error instanceof RenderError) {
        expect(error.code).toBe(PDFiumErrorCode.RENDER_INVALID_DIMENSIONS);
      }
    }
  });

  test('-Infinity dimensions should throw RenderError', async () => {
    using pdfium = await initPdfium();
    using document = await loadTestDocument(pdfium, 'test_1.pdf');
    using page = document.getPage(0);
    expect(() => page.render({ width: -Infinity })).toThrow(RenderError);
    expect(() => page.render({ height: -Infinity })).toThrow(RenderError);
  });
});

describe('Security: integer overflow protection', () => {
  test('extremely large dimensions should throw (overflow guard)', async () => {
    const wasmBinary = await loadWasmBinary();
    // Use high render limit to test the overflow guard, not the dimension limit
    using pdfium = await PDFium.init({
      wasmBinary,
      limits: { maxRenderDimension: 1_000_000 },
    });
    using document = await loadTestDocument(pdfium, 'test_1.pdf');
    using page = document.getPage(0);

    // Width * height * 4 would overflow Number.MAX_SAFE_INTEGER
    expect(() => page.render({ width: 100_000, height: 100_000 })).toThrow(RenderError);
  });
});

describe('Security: page index validation', () => {
  test('NaN page index should throw', async () => {
    using pdfium = await initPdfium();
    using document = await loadTestDocument(pdfium, 'test_1.pdf');
    expect(() => document.getPage(NaN)).toThrow();
  });

  test('Infinity page index should throw', async () => {
    using pdfium = await initPdfium();
    using document = await loadTestDocument(pdfium, 'test_1.pdf');
    expect(() => document.getPage(Infinity)).toThrow();
  });

  test('floating point page index should throw', async () => {
    using pdfium = await initPdfium();
    using document = await loadTestDocument(pdfium, 'test_1.pdf');
    expect(() => document.getPage(1.5)).toThrow();
  });
});

describe('Security: encryption support', () => {
  // We only have one encrypted fixture (likely RC4 or AES-128), but we can verify
  // that the security handler revision is exposed correctly.
  test('should identify encrypted document security handler revision', async () => {
    using pdfium = await initPdfium();
    const pdfData = await loadWasmBinary().then(() =>
      import('node:fs/promises').then((fs) => fs.readFile('test/fixtures/test_1_pass_12345678.pdf')),
    );
    using document = await pdfium.openDocument(pdfData, { password: '12345678' });

    // Security handler revision should be > 0 for encrypted files
    expect(document.securityHandlerRevision).toBeGreaterThan(0);

    // Permissions should be restricted (or at least valid number)
    expect(typeof document.rawPermissions).toBe('number');
  });

  test('unencrypted document should have -1 revision', async () => {
    using pdfium = await initPdfium();
    using document = await loadTestDocument(pdfium, 'test_1.pdf');
    expect(document.securityHandlerRevision).toBe(-1);
  });
});
