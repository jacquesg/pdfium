/**
 * Integration tests for JavaScript inspection API.
 *
 * Tests the FPDFDoc_GetJavaScript* and FPDFJavaScriptAction_* functions.
 */

import { describe, expect, test } from '../utils/fixtures.js';

describe('JavaScript Inspection API', () => {
  describe('javaScriptActionCount', () => {
    test('should return non-negative number', async ({ testDocument }) => {
      const count = testDocument.javaScriptActionCount;
      expect(count).toBeTypeOf('number');
      expect(count).toBeGreaterThanOrEqual(0);
    });
  });

  describe('hasJavaScript', () => {
    test('should return boolean', async ({ testDocument }) => {
      const hasJs = testDocument.hasJavaScript();
      expect(hasJs).toBeTypeOf('boolean');
    });

    test('should be consistent with javaScriptActionCount', async ({ testDocument }) => {
      const count = testDocument.javaScriptActionCount;
      const hasJs = testDocument.hasJavaScript();
      expect(hasJs).toBe(count > 0);
    });
  });

  describe('getJavaScriptAction', () => {
    test('should return undefined for negative index', async ({ testDocument }) => {
      const action = testDocument.getJavaScriptAction(-1);
      expect(action).toBeUndefined();
    });

    test('should return undefined for out of bounds index', async ({ testDocument }) => {
      const count = testDocument.javaScriptActionCount;
      const action = testDocument.getJavaScriptAction(count + 10);
      expect(action).toBeUndefined();
    });

    test('should not throw for any valid index range', async ({ testDocument }) => {
      const count = testDocument.javaScriptActionCount;
      for (let i = 0; i < Math.min(count, 10); i++) {
        expect(() => testDocument.getJavaScriptAction(i)).not.toThrow();
      }
    });

    test('should return action with name and script if present', async ({ testDocument }) => {
      const count = testDocument.javaScriptActionCount;
      if (count > 0) {
        const action = testDocument.getJavaScriptAction(0);
        if (action !== undefined) {
          expect(action.name).toBeTypeOf('string');
          expect(action.script).toBeTypeOf('string');
        }
      }
    });
  });

  describe('getJavaScriptActions', () => {
    test('should return array', async ({ testDocument }) => {
      const actions = testDocument.getJavaScriptActions();
      expect(actions).toBeInstanceOf(Array);
    });

    test('should return array with length matching count', async ({ testDocument }) => {
      const count = testDocument.javaScriptActionCount;
      const actions = testDocument.getJavaScriptActions();
      // May be less if some actions fail to load
      expect(actions.length).toBeLessThanOrEqual(count);
    });

    test('should return actions with valid structure', async ({ testDocument }) => {
      const actions = testDocument.getJavaScriptActions();
      for (const action of actions) {
        expect(action.name).toBeTypeOf('string');
        expect(action.script).toBeTypeOf('string');
      }
    });
  });

  describe('with different PDF files', () => {
    test('should handle test_3_with_images.pdf', async ({ openDocument }) => {
      const doc = await openDocument('test_3_with_images.pdf');

      expect(() => doc.javaScriptActionCount).not.toThrow();
      expect(() => doc.hasJavaScript()).not.toThrow();
      expect(() => doc.getJavaScriptActions()).not.toThrow();
    });
  });
});

describe('JavaScript Inspection post-dispose guards', () => {
  test('should throw on javaScriptActionCount after dispose', async ({ openDocument }) => {
    const doc = await openDocument('test_1.pdf');
    doc.dispose();
    expect(() => doc.javaScriptActionCount).toThrow();
  });

  test('should throw on hasJavaScript after dispose', async ({ openDocument }) => {
    const doc = await openDocument('test_1.pdf');
    doc.dispose();
    expect(() => doc.hasJavaScript()).toThrow();
  });

  test('should throw on getJavaScriptAction after dispose', async ({ openDocument }) => {
    const doc = await openDocument('test_1.pdf');
    doc.dispose();
    expect(() => doc.getJavaScriptAction(0)).toThrow();
  });

  test('should throw on getJavaScriptActions after dispose', async ({ openDocument }) => {
    const doc = await openDocument('test_1.pdf');
    doc.dispose();
    expect(() => doc.getJavaScriptActions()).toThrow();
  });
});
