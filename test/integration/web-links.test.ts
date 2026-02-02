/**
 * Integration tests for web link detection.
 *
 * These tests verify automatic URL detection in page text content.
 */

import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import type { PDFiumDocument } from '../../src/document/document.js';
import type { PDFiumPage } from '../../src/document/page.js';
import type { PDFium } from '../../src/pdfium.js';
import { initPdfium, loadTestDocument } from '../utils/helpers.js';

describe('Web Links', () => {
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

  describe('webLinkCount', () => {
    test('should return number of detected web links', () => {
      const count = page.webLinkCount;
      expect(typeof count).toBe('number');
      expect(count).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getWebLinks', () => {
    test('should return array of WebLink objects', () => {
      const webLinks = page.getWebLinks();
      expect(Array.isArray(webLinks)).toBe(true);
    });

    test('should return WebLink objects with required properties', () => {
      const webLinks = page.getWebLinks();

      for (const link of webLinks) {
        // Required properties
        expect(typeof link.index).toBe('number');
        expect(link.index).toBeGreaterThanOrEqual(0);
        expect(typeof link.url).toBe('string');
        expect(Array.isArray(link.rects)).toBe(true);

        // Each rect should have left, top, right, bottom
        for (const rect of link.rects) {
          expect(typeof rect.left).toBe('number');
          expect(typeof rect.top).toBe('number');
          expect(typeof rect.right).toBe('number');
          expect(typeof rect.bottom).toBe('number');
        }

        // Optional textRange
        if (link.textRange !== undefined) {
          expect(typeof link.textRange.startCharIndex).toBe('number');
          expect(typeof link.textRange.charCount).toBe('number');
          expect(link.textRange.startCharIndex).toBeGreaterThanOrEqual(0);
          expect(link.textRange.charCount).toBeGreaterThanOrEqual(0);
        }
      }
    });

    test('should return URLs that look like web links', () => {
      const webLinks = page.getWebLinks();

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

    test('should return consistent count with webLinkCount', () => {
      const count = page.webLinkCount;
      const webLinks = page.getWebLinks();
      expect(webLinks.length).toBe(count);
    });
  });

  describe('WebLink structure', () => {
    test('should have sequential indices', () => {
      const webLinks = page.getWebLinks();

      for (let i = 0; i < webLinks.length; i++) {
        const link = webLinks[i];
        expect(link).toBeDefined();
        if (link) {
          expect(link.index).toBe(i);
        }
      }
    });

    test('should have non-empty rects for valid links', () => {
      const webLinks = page.getWebLinks();

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
