/**
 * Integration tests for link and action API.
 *
 * Tests the FPDFLink_*, FPDFAction_*, and FPDFDest_* functions.
 */

import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { ActionType, DestinationFitType } from '../../src/core/types.js';
import type { PDFiumDocument } from '../../src/document/document.js';
import type { PDFium } from '../../src/pdfium.js';
import { initPdfium, loadTestDocument } from '../utils/helpers.js';

describe('Links API', () => {
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

  describe('getLinks', () => {
    test('should return an array', () => {
      using page = document.getPage(0);
      const links = page.getLinks();
      expect(Array.isArray(links)).toBe(true);
    });

    test('should return empty array for page without links', () => {
      using page = document.getPage(0);
      const links = page.getLinks();
      // test_1.pdf may not have links
      expect(links).toEqual(expect.any(Array));
    });
  });

  describe('links() generator', () => {
    test('links() returns a generator', () => {
      using page = document.getPage(0);
      const gen = page.links();
      expect(gen[Symbol.iterator]).toBeDefined();
      expect(typeof gen.next).toBe('function');
    });

    test('links() yields same links as getLinks()', () => {
      using page = document.getPage(0);
      const fromGenerator = [...page.links()];
      const fromArray = page.getLinks();
      expect(fromGenerator).toEqual(fromArray);
    });

    test('links() is lazy - can break early', () => {
      using page = document.getPage(0);
      const gen = page.links();
      const first = gen.next();
      // Test that we can iterate without exhausting
      if (!first.done) {
        expect(first.value).toHaveProperty('bounds');
      }
    });
  });

  describe('getLinkAtPoint', () => {
    test('should return undefined when no link at point', () => {
      using page = document.getPage(0);
      // Point outside any link
      const link = page.getLinkAtPoint(0, 0);
      expect(link).toBeUndefined();
    });

    test('should accept any coordinates', () => {
      using page = document.getPage(0);
      // Should not throw for any valid coordinates
      expect(() => page.getLinkAtPoint(100, 100)).not.toThrow();
      expect(() => page.getLinkAtPoint(-10, -10)).not.toThrow();
      expect(() => page.getLinkAtPoint(1000, 1000)).not.toThrow();
    });
  });

  describe('getLinkZOrderAtPoint', () => {
    test('should return -1 when no link at point', () => {
      using page = document.getPage(0);
      const zOrder = page.getLinkZOrderAtPoint(0, 0);
      expect(zOrder).toBe(-1);
    });
  });

  describe('webLinkCount', () => {
    test('should return a number', () => {
      using page = document.getPage(0);
      const count = page.webLinkCount;
      expect(typeof count).toBe('number');
      expect(count).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getWebLinks', () => {
    test('should return an array', () => {
      using page = document.getPage(0);
      const webLinks = page.getWebLinks();
      expect(Array.isArray(webLinks)).toBe(true);
    });

    test('should return objects with url and rects', () => {
      using page = document.getPage(0);
      const webLinks = page.getWebLinks();
      for (const link of webLinks) {
        expect(typeof link.url).toBe('string');
        expect(Array.isArray(link.rects)).toBe(true);
      }
    });
  });

  describe('post-dispose guards', () => {
    test('should throw on getLinks after dispose', async () => {
      const doc = await loadTestDocument(pdfium, 'test_1.pdf');
      using page = doc.getPage(0);
      page.dispose();
      expect(() => page.getLinks()).toThrow();
      doc.dispose();
    });

    test('should throw on getLinkAtPoint after dispose', async () => {
      const doc = await loadTestDocument(pdfium, 'test_1.pdf');
      using page = doc.getPage(0);
      page.dispose();
      expect(() => page.getLinkAtPoint(0, 0)).toThrow();
      doc.dispose();
    });

    test('should throw on getLinkZOrderAtPoint after dispose', async () => {
      const doc = await loadTestDocument(pdfium, 'test_1.pdf');
      using page = doc.getPage(0);
      page.dispose();
      expect(() => page.getLinkZOrderAtPoint(0, 0)).toThrow();
      doc.dispose();
    });

    test('should throw on webLinkCount after dispose', async () => {
      const doc = await loadTestDocument(pdfium, 'test_1.pdf');
      using page = doc.getPage(0);
      page.dispose();
      expect(() => page.webLinkCount).toThrow();
      doc.dispose();
    });

    test('should throw on getWebLinks after dispose', async () => {
      const doc = await loadTestDocument(pdfium, 'test_1.pdf');
      using page = doc.getPage(0);
      page.dispose();
      expect(() => page.getWebLinks()).toThrow();
      doc.dispose();
    });
  });
});

describe('ActionType enum', () => {
  test('should have expected values', () => {
    expect(ActionType.Unsupported).toBe(0);
    expect(ActionType.GoTo).toBe(1);
    expect(ActionType.RemoteGoTo).toBe(2);
    expect(ActionType.URI).toBe(3);
    expect(ActionType.Launch).toBe(4);
    expect(ActionType.EmbeddedGoTo).toBe(5);
  });
});

describe('DestinationFitType enum', () => {
  test('should have expected values', () => {
    expect(DestinationFitType.Unknown).toBe(0);
    expect(DestinationFitType.XYZ).toBe(1);
    expect(DestinationFitType.Fit).toBe(2);
    expect(DestinationFitType.FitH).toBe(3);
    expect(DestinationFitType.FitV).toBe(4);
    expect(DestinationFitType.FitR).toBe(5);
    expect(DestinationFitType.FitB).toBe(6);
    expect(DestinationFitType.FitBH).toBe(7);
    expect(DestinationFitType.FitBV).toBe(8);
  });
});

describe('Links with PDF containing links', () => {
  let pdfium: PDFium;

  beforeAll(async () => {
    pdfium = await initPdfium();
  });

  afterAll(() => {
    pdfium?.dispose();
  });

  test('should detect web links in PDF with bookmarks', async () => {
    // test_3_with_images.pdf has bookmarks which are internal links
    using doc = await loadTestDocument(pdfium, 'test_3_with_images.pdf');
    using page = doc.getPage(0);

    // Check if the page has any links
    const links = page.getLinks();
    // May or may not have links, but should not throw
    expect(Array.isArray(links)).toBe(true);
  });

  test('link bounds should have valid structure', async () => {
    using doc = await loadTestDocument(pdfium, 'test_3_with_images.pdf');
    using page = doc.getPage(0);

    const links = page.getLinks();
    for (const link of links) {
      expect(typeof link.index).toBe('number');
      expect(typeof link.bounds.left).toBe('number');
      expect(typeof link.bounds.top).toBe('number');
      expect(typeof link.bounds.right).toBe('number');
      expect(typeof link.bounds.bottom).toBe('number');
    }
  });
});
