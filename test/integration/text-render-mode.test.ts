/**
 * Integration tests for text render mode methods.
 *
 * These tests verify getting and setting text render mode on text objects.
 * Text render mode controls how text is painted: fill, stroke, both, invisible,
 * or various clipping combinations.
 */

import { TextRenderMode } from '../../src/core/types.js';
import type { PDFiumPage } from '../../src/document/page.js';
import { PDFiumTextObject } from '../../src/document/page-object.js';
import { describe, expect, test } from '../utils/fixtures.js';

function getFirstTextObj(page: PDFiumPage): PDFiumTextObject | undefined {
  const objects = page.getObjects();
  return objects.find((o): o is PDFiumTextObject => o instanceof PDFiumTextObject);
}

describe('Text Render Mode', () => {
  describe('TextRenderMode enum values', () => {
    test('should have correct values per PDF specification', () => {
      expect(TextRenderMode.Fill).toBe('Fill');
      expect(TextRenderMode.Stroke).toBe('Stroke');
      expect(TextRenderMode.FillStroke).toBe('FillStroke');
      expect(TextRenderMode.Invisible).toBe('Invisible');
      expect(TextRenderMode.FillClip).toBe('FillClip');
      expect(TextRenderMode.StrokeClip).toBe('StrokeClip');
      expect(TextRenderMode.FillStrokeClip).toBe('FillStrokeClip');
      expect(TextRenderMode.Clip).toBe('Clip');
    });
  });

  describe('textObjGetRenderMode', () => {
    test('should return render mode for text objects', async ({ testPage }) => {
      const textObj = getFirstTextObj(testPage);
      if (textObj === undefined) return;

      const mode = textObj.renderMode;

      // Should return a valid mode or null
      if (mode !== null) {
        expect(Object.values(TextRenderMode)).toContain(mode);
      }
    });

    test('should return Fill mode (0) for most standard text', async ({ testPage }) => {
      const textObj = getFirstTextObj(testPage);
      if (textObj === undefined) return;

      const mode = textObj.renderMode;

      // Most PDF text uses Fill mode by default
      if (mode !== null) {
        expect(mode).toBe(TextRenderMode.Fill);
      }
    });

    test('should work with all text objects on page', async ({ testPage }) => {
      const objects = testPage.getObjects();
      const textObjects = objects.filter((o): o is PDFiumTextObject => o instanceof PDFiumTextObject);

      expect(textObjects.length).toBeGreaterThan(0);

      for (const textObj of textObjects) {
        const mode = textObj.renderMode;

        if (mode !== null) {
          expect(Object.values(TextRenderMode)).toContain(mode);
        }
      }
    });
  });

  describe('textObjSetRenderMode', () => {
    test('should set render mode on text objects', async ({ testPage }) => {
      const textObj = getFirstTextObj(testPage);
      if (textObj === undefined) return;

      // Get original mode
      const originalMode = textObj.renderMode;

      // Try to set a different mode
      const success = textObj.setRenderMode(TextRenderMode.Stroke);

      if (success) {
        const newMode = textObj.renderMode;
        expect(newMode).toBe(TextRenderMode.Stroke);

        // Restore original mode
        if (originalMode !== null) {
          textObj.setRenderMode(originalMode);
        }
      }
    });

    test('should accept all valid render mode values', async ({ testPage }) => {
      const textObj = getFirstTextObj(testPage);
      if (textObj === undefined) return;

      const originalMode = textObj.renderMode;
      const modes = [
        TextRenderMode.Fill,
        TextRenderMode.Stroke,
        TextRenderMode.FillStroke,
        TextRenderMode.Invisible,
        TextRenderMode.FillClip,
        TextRenderMode.StrokeClip,
        TextRenderMode.FillStrokeClip,
        TextRenderMode.Clip,
      ];

      for (const mode of modes) {
        const success = textObj.setRenderMode(mode);
        // Method should not throw, regardless of success
        expect(success).toBeTypeOf('boolean');
      }

      // Restore original mode
      if (originalMode !== null) {
        textObj.setRenderMode(originalMode);
      }
    });

    test('should return boolean indicating success', async ({ testPage }) => {
      const textObj = getFirstTextObj(testPage);
      if (textObj === undefined) return;

      const result = textObj.setRenderMode(TextRenderMode.Fill);
      expect(result).toBeTypeOf('boolean');
    });
  });
});

describe('Text Render Mode with different documents', () => {
  test('should work with form document', async ({ openDocument }) => {
    const doc = await openDocument('test_6_with_form.pdf');
    using page = doc.getPage(0);

    const objects = page.getObjects();
    const textObjects = objects.filter((o): o is PDFiumTextObject => o instanceof PDFiumTextObject);

    for (const textObj of textObjects) {
      const mode = textObj.renderMode;
      if (mode !== null) {
        expect(Object.values(TextRenderMode)).toContain(mode);
      }
    }
  });

  test('should work with images document', async ({ openDocument }) => {
    const doc = await openDocument('test_3_with_images.pdf');
    using page = doc.getPage(0);

    const objects = page.getObjects();
    const textObjects = objects.filter((o): o is PDFiumTextObject => o instanceof PDFiumTextObject);

    for (const textObj of textObjects) {
      const mode = textObj.renderMode;
      if (mode !== null) {
        expect(Object.values(TextRenderMode)).toContain(mode);
      }
    }
  });
});

describe('Text Render Mode post-dispose guards', () => {
  test('should throw on renderMode after dispose', async ({ openDocument }) => {
    const doc = await openDocument('test_1.pdf');
    using page = doc.getPage(0);
    const objects = page.getObjects();
    const textObj = objects.find((o): o is PDFiumTextObject => o instanceof PDFiumTextObject);

    page.dispose();

    if (textObj) {
      expect(() => textObj.renderMode).toThrow();
    }
  });

  test('should throw on setRenderMode after dispose', async ({ openDocument }) => {
    const doc = await openDocument('test_1.pdf');
    using page = doc.getPage(0);
    const objects = page.getObjects();
    const textObj = objects.find((o): o is PDFiumTextObject => o instanceof PDFiumTextObject);

    page.dispose();

    if (textObj) {
      expect(() => textObj.setRenderMode(TextRenderMode.Fill)).toThrow();
    }
  });
});
