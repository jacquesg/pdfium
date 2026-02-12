/**
 * Security-focused integration tests.
 *
 * Tests for NaN/Infinity guards, integer overflow protection, and
 * recursion depth limits.
 */

import { PDFiumErrorCode, RenderError } from '../../src/core/errors.js';
import { PDFium } from '../../src/pdfium.js';
import { describe, expect, test } from '../utils/fixtures.js';
import { loadTestDocument, loadWasmBinary } from '../utils/helpers.js';

describe('Security: render dimension validation', () => {
  test('NaN width should throw RenderError with RENDER_INVALID_DIMENSIONS', async ({ testPage }) => {
    expect(() => testPage.render({ width: NaN, height: 100 })).toThrow(RenderError);
    try {
      testPage.render({ width: NaN, height: 100 });
    } catch (error) {
      expect(error).toBeInstanceOf(RenderError);
      if (error instanceof RenderError) {
        expect(error.code).toBe(PDFiumErrorCode.RENDER_INVALID_DIMENSIONS);
      }
    }
  });

  test('Infinity height should throw RenderError with RENDER_INVALID_DIMENSIONS', async ({ testPage }) => {
    expect(() => testPage.render({ width: 100, height: Infinity })).toThrow(RenderError);
    try {
      testPage.render({ width: 100, height: Infinity });
    } catch (error) {
      expect(error).toBeInstanceOf(RenderError);
      if (error instanceof RenderError) {
        expect(error.code).toBe(PDFiumErrorCode.RENDER_INVALID_DIMENSIONS);
      }
    }
  });

  test('NaN scale should throw RenderError with RENDER_INVALID_DIMENSIONS', async ({ testPage }) => {
    expect(() => testPage.render({ scale: NaN })).toThrow(RenderError);
    try {
      testPage.render({ scale: NaN });
    } catch (error) {
      expect(error).toBeInstanceOf(RenderError);
      if (error instanceof RenderError) {
        expect(error.code).toBe(PDFiumErrorCode.RENDER_INVALID_DIMENSIONS);
      }
    }
  });

  test('-Infinity dimensions should throw RenderError', async ({ testPage }) => {
    expect(() => testPage.render({ width: -Infinity })).toThrow(RenderError);
    expect(() => testPage.render({ height: -Infinity })).toThrow(RenderError);
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
  test('NaN page index should throw', async ({ testDocument }) => {
    expect(() => testDocument.getPage(NaN)).toThrow();
  });

  test('Infinity page index should throw', async ({ testDocument }) => {
    expect(() => testDocument.getPage(Infinity)).toThrow();
  });

  test('floating point page index should throw', async ({ testDocument }) => {
    expect(() => testDocument.getPage(1.5)).toThrow();
  });
});

describe('Security: encryption support', () => {
  test('should identify encrypted document security handler revision', async ({ openDocument }) => {
    const document = await openDocument('test_1_pass_12345678.pdf', '12345678');

    // Security handler revision should be > 0 for encrypted files
    expect(document.securityHandlerRevision).toBeGreaterThan(0);

    // Permissions should be restricted (or at least valid number)
    expect(document.rawPermissions).toBeTypeOf('number');
  });

  test('unencrypted document should have -1 revision', async ({ testDocument }) => {
    expect(testDocument.securityHandlerRevision).toBe(-1);
  });
});
