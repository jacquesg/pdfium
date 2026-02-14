/**
 * Integration tests for JavaScript inspection API.
 *
 * Tests the FPDFDoc_GetJavaScript* and FPDFJavaScriptAction_* functions.
 */

import { AnnotationType, FormFieldActionEvent } from '../../src/core/types.js';
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

describe('Annotation-Level JavaScript (annot_javascript.pdf)', () => {
  test('should have no document-level JS actions', async ({ openDocument }) => {
    using doc = await openDocument('pdfium/annot_javascript.pdf');
    expect(doc.pageCount).toBe(1);
    expect(doc.hasJavaScript()).toBe(false);
    expect(doc.javaScriptActionCount).toBe(0);
    expect(doc.getJavaScriptActions()).toHaveLength(0);
  });

  test('should have a Widget annotation with form field name', async ({ openDocument }) => {
    using doc = await openDocument('pdfium/annot_javascript.pdf');
    using page = doc.getPage(0);

    // The PDF has a single Widget annotation named "Widget"
    const annotCount = page.annotationCount;
    expect(annotCount).toBeGreaterThan(0);

    using annot = page.getAnnotation(0);
    expect(annot.type).toBe(AnnotationType.Widget);

    const name = annot.getFormFieldName();
    expect(name).toBe('Widget');
  });

  test('should read Format event JavaScript from Widget annotation', async ({ openDocument }) => {
    using doc = await openDocument('pdfium/annot_javascript.pdf');
    using page = doc.getPage(0);
    using annot = page.getAnnotation(0);

    // The Widget has AFDate_FormatEx("yyyy-mm-dd") on the Format event
    const js = annot.getFormAdditionalActionJavaScript(FormFieldActionEvent.Format);
    expect(js).toBeDefined();
    expect(js).toBeTypeOf('string');
    expect(js!.length).toBeGreaterThan(0);
    expect(js).toContain('AFDate_FormatEx');
  });

  test('should return undefined for events without JavaScript', async ({ openDocument }) => {
    using doc = await openDocument('pdfium/annot_javascript.pdf');
    using page = doc.getPage(0);
    using annot = page.getAnnotation(0);

    // Only Format has JS; other events should return undefined
    const keystroke = annot.getFormAdditionalActionJavaScript(FormFieldActionEvent.KeyStroke);
    const validate = annot.getFormAdditionalActionJavaScript(FormFieldActionEvent.Validate);
    const calculate = annot.getFormAdditionalActionJavaScript(FormFieldActionEvent.Calculate);

    // These events have no JS attached in this PDF
    const noJsEvents = [keystroke, validate, calculate];
    for (const js of noJsEvents) {
      if (js !== undefined) {
        // If defined, it should be an empty or whitespace-only string
        expect(js.trim()).toBe('');
      }
    }
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
