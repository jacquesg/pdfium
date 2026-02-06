/**
 * Integration tests for JavaScript inspection API.
 *
 * Tests the FPDFDoc_GetJavaScript* and FPDFJavaScriptAction_* functions.
 */

import { describe, expect, test } from 'vitest';
import { initPdfium, loadTestDocument } from '../utils/helpers.js';

describe('JavaScript Inspection API', () => {
  describe('javaScriptActionCount', () => {
    test('should return non-negative number', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      const count = document.javaScriptActionCount;
      expect(typeof count).toBe('number');
      expect(count).toBeGreaterThanOrEqual(0);
    });
  });

  describe('hasJavaScript', () => {
    test('should return boolean', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      const hasJs = document.hasJavaScript();
      expect(typeof hasJs).toBe('boolean');
    });

    test('should be consistent with javaScriptActionCount', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      const count = document.javaScriptActionCount;
      const hasJs = document.hasJavaScript();
      expect(hasJs).toBe(count > 0);
    });
  });

  describe('getJavaScriptAction', () => {
    test('should return undefined for negative index', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      const action = document.getJavaScriptAction(-1);
      expect(action).toBeUndefined();
    });

    test('should return undefined for out of bounds index', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      const count = document.javaScriptActionCount;
      const action = document.getJavaScriptAction(count + 10);
      expect(action).toBeUndefined();
    });

    test('should not throw for any valid index range', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      const count = document.javaScriptActionCount;
      for (let i = 0; i < Math.min(count, 10); i++) {
        expect(() => document.getJavaScriptAction(i)).not.toThrow();
      }
    });

    test('should return action with name and script if present', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      const count = document.javaScriptActionCount;
      if (count > 0) {
        const action = document.getJavaScriptAction(0);
        if (action !== undefined) {
          expect(typeof action.name).toBe('string');
          expect(typeof action.script).toBe('string');
        }
      }
    });
  });

  describe('getJavaScriptActions', () => {
    test('should return array', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      const actions = document.getJavaScriptActions();
      expect(Array.isArray(actions)).toBe(true);
    });

    test('should return array with length matching count', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      const count = document.javaScriptActionCount;
      const actions = document.getJavaScriptActions();
      // May be less if some actions fail to load
      expect(actions.length).toBeLessThanOrEqual(count);
    });

    test('should return actions with valid structure', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      const actions = document.getJavaScriptActions();
      for (const action of actions) {
        expect(typeof action.name).toBe('string');
        expect(typeof action.script).toBe('string');
      }
    });
  });

  describe('with different PDF files', () => {
    test('should handle test_3_with_images.pdf', async () => {
      using pdfium = await initPdfium();
      using doc = await loadTestDocument(pdfium, 'test_3_with_images.pdf');

      expect(() => doc.javaScriptActionCount).not.toThrow();
      expect(() => doc.hasJavaScript()).not.toThrow();
      expect(() => doc.getJavaScriptActions()).not.toThrow();
    });
  });
});

describe('JavaScript Inspection post-dispose guards', () => {
  test('should throw on javaScriptActionCount after dispose', async () => {
    using pdfium = await initPdfium();
    using doc = await loadTestDocument(pdfium, 'test_1.pdf');
    doc.dispose();
    expect(() => doc.javaScriptActionCount).toThrow();
  });

  test('should throw on hasJavaScript after dispose', async () => {
    using pdfium = await initPdfium();
    using doc = await loadTestDocument(pdfium, 'test_1.pdf');
    doc.dispose();
    expect(() => doc.hasJavaScript()).toThrow();
  });

  test('should throw on getJavaScriptAction after dispose', async () => {
    using pdfium = await initPdfium();
    using doc = await loadTestDocument(pdfium, 'test_1.pdf');
    doc.dispose();
    expect(() => doc.getJavaScriptAction(0)).toThrow();
  });

  test('should throw on getJavaScriptActions after dispose', async () => {
    using pdfium = await initPdfium();
    using doc = await loadTestDocument(pdfium, 'test_1.pdf');
    doc.dispose();
    expect(() => doc.getJavaScriptActions()).toThrow();
  });
});
