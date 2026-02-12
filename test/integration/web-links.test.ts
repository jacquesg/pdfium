/**
 * Integration tests for web link detection.
 *
 * These tests verify automatic URL detection in page text content.
 */

import { describe, expect, test } from '../utils/fixtures.js';

describe('Web Links', () => {
  describe('webLinkCount', () => {
    test('should return number of detected web links', async ({ testPage }) => {
      const count = testPage.webLinkCount;
      expect(count).toBeTypeOf('number');
      expect(count).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getWebLinks', () => {
    test('should return array of WebLink objects', async ({ testPage }) => {
      const webLinks = testPage.getWebLinks();
      expect(webLinks).toBeInstanceOf(Array);
    });

    test('should return WebLink objects with required properties', async ({ testPage }) => {
      const webLinks = testPage.getWebLinks();

      for (const link of webLinks) {
        // Required properties
        expect(link.index).toBeTypeOf('number');
        expect(link.index).toBeGreaterThanOrEqual(0);
        expect(link.url).toBeTypeOf('string');
        expect(link.rects).toBeInstanceOf(Array);

        // Each rect should have left, top, right, bottom
        for (const rect of link.rects) {
          expect(rect.left).toBeTypeOf('number');
          expect(rect.top).toBeTypeOf('number');
          expect(rect.right).toBeTypeOf('number');
          expect(rect.bottom).toBeTypeOf('number');
        }

        // Optional textRange
        if (link.textRange !== undefined) {
          expect(link.textRange.startCharIndex).toBeTypeOf('number');
          expect(link.textRange.charCount).toBeTypeOf('number');
          expect(link.textRange.startCharIndex).toBeGreaterThanOrEqual(0);
          expect(link.textRange.charCount).toBeGreaterThanOrEqual(0);
        }
      }
    });

    test('should return URLs that look like web links', async ({ testPage }) => {
      const webLinks = testPage.getWebLinks();

      for (const link of webLinks) {
        // URLs should typically start with http://, https://, or www.
        const url = link.url.toLowerCase();
        const looksLikeUrl =
          url.startsWith('http://') ||
          url.startsWith('https://') ||
          url.startsWith('www.') ||
          url.includes('://') ||
          url.includes('.com') ||
          url.includes('.org') ||
          url.includes('.net');

        expect(looksLikeUrl).toBe(true);
      }
    });

    test('should return consistent count with webLinkCount', async ({ testPage }) => {
      const count = testPage.webLinkCount;
      const webLinks = testPage.getWebLinks();
      expect(webLinks.length).toBe(count);
    });
  });

  describe('WebLink structure', () => {
    test('should have sequential indices', async ({ testPage }) => {
      const webLinks = testPage.getWebLinks();

      for (let i = 0; i < webLinks.length; i++) {
        const link = webLinks[i];
        expect(link).toBeDefined();
        if (link) {
          expect(link.index).toBe(i);
        }
      }
    });

    test('should have non-empty rects for valid links', async ({ testPage }) => {
      const webLinks = testPage.getWebLinks();

      for (const link of webLinks) {
        // Most links should have at least one rect
        // (though some edge cases might have none)
        if (link.rects.length > 0) {
          const rect = link.rects[0];
          expect(rect).toBeDefined();
          if (rect) {
            // Rects should have positive width and height
            expect(rect.right).toBeGreaterThanOrEqual(rect.left);
            expect(rect.top).toBeGreaterThanOrEqual(rect.bottom);
          }
        }
      }
    });
  });
});
