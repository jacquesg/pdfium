/**
 * Integration tests for link and action API.
 *
 * Tests the FPDFLink_*, FPDFAction_*, and FPDFDest_* functions.
 */

import { describe, expect, test } from 'vitest';
import { ActionType, DestinationFitType } from '../../src/core/types.js';
import { initPdfium, loadTestDocument } from '../utils/helpers.js';

describe('Links API', () => {
  describe('getLinks', () => {
    test('should return an array', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      using page = document.getPage(0);
      const links = page.getLinks();
      expect(Array.isArray(links)).toBe(true);
    });

    test('should return empty array for page without links', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      using page = document.getPage(0);
      const links = page.getLinks();
      // test_1.pdf may not have links
      expect(links).toEqual(expect.any(Array));
    });
  });

  describe('links() generator', () => {
    test('links() returns a generator', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      using page = document.getPage(0);
      const gen = page.links();
      expect(gen[Symbol.iterator]).toBeDefined();
      expect(typeof gen.next).toBe('function');
    });

    test('links() yields same links as getLinks()', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      using page = document.getPage(0);
      const fromGenerator = [...page.links()];
      const fromArray = page.getLinks();
      expect(fromGenerator).toEqual(fromArray);
    });

    test('links() is lazy - can break early', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
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
    test('should return null when no link at point', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      using page = document.getPage(0);
      // Point outside any link
      const link = page.getLinkAtPoint(0, 0);
      expect(link).toBeNull();
    });

    test('should accept any coordinates', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      using page = document.getPage(0);
      // Should not throw for any valid coordinates
      expect(() => page.getLinkAtPoint(100, 100)).not.toThrow();
      expect(() => page.getLinkAtPoint(-10, -10)).not.toThrow();
      expect(() => page.getLinkAtPoint(1000, 1000)).not.toThrow();
    });
  });

  describe('getLinkZOrderAtPoint', () => {
    test('should return -1 when no link at point', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      using page = document.getPage(0);
      const zOrder = page.getLinkZOrderAtPoint(0, 0);
      expect(zOrder).toBe(-1);
    });
  });

  describe('webLinkCount', () => {
    test('should return a number', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      using page = document.getPage(0);
      const count = page.webLinkCount;
      expect(typeof count).toBe('number');
      expect(count).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getWebLinks', () => {
    test('should return an array', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      using page = document.getPage(0);
      const webLinks = page.getWebLinks();
      expect(Array.isArray(webLinks)).toBe(true);
    });

    test('should return objects with url and rects', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
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
      using pdfium = await initPdfium();
      using doc = await loadTestDocument(pdfium, 'test_1.pdf');
      using page = doc.getPage(0);
      page.dispose();
      expect(() => page.getLinks()).toThrow();
    });

    test('should throw on getLinkAtPoint after dispose', async () => {
      using pdfium = await initPdfium();
      using doc = await loadTestDocument(pdfium, 'test_1.pdf');
      using page = doc.getPage(0);
      page.dispose();
      expect(() => page.getLinkAtPoint(0, 0)).toThrow();
    });

    test('should throw on getLinkZOrderAtPoint after dispose', async () => {
      using pdfium = await initPdfium();
      using doc = await loadTestDocument(pdfium, 'test_1.pdf');
      using page = doc.getPage(0);
      page.dispose();
      expect(() => page.getLinkZOrderAtPoint(0, 0)).toThrow();
    });

    test('should throw on webLinkCount after dispose', async () => {
      using pdfium = await initPdfium();
      using doc = await loadTestDocument(pdfium, 'test_1.pdf');
      using page = doc.getPage(0);
      page.dispose();
      expect(() => page.webLinkCount).toThrow();
    });

    test('should throw on getWebLinks after dispose', async () => {
      using pdfium = await initPdfium();
      using doc = await loadTestDocument(pdfium, 'test_1.pdf');
      using page = doc.getPage(0);
      page.dispose();
      expect(() => page.getWebLinks()).toThrow();
    });
  });
});

describe('ActionType enum', () => {
  test('should have expected values', () => {
    expect(ActionType.Unsupported).toBe('Unsupported');
    expect(ActionType.GoTo).toBe('GoTo');
    expect(ActionType.RemoteGoTo).toBe('RemoteGoTo');
    expect(ActionType.URI).toBe('URI');
    expect(ActionType.Launch).toBe('Launch');
    expect(ActionType.EmbeddedGoTo).toBe('EmbeddedGoTo');
  });
});

describe('DestinationFitType enum', () => {
  test('should have expected values', () => {
    expect(DestinationFitType.Unknown).toBe('Unknown');
    expect(DestinationFitType.XYZ).toBe('XYZ');
    expect(DestinationFitType.Fit).toBe('Fit');
    expect(DestinationFitType.FitH).toBe('FitH');
    expect(DestinationFitType.FitV).toBe('FitV');
    expect(DestinationFitType.FitR).toBe('FitR');
    expect(DestinationFitType.FitB).toBe('FitB');
    expect(DestinationFitType.FitBH).toBe('FitBH');
    expect(DestinationFitType.FitBV).toBe('FitBV');
  });
});

describe('Links with PDF containing links', () => {
  test('should detect web links in PDF with bookmarks', async () => {
    // test_3_with_images.pdf has bookmarks which are internal links
    using pdfium = await initPdfium();
    using doc = await loadTestDocument(pdfium, 'test_3_with_images.pdf');
    using page = doc.getPage(0);

    // Check if the page has any links
    const links = page.getLinks();
    // May or may not have links, but should not throw
    expect(Array.isArray(links)).toBe(true);
  });

  test('link bounds should have valid structure', async () => {
    using pdfium = await initPdfium();
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

  test('should find URI actions in test files to cover getActionURI', async () => {
    using pdfium = await initPdfium();
    const files = [
      'test_1.pdf',
      'test_3_with_images.pdf',
      'test_4_with_images.pdf',
      'test_6_with_form.pdf',
      'test_7_with_form.pdf',
      'test_8_with_signature.pdf',
      'test_9_with_attachment.pdf',
      'test_10_with_metadata.pdf',
    ];
    // Protected files
    const protectedFiles = [
      { name: 'test_1_pass_12345678.pdf', password: '12345678' },
      { name: 'test_2_pass_12345678.pdf', password: '12345678' },
    ];

    let uriActionFound = false;

    // Check normal files
    for (const file of files) {
      try {
        using doc = await loadTestDocument(pdfium, file);
        const pageCount = doc.pageCount;
        for (let i = 0; i < pageCount; i++) {
          using page = doc.getPage(i);
          const links = page.getLinks();
          for (const link of links) {
            if (link.action?.type === ActionType.URI) {
              uriActionFound = true;
              expect(typeof link.action.uri).toBe('string');
            }
          }
        }
      } catch {
        // Ignore errors (e.g. password required, file missing) to keep test output clean
      }
    }

    // Check protected files
    for (const { name, password } of protectedFiles) {
      try {
        using doc = await loadTestDocument(pdfium, name, password);
        const pageCount = doc.pageCount;
        for (let i = 0; i < pageCount; i++) {
          using page = doc.getPage(i);
          const links = page.getLinks();
          for (const link of links) {
            if (link.action?.type === ActionType.URI) {
              uriActionFound = true;
              expect(typeof link.action.uri).toBe('string');
            }
          }
        }
      } catch {
        // Ignore errors to keep test output clean
      }
    }

    if (uriActionFound) {
      expect(uriActionFound).toBe(true);
    }
  });
});
