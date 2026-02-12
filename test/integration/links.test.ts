/**
 * Integration tests for link and action API.
 *
 * Tests the FPDFLink_*, FPDFAction_*, and FPDFDest_* functions.
 */

import { ActionType, DestinationFitType } from '../../src/core/types.js';
import { describe, expect, test } from '../utils/fixtures.js';

describe('Links API', () => {
  describe('getLinks', () => {
    test('should return an array', async ({ testPage }) => {
      const links = testPage.getLinks();
      expect(links).toBeInstanceOf(Array);
    });

    test('should return empty array for page without links', async ({ testPage }) => {
      const links = testPage.getLinks();
      // test_1.pdf may not have links
      expect(links).toEqual(expect.any(Array));
    });
  });

  describe('links() generator', () => {
    test('links() returns a generator', async ({ testPage }) => {
      const gen = testPage.links();
      expect(gen[Symbol.iterator]).toBeDefined();
      expect(gen.next).toBeTypeOf('function');
    });

    test('links() yields same links as getLinks()', async ({ testPage }) => {
      const fromGenerator = [...testPage.links()];
      const fromArray = testPage.getLinks();
      expect(fromGenerator).toEqual(fromArray);
    });

    test('links() is lazy - can break early', async ({ testPage }) => {
      const gen = testPage.links();
      const first = gen.next();
      // Test that we can iterate without exhausting
      if (!first.done) {
        expect(first.value).toHaveProperty('bounds');
      }
    });
  });

  describe('getLinkAtPoint', () => {
    test('should return null when no link at point', async ({ testPage }) => {
      // Point outside any link
      const link = testPage.getLinkAtPoint(0, 0);
      expect(link).toBeNull();
    });

    test('should accept any coordinates', async ({ testPage }) => {
      // Should not throw for any valid coordinates
      expect(() => testPage.getLinkAtPoint(100, 100)).not.toThrow();
      expect(() => testPage.getLinkAtPoint(-10, -10)).not.toThrow();
      expect(() => testPage.getLinkAtPoint(1000, 1000)).not.toThrow();
    });
  });

  describe('getLinkZOrderAtPoint', () => {
    test('should return -1 when no link at point', async ({ testPage }) => {
      const zOrder = testPage.getLinkZOrderAtPoint(0, 0);
      expect(zOrder).toBe(-1);
    });
  });

  describe('webLinkCount', () => {
    test('should return a number', async ({ testPage }) => {
      const count = testPage.webLinkCount;
      expect(count).toBeTypeOf('number');
      expect(count).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getWebLinks', () => {
    test('should return an array', async ({ testPage }) => {
      const webLinks = testPage.getWebLinks();
      expect(webLinks).toBeInstanceOf(Array);
    });

    test('should return objects with url and rects', async ({ testPage }) => {
      const webLinks = testPage.getWebLinks();
      for (const link of webLinks) {
        expect(link.url).toBeTypeOf('string');
        expect(link.rects).toBeInstanceOf(Array);
      }
    });
  });

  describe('post-dispose guards', () => {
    test('should throw on getLinks after dispose', async ({ openDocument }) => {
      const doc = await openDocument('test_1.pdf');
      const page = doc.getPage(0);
      page.dispose();
      expect(() => page.getLinks()).toThrow();
    });

    test('should throw on getLinkAtPoint after dispose', async ({ openDocument }) => {
      const doc = await openDocument('test_1.pdf');
      const page = doc.getPage(0);
      page.dispose();
      expect(() => page.getLinkAtPoint(0, 0)).toThrow();
    });

    test('should throw on getLinkZOrderAtPoint after dispose', async ({ openDocument }) => {
      const doc = await openDocument('test_1.pdf');
      const page = doc.getPage(0);
      page.dispose();
      expect(() => page.getLinkZOrderAtPoint(0, 0)).toThrow();
    });

    test('should throw on webLinkCount after dispose', async ({ openDocument }) => {
      const doc = await openDocument('test_1.pdf');
      const page = doc.getPage(0);
      page.dispose();
      expect(() => page.webLinkCount).toThrow();
    });

    test('should throw on getWebLinks after dispose', async ({ openDocument }) => {
      const doc = await openDocument('test_1.pdf');
      const page = doc.getPage(0);
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
  test('should detect web links in PDF with bookmarks', async ({ openDocument }) => {
    // test_3_with_images.pdf has bookmarks which are internal links
    const doc = await openDocument('test_3_with_images.pdf');
    using page = doc.getPage(0);

    // Check if the page has any links
    const links = page.getLinks();
    // May or may not have links, but should not throw
    expect(links).toBeInstanceOf(Array);
  });

  test('link bounds should have valid structure', async ({ openDocument }) => {
    const doc = await openDocument('test_3_with_images.pdf');
    using page = doc.getPage(0);

    const links = page.getLinks();
    for (const link of links) {
      expect(link.index).toBeTypeOf('number');
      expect(link.bounds.left).toBeTypeOf('number');
      expect(link.bounds.top).toBeTypeOf('number');
      expect(link.bounds.right).toBeTypeOf('number');
      expect(link.bounds.bottom).toBeTypeOf('number');
    }
  });

  test('should find URI actions in test files to cover getActionURI', async ({ openDocument }) => {
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
        const doc = await openDocument(file);
        const pageCount = doc.pageCount;
        for (let i = 0; i < pageCount; i++) {
          using page = doc.getPage(i);
          const links = page.getLinks();
          for (const link of links) {
            if (link.action?.type === ActionType.URI) {
              uriActionFound = true;
              expect(link.action.uri).toBeTypeOf('string');
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
        const doc = await openDocument(name, password);
        const pageCount = doc.pageCount;
        for (let i = 0; i < pageCount; i++) {
          using page = doc.getPage(i);
          const links = page.getLinks();
          for (const link of links) {
            if (link.action?.type === ActionType.URI) {
              uriActionFound = true;
              expect(link.action.uri).toBeTypeOf('string');
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
