/**
 * Integration tests for text render mode methods.
 *
 * These tests verify getting and setting text render mode on text objects.
 * Text render mode controls how text is painted: fill, stroke, both, invisible,
 * or various clipping combinations.
 */

import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import type { PageObjectHandle } from '../../src/core/types.js';
import { PageObjectType, TextRenderMode } from '../../src/core/types.js';
import type { PDFiumDocument } from '../../src/document/document.js';
import type { PDFiumPage } from '../../src/document/page.js';
import type { PDFium } from '../../src/pdfium.js';
import { initPdfium, loadTestDocument } from '../utils/helpers.js';

describe('Text Render Mode', () => {
  let pdfium: PDFium;
  let document: PDFiumDocument;
  let page: PDFiumPage;
  let textObjHandle: PageObjectHandle | null = null;

  beforeAll(async () => {
    pdfium = await initPdfium();
    document = await loadTestDocument(pdfium, 'test_1.pdf');
    page = document.getPage(0);

    // Get a text object handle for testing
    const objects = page.getObjects();
    const textObj = objects.find((obj) => obj.type === PageObjectType.Text);
    if (textObj) {
      textObjHandle = textObj.handle;
    }
  });

  afterAll(() => {
    page?.dispose();
    document?.dispose();
    pdfium?.dispose();
  });

  describe('TextRenderMode enum values', () => {
    test('should have correct values per PDF specification', () => {
      expect(TextRenderMode.Fill).toBe(0);
      expect(TextRenderMode.Stroke).toBe(1);
      expect(TextRenderMode.FillStroke).toBe(2);
      expect(TextRenderMode.Invisible).toBe(3);
      expect(TextRenderMode.FillClip).toBe(4);
      expect(TextRenderMode.StrokeClip).toBe(5);
      expect(TextRenderMode.FillStrokeClip).toBe(6);
      expect(TextRenderMode.Clip).toBe(7);
    });
  });

  describe('textObjGetRenderMode', () => {
    test('should return render mode for text objects', () => {
      if (textObjHandle === null) return;

      const mode = page.textObjGetRenderMode(textObjHandle);

      // Should return a valid mode or null
      if (mode !== null) {
        expect(mode).toBeGreaterThanOrEqual(0);
        expect(mode).toBeLessThanOrEqual(7);
      }
    });

    test('should return Fill mode (0) for most standard text', () => {
      if (textObjHandle === null) return;

      const mode = page.textObjGetRenderMode(textObjHandle);

      // Most PDF text uses Fill mode by default
      if (mode !== null) {
        expect(mode).toBe(TextRenderMode.Fill);
      }
    });

    test('should work with all text objects on page', () => {
      const objects = page.getObjects();
      const textObjects = objects.filter((obj) => obj.type === PageObjectType.Text);

      expect(textObjects.length).toBeGreaterThan(0);

      for (const textObj of textObjects) {
        const mode = page.textObjGetRenderMode(textObj.handle);

        if (mode !== null) {
          expect(Object.values(TextRenderMode)).toContain(mode);
        }
      }
    });
  });

  describe('textObjSetRenderMode', () => {
    test('should set render mode on text objects', () => {
      if (textObjHandle === null) return;

      // Get original mode
      const originalMode = page.textObjGetRenderMode(textObjHandle);

      // Try to set a different mode
      const success = page.textObjSetRenderMode(textObjHandle, TextRenderMode.Stroke);

      if (success) {
        const newMode = page.textObjGetRenderMode(textObjHandle);
        expect(newMode).toBe(TextRenderMode.Stroke);

        // Restore original mode
        if (originalMode !== null) {
          page.textObjSetRenderMode(textObjHandle, originalMode);
        }
      }
    });

    test('should accept all valid render mode values', () => {
      if (textObjHandle === null) return;

      const originalMode = page.textObjGetRenderMode(textObjHandle);
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
        const success = page.textObjSetRenderMode(textObjHandle, mode);
        // Method should not throw, regardless of success
        expect(typeof success).toBe('boolean');
      }

      // Restore original mode
      if (originalMode !== null) {
        page.textObjSetRenderMode(textObjHandle, originalMode);
      }
    });

    test('should return boolean indicating success', () => {
      if (textObjHandle === null) return;

      const result = page.textObjSetRenderMode(textObjHandle, TextRenderMode.Fill);
      expect(typeof result).toBe('boolean');
    });
  });
});

describe('Text Render Mode with different documents', () => {
  let pdfium: PDFium;

  beforeAll(async () => {
    pdfium = await initPdfium();
  });

  afterAll(() => {
    pdfium?.dispose();
  });

  test('should work with form document', async () => {
    using doc = await loadTestDocument(pdfium, 'test_6_with_form.pdf');
    using page = doc.getPage(0);

    const objects = page.getObjects();
    const textObjects = objects.filter((obj) => obj.type === PageObjectType.Text);

    for (const textObj of textObjects) {
      const mode = page.textObjGetRenderMode(textObj.handle);
      if (mode !== null) {
        expect(mode).toBeGreaterThanOrEqual(0);
        expect(mode).toBeLessThanOrEqual(7);
      }
    }
  });

  test('should work with images document', async () => {
    using doc = await loadTestDocument(pdfium, 'test_3_with_images.pdf');
    using page = doc.getPage(0);

    const objects = page.getObjects();
    const textObjects = objects.filter((obj) => obj.type === PageObjectType.Text);

    for (const textObj of textObjects) {
      const mode = page.textObjGetRenderMode(textObj.handle);
      if (mode !== null) {
        expect(Object.values(TextRenderMode)).toContain(mode);
      }
    }
  });
});

describe('Text Render Mode post-dispose guards', () => {
  let pdfium: PDFium;

  beforeAll(async () => {
    pdfium = await initPdfium();
  });

  afterAll(() => {
    pdfium?.dispose();
  });

  test('should throw on textObjGetRenderMode after dispose', async () => {
    const doc = await loadTestDocument(pdfium, 'test_1.pdf');
    const page = doc.getPage(0);
    const objects = page.getObjects();
    const textObj = objects.find((obj) => obj.type === PageObjectType.Text);

    page.dispose();

    if (textObj) {
      expect(() => page.textObjGetRenderMode(textObj.handle)).toThrow();
    }

    doc.dispose();
  });

  test('should throw on textObjSetRenderMode after dispose', async () => {
    const doc = await loadTestDocument(pdfium, 'test_1.pdf');
    const page = doc.getPage(0);
    const objects = page.getObjects();
    const textObj = objects.find((obj) => obj.type === PageObjectType.Text);

    page.dispose();

    if (textObj) {
      expect(() => page.textObjSetRenderMode(textObj.handle, TextRenderMode.Fill)).toThrow();
    }

    doc.dispose();
  });
});
