/**
 * Integration tests for path operations API.
 *
 * Tests the FPDFPath_* and FPDFPathSegment_* functions.
 */

import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { PathFillMode, PathSegmentType } from '../../src/core/types.js';
import type { PDFiumDocument } from '../../src/document/document.js';
import type { PDFiumPage } from '../../src/document/page.js';
import type { PDFium } from '../../src/pdfium.js';
import { initPdfium, loadTestDocument } from '../utils/helpers.js';

describe('Path Operations API - Basic Operations', () => {
  let pdfium: PDFium;
  let document: PDFiumDocument;
  let page: PDFiumPage;

  beforeAll(async () => {
    pdfium = await initPdfium();
    document = await loadTestDocument(pdfium, 'test_1.pdf');
    page = document.getPage(0);
  });

  afterAll(() => {
    page?.dispose();
    document?.dispose();
    pdfium?.dispose();
  });

  describe('pathMoveTo', () => {
    test('should return boolean for invalid path', () => {
      const result = page.pathMoveTo(0 as never, 100, 100);
      expect(typeof result).toBe('boolean');
    });
  });

  describe('pathLineTo', () => {
    test('should return boolean for invalid path', () => {
      const result = page.pathLineTo(0 as never, 200, 200);
      expect(typeof result).toBe('boolean');
    });
  });

  describe('pathBezierTo', () => {
    test('should return boolean for invalid path', () => {
      const result = page.pathBezierTo(0 as never, 100, 100, 150, 150, 200, 200);
      expect(typeof result).toBe('boolean');
    });
  });

  describe('pathClose', () => {
    test('should return boolean for invalid path', () => {
      const result = page.pathClose(0 as never);
      expect(typeof result).toBe('boolean');
    });
  });
});

describe('Path Operations API - Draw Mode', () => {
  let pdfium: PDFium;
  let document: PDFiumDocument;
  let page: PDFiumPage;

  beforeAll(async () => {
    pdfium = await initPdfium();
    document = await loadTestDocument(pdfium, 'test_1.pdf');
    page = document.getPage(0);
  });

  afterAll(() => {
    page?.dispose();
    document?.dispose();
    pdfium?.dispose();
  });

  describe('pathSetDrawMode', () => {
    test('should return boolean for invalid path', () => {
      const result = page.pathSetDrawMode(0 as never, PathFillMode.None, false);
      expect(typeof result).toBe('boolean');
    });

    test('should handle different fill modes', () => {
      expect(() => page.pathSetDrawMode(0 as never, PathFillMode.None, false)).not.toThrow();
      expect(() => page.pathSetDrawMode(0 as never, PathFillMode.Alternate, false)).not.toThrow();
      expect(() => page.pathSetDrawMode(0 as never, PathFillMode.Winding, true)).not.toThrow();
    });
  });

  describe('pathGetDrawMode', () => {
    test('should return null for invalid path', () => {
      const result = page.pathGetDrawMode(0 as never);
      expect(result).toBeNull();
    });
  });
});

describe('Path Operations API - Segments', () => {
  let pdfium: PDFium;
  let document: PDFiumDocument;
  let page: PDFiumPage;

  beforeAll(async () => {
    pdfium = await initPdfium();
    document = await loadTestDocument(pdfium, 'test_1.pdf');
    page = document.getPage(0);
  });

  afterAll(() => {
    page?.dispose();
    document?.dispose();
    pdfium?.dispose();
  });

  describe('pathCountSegments', () => {
    test('should return number for invalid path', () => {
      const result = page.pathCountSegments(0 as never);
      expect(typeof result).toBe('number');
    });
  });

  describe('pathGetSegment', () => {
    test('should return null for invalid path', () => {
      const result = page.pathGetSegment(0 as never, 0);
      expect(result).toBeNull();
    });
  });

  describe('pathSegmentGetPoint', () => {
    test('should return null for invalid segment', () => {
      const result = page.pathSegmentGetPoint(0 as never);
      expect(result).toBeNull();
    });
  });

  describe('pathSegmentGetType', () => {
    test('should return PathSegmentType', () => {
      const result = page.pathSegmentGetType(0 as never);
      expect([
        PathSegmentType.Unknown,
        PathSegmentType.LineTo,
        PathSegmentType.BezierTo,
        PathSegmentType.MoveTo,
      ]).toContain(result);
    });
  });

  describe('pathSegmentGetClose', () => {
    test('should return boolean for invalid segment', () => {
      const result = page.pathSegmentGetClose(0 as never);
      expect(typeof result).toBe('boolean');
    });
  });
});

describe('Path Operations with page objects', () => {
  let pdfium: PDFium;
  let document: PDFiumDocument;
  let page: PDFiumPage;

  beforeAll(async () => {
    pdfium = await initPdfium();
    document = await loadTestDocument(pdfium, 'test_1.pdf');
    page = document.getPage(0);
  });

  afterAll(() => {
    page?.dispose();
    document?.dispose();
    pdfium?.dispose();
  });

  test('should count page objects', () => {
    const objects = page.getObjects();
    expect(Array.isArray(objects)).toBe(true);
  });

  test('pageObjects() returns a generator', () => {
    const gen = page.pageObjects();
    expect(gen[Symbol.iterator]).toBeDefined();
    expect(typeof gen.next).toBe('function');
  });

  test('pageObjects() yields same objects as getObjects()', () => {
    const fromGenerator = [...page.pageObjects()];
    const fromArray = page.getObjects();
    expect(fromGenerator).toEqual(fromArray);
  });

  test('pageObjects() is lazy - can break early', () => {
    const gen = page.pageObjects();
    const first = gen.next();
    // Test that we can iterate without exhausting
    if (!first.done) {
      expect(first.value).toHaveProperty('type');
    }
  });
});

describe('Path Operations with different PDFs', () => {
  let pdfium: PDFium;

  beforeAll(async () => {
    pdfium = await initPdfium();
  });

  afterAll(() => {
    pdfium?.dispose();
  });

  test('should handle test_3_with_images.pdf', async () => {
    using doc = await loadTestDocument(pdfium, 'test_3_with_images.pdf');
    using page = doc.getPage(0);

    expect(() => page.pathCountSegments(0 as never)).not.toThrow();
    expect(() => page.pathMoveTo(0 as never, 100, 100)).not.toThrow();
  });
});

describe('Path Operations post-dispose guards', () => {
  let pdfium: PDFium;

  beforeAll(async () => {
    pdfium = await initPdfium();
  });

  afterAll(() => {
    pdfium?.dispose();
  });

  test('should throw on pathMoveTo after dispose', async () => {
    const doc = await loadTestDocument(pdfium, 'test_1.pdf');
    using page = doc.getPage(0);
    page.dispose();
    expect(() => page.pathMoveTo(0 as never, 100, 100)).toThrow();
    doc.dispose();
  });

  test('should throw on pathLineTo after dispose', async () => {
    const doc = await loadTestDocument(pdfium, 'test_1.pdf');
    using page = doc.getPage(0);
    page.dispose();
    expect(() => page.pathLineTo(0 as never, 200, 200)).toThrow();
    doc.dispose();
  });

  test('should throw on pathBezierTo after dispose', async () => {
    const doc = await loadTestDocument(pdfium, 'test_1.pdf');
    using page = doc.getPage(0);
    page.dispose();
    expect(() => page.pathBezierTo(0 as never, 100, 100, 150, 150, 200, 200)).toThrow();
    doc.dispose();
  });

  test('should throw on pathClose after dispose', async () => {
    const doc = await loadTestDocument(pdfium, 'test_1.pdf');
    using page = doc.getPage(0);
    page.dispose();
    expect(() => page.pathClose(0 as never)).toThrow();
    doc.dispose();
  });

  test('should throw on pathSetDrawMode after dispose', async () => {
    const doc = await loadTestDocument(pdfium, 'test_1.pdf');
    using page = doc.getPage(0);
    page.dispose();
    expect(() => page.pathSetDrawMode(0 as never, PathFillMode.None, false)).toThrow();
    doc.dispose();
  });

  test('should throw on pathGetDrawMode after dispose', async () => {
    const doc = await loadTestDocument(pdfium, 'test_1.pdf');
    using page = doc.getPage(0);
    page.dispose();
    expect(() => page.pathGetDrawMode(0 as never)).toThrow();
    doc.dispose();
  });

  test('should throw on pathCountSegments after dispose', async () => {
    const doc = await loadTestDocument(pdfium, 'test_1.pdf');
    using page = doc.getPage(0);
    page.dispose();
    expect(() => page.pathCountSegments(0 as never)).toThrow();
    doc.dispose();
  });

  test('should throw on pathGetSegment after dispose', async () => {
    const doc = await loadTestDocument(pdfium, 'test_1.pdf');
    using page = doc.getPage(0);
    page.dispose();
    expect(() => page.pathGetSegment(0 as never, 0)).toThrow();
    doc.dispose();
  });

  test('should throw on pathSegmentGetPoint after dispose', async () => {
    const doc = await loadTestDocument(pdfium, 'test_1.pdf');
    using page = doc.getPage(0);
    page.dispose();
    expect(() => page.pathSegmentGetPoint(0 as never)).toThrow();
    doc.dispose();
  });

  test('should throw on pathSegmentGetType after dispose', async () => {
    const doc = await loadTestDocument(pdfium, 'test_1.pdf');
    using page = doc.getPage(0);
    page.dispose();
    expect(() => page.pathSegmentGetType(0 as never)).toThrow();
    doc.dispose();
  });

  test('should throw on pathSegmentGetClose after dispose', async () => {
    const doc = await loadTestDocument(pdfium, 'test_1.pdf');
    using page = doc.getPage(0);
    page.dispose();
    expect(() => page.pathSegmentGetClose(0 as never)).toThrow();
    doc.dispose();
  });
});
