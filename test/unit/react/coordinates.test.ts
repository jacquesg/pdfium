import { describe, expect, it } from 'vitest';
import { pdfRectToScreen, pdfToScreen, screenToPdf } from '../../../src/react/coordinates.js';

describe('coordinates', () => {
  describe('pdfToScreen', () => {
    it('converts PDF origin (bottom-left) to screen origin (top-left) at scale 1', () => {
      const result = pdfToScreen({ x: 100, y: 700 }, { scale: 1, originalHeight: 792 });

      expect(result.x).toBe(100);
      expect(result.y).toBe(92); // (792 - 700) * 1
    });

    it('applies scale factor to coordinates', () => {
      const result = pdfToScreen({ x: 50, y: 400 }, { scale: 2, originalHeight: 792 });

      expect(result.x).toBe(100); // 50 * 2
      expect(result.y).toBe(784); // (792 - 400) * 2
    });

    it('handles zero coordinates', () => {
      const result = pdfToScreen({ x: 0, y: 0 }, { scale: 1, originalHeight: 792 });

      expect(result.x).toBe(0);
      expect(result.y).toBe(792); // bottom of page maps to bottom of screen
    });

    it('handles top-of-page PDF point', () => {
      const result = pdfToScreen({ x: 0, y: 792 }, { scale: 1, originalHeight: 792 });

      expect(result.x).toBe(0);
      expect(result.y).toBe(0); // top of PDF page maps to top of screen
    });
  });

  describe('screenToPdf', () => {
    it('converts screen origin (top-left) to PDF origin (bottom-left) at scale 1', () => {
      const result = screenToPdf({ x: 100, y: 92 }, { scale: 1, originalHeight: 792 });

      expect(result.x).toBe(100);
      expect(result.y).toBe(700); // 792 - 92
    });

    it('applies inverse scale factor', () => {
      const result = screenToPdf({ x: 100, y: 784 }, { scale: 2, originalHeight: 792 });

      expect(result.x).toBe(50); // 100 / 2
      expect(result.y).toBe(400); // 792 - 784/2
    });

    it('handles zero screen coordinates', () => {
      const result = screenToPdf({ x: 0, y: 0 }, { scale: 1, originalHeight: 792 });

      expect(result.x).toBe(0);
      expect(result.y).toBe(792); // top of screen maps to top of PDF (max y)
    });
  });

  describe('round-trip identity', () => {
    it('screenToPdf(pdfToScreen(point)) returns the original point', () => {
      const original = { x: 123.5, y: 456.7 };
      const params = { scale: 1.5, originalHeight: 792 };

      const screen = pdfToScreen(original, params);
      const roundTrip = screenToPdf(screen, params);

      expect(roundTrip.x).toBeCloseTo(original.x, 10);
      expect(roundTrip.y).toBeCloseTo(original.y, 10);
    });

    it('pdfToScreen(screenToPdf(point)) returns the original point', () => {
      const original = { x: 200, y: 300 };
      const params = { scale: 2.5, originalHeight: 1000 };

      const pdf = screenToPdf(original, params);
      const roundTrip = pdfToScreen(pdf, params);

      expect(roundTrip.x).toBeCloseTo(original.x, 10);
      expect(roundTrip.y).toBeCloseTo(original.y, 10);
    });
  });

  describe('pdfRectToScreen', () => {
    it('converts a PDF rect to a screen rect at scale 1', () => {
      const result = pdfRectToScreen(
        { left: 100, top: 700, right: 300, bottom: 600 },
        { scale: 1, originalHeight: 792 },
      );

      expect(result.x).toBe(100); // left * 1
      expect(result.y).toBe(92); // (792 - 700) * 1
      expect(result.width).toBe(200); // (300 - 100) * 1
      expect(result.height).toBe(100); // (700 - 600) * 1
    });

    it('applies scale factor to rect dimensions', () => {
      const result = pdfRectToScreen(
        { left: 50, top: 400, right: 150, bottom: 300 },
        { scale: 2, originalHeight: 792 },
      );

      expect(result.x).toBe(100); // 50 * 2
      expect(result.y).toBe(784); // (792 - 400) * 2
      expect(result.width).toBe(200); // (150 - 50) * 2
      expect(result.height).toBe(200); // (400 - 300) * 2
    });

    it('handles zero-area rect', () => {
      const result = pdfRectToScreen(
        { left: 100, top: 200, right: 100, bottom: 200 },
        { scale: 1, originalHeight: 792 },
      );

      expect(result.width).toBe(0);
      expect(result.height).toBe(0);
    });

    it('handles full-page rect', () => {
      const result = pdfRectToScreen({ left: 0, top: 792, right: 612, bottom: 0 }, { scale: 1, originalHeight: 792 });

      expect(result.x).toBe(0);
      expect(result.y).toBe(0);
      expect(result.width).toBe(612);
      expect(result.height).toBe(792);
    });
  });
});
