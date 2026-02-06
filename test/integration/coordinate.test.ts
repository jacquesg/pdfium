/**
 * Integration tests for coordinate conversion methods.
 *
 * These tests verify device-to-page and page-to-device coordinate transformations.
 */

import { describe, expect, test } from 'vitest';
import type { CoordinateTransformContext } from '../../src/core/types.js';
import { PageRotation } from '../../src/core/types.js';
import { initPdfium, loadTestDocument } from '../utils/helpers.js';

// A4 page dimensions in points (72 DPI)
const A4_WIDTH = 595;
const A4_HEIGHT = 842;

describe('Coordinate Conversion', () => {
  describe('deviceToPage', () => {
    test('should convert device origin to page origin', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      using page = document.getPage(0);

      const context: CoordinateTransformContext = {
        startX: 0,
        startY: 0,
        sizeX: A4_WIDTH,
        sizeY: A4_HEIGHT,
        rotate: PageRotation.None,
      };

      const result = page.deviceToPage(context, 0, 0);

      // Device origin (0,0) at top-left maps to page (0, height) as page origin is bottom-left
      expect(result.x).toBeCloseTo(0, 0);
      expect(result.y).toBeCloseTo(A4_HEIGHT, 0);
    });

    test('should convert device bottom-right to page bottom-right', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      using page = document.getPage(0);

      const context: CoordinateTransformContext = {
        startX: 0,
        startY: 0,
        sizeX: A4_WIDTH,
        sizeY: A4_HEIGHT,
        rotate: PageRotation.None,
      };

      const result = page.deviceToPage(context, A4_WIDTH, A4_HEIGHT);

      // Device bottom-right maps to page bottom-right (width, 0)
      expect(result.x).toBeCloseTo(A4_WIDTH, 0);
      expect(result.y).toBeCloseTo(0, 0);
    });

    test('should convert device centre to page centre', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      using page = document.getPage(0);

      const context: CoordinateTransformContext = {
        startX: 0,
        startY: 0,
        sizeX: A4_WIDTH,
        sizeY: A4_HEIGHT,
        rotate: PageRotation.None,
      };

      const result = page.deviceToPage(context, A4_WIDTH / 2, A4_HEIGHT / 2);

      expect(result.x).toBeCloseTo(A4_WIDTH / 2, 0);
      expect(result.y).toBeCloseTo(A4_HEIGHT / 2, 0);
    });

    test('should handle scaled viewport', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      using page = document.getPage(0);

      const scale = 2;
      const context: CoordinateTransformContext = {
        startX: 0,
        startY: 0,
        sizeX: A4_WIDTH * scale,
        sizeY: A4_HEIGHT * scale,
        rotate: PageRotation.None,
      };

      // Device point at 2x scale
      const result = page.deviceToPage(context, A4_WIDTH, A4_HEIGHT);

      // Should map to page centre
      expect(result.x).toBeCloseTo(A4_WIDTH / 2, 0);
      expect(result.y).toBeCloseTo(A4_HEIGHT / 2, 0);
    });

    test('should handle viewport offset', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      using page = document.getPage(0);

      const context: CoordinateTransformContext = {
        startX: 100,
        startY: 50,
        sizeX: A4_WIDTH,
        sizeY: A4_HEIGHT,
        rotate: PageRotation.None,
      };

      // Point at viewport offset
      const result = page.deviceToPage(context, 100, 50);

      // Should map to page top-left (0, height)
      expect(result.x).toBeCloseTo(0, 0);
      expect(result.y).toBeCloseTo(A4_HEIGHT, 0);
    });

    test('should handle 90 degree rotation', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      using page = document.getPage(0);

      const context: CoordinateTransformContext = {
        startX: 0,
        startY: 0,
        sizeX: A4_HEIGHT, // Width and height swapped for rotated page
        sizeY: A4_WIDTH,
        rotate: PageRotation.Clockwise90,
      };

      const result = page.deviceToPage(context, 0, 0);

      // With 90 degree rotation, coordinate mapping changes
      expect(typeof result.x).toBe('number');
      expect(typeof result.y).toBe('number');
      expect(Number.isFinite(result.x)).toBe(true);
      expect(Number.isFinite(result.y)).toBe(true);
    });
  });

  describe('pageToDevice', () => {
    test('should convert page origin to device coordinates', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      using page = document.getPage(0);

      const context: CoordinateTransformContext = {
        startX: 0,
        startY: 0,
        sizeX: A4_WIDTH,
        sizeY: A4_HEIGHT,
        rotate: PageRotation.None,
      };

      // Page origin is bottom-left (0, 0)
      const result = page.pageToDevice(context, 0, 0);

      // Should map to device bottom-left (0, height)
      expect(result.x).toBe(0);
      expect(result.y).toBeCloseTo(A4_HEIGHT, 0);
    });

    test('should convert page top-left to device origin', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      using page = document.getPage(0);

      const context: CoordinateTransformContext = {
        startX: 0,
        startY: 0,
        sizeX: A4_WIDTH,
        sizeY: A4_HEIGHT,
        rotate: PageRotation.None,
      };

      // Page top-left is (0, height)
      const result = page.pageToDevice(context, 0, A4_HEIGHT);

      // Should map to device origin (0, 0)
      expect(result.x).toBe(0);
      expect(result.y).toBe(0);
    });

    test('should convert page centre to device centre', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      using page = document.getPage(0);

      const context: CoordinateTransformContext = {
        startX: 0,
        startY: 0,
        sizeX: A4_WIDTH,
        sizeY: A4_HEIGHT,
        rotate: PageRotation.None,
      };

      const result = page.pageToDevice(context, A4_WIDTH / 2, A4_HEIGHT / 2);

      // Device coordinates are integers, so allow for rounding
      expect(Math.abs(result.x - A4_WIDTH / 2)).toBeLessThanOrEqual(1);
      expect(Math.abs(result.y - A4_HEIGHT / 2)).toBeLessThanOrEqual(1);
    });

    test('should handle scaled viewport', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      using page = document.getPage(0);

      const scale = 2;
      const context: CoordinateTransformContext = {
        startX: 0,
        startY: 0,
        sizeX: A4_WIDTH * scale,
        sizeY: A4_HEIGHT * scale,
        rotate: PageRotation.None,
      };

      // Page centre
      const result = page.pageToDevice(context, A4_WIDTH / 2, A4_HEIGHT / 2);

      // Should map to device centre at 2x scale
      expect(result.x).toBeCloseTo(A4_WIDTH, 0);
      expect(result.y).toBeCloseTo(A4_HEIGHT, 0);
    });

    test('should handle viewport offset', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      using page = document.getPage(0);

      const offsetX = 100;
      const offsetY = 50;
      const context: CoordinateTransformContext = {
        startX: offsetX,
        startY: offsetY,
        sizeX: A4_WIDTH,
        sizeY: A4_HEIGHT,
        rotate: PageRotation.None,
      };

      // Page top-left (0, height)
      const result = page.pageToDevice(context, 0, A4_HEIGHT);

      // Should map to device origin plus offset
      expect(result.x).toBe(offsetX);
      expect(result.y).toBe(offsetY);
    });
  });

  describe('round-trip conversion', () => {
    test('should return to original device coordinates after round-trip', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      using page = document.getPage(0);

      const context: CoordinateTransformContext = {
        startX: 0,
        startY: 0,
        sizeX: A4_WIDTH,
        sizeY: A4_HEIGHT,
        rotate: PageRotation.None,
      };

      const deviceX = 100;
      const deviceY = 200;

      // Device -> Page -> Device
      const pageCoord = page.deviceToPage(context, deviceX, deviceY);
      const backToDevice = page.pageToDevice(context, pageCoord.x, pageCoord.y);

      expect(backToDevice.x).toBeCloseTo(deviceX, 0);
      expect(backToDevice.y).toBeCloseTo(deviceY, 0);
    });

    test('should return to original page coordinates after round-trip', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      using page = document.getPage(0);

      const context: CoordinateTransformContext = {
        startX: 0,
        startY: 0,
        sizeX: A4_WIDTH,
        sizeY: A4_HEIGHT,
        rotate: PageRotation.None,
      };

      const pageX = 150;
      const pageY = 400;

      // Page -> Device -> Page
      // Note: Device coordinates are integers, so round-trip has precision loss
      const deviceCoord = page.pageToDevice(context, pageX, pageY);
      const backToPage = page.deviceToPage(context, deviceCoord.x, deviceCoord.y);

      // Allow up to 1 point difference due to integer rounding in device coords
      expect(Math.abs(backToPage.x - pageX)).toBeLessThanOrEqual(1);
      expect(Math.abs(backToPage.y - pageY)).toBeLessThanOrEqual(1);
    });
  });
});
