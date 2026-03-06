/**
 * Integration tests for end-to-end annotation CRUD operations.
 *
 * Tests create, read, update, and remove annotation lifecycle
 * using the real WASM module.
 */

import { AnnotationType } from '../../src/core/types.js';
import { describe, expect, test } from '../utils/fixtures.js';

describe('Annotation CRUD lifecycle', () => {
  test('create + read annotation', async ({ testPage }) => {
    const initialCount = testPage.annotationCount;

    using annot = testPage.createAnnotation(AnnotationType.Text);
    expect(annot).not.toBeNull();

    const newCount = testPage.annotationCount;
    expect(newCount).toBe(initialCount + 1);
  });

  test('create annotation with rect', async ({ testPage }) => {
    using annot = testPage.createAnnotation(AnnotationType.Square);
    expect(annot).not.toBeNull();

    annot!.setRect({ left: 10, top: 100, right: 200, bottom: 50 });
    const rect = annot!.getRect();
    expect(rect).not.toBeNull();
    expect(rect!.left).toBeCloseTo(10, 0);
    expect(rect!.right).toBeCloseTo(200, 0);
  });

  test('create + update colour', async ({ testPage }) => {
    using annot = testPage.createAnnotation(AnnotationType.Square);
    expect(annot).not.toBeNull();

    const result = annot!.setColour({ r: 255, g: 0, b: 0, a: 255 }, 'stroke');
    expect(result).toBe(true);
  });

  test('create + update string value', async ({ testPage }) => {
    using annot = testPage.createAnnotation(AnnotationType.Text);
    expect(annot).not.toBeNull();

    const result = annot!.setStringValue('Contents', 'Test note');
    expect(result).toBe(true);

    expect(annot!.contents).toBe('Test note');
  });

  test('create + remove annotation', async ({ testPage }) => {
    const initialCount = testPage.annotationCount;

    using _annot = testPage.createAnnotation(AnnotationType.Text);
    expect(testPage.annotationCount).toBe(initialCount + 1);

    testPage.removeAnnotation(initialCount);
    expect(testPage.annotationCount).toBe(initialCount);
  });

  test('create highlight with attachment points', async ({ testPage }) => {
    using annot = testPage.createAnnotation(AnnotationType.Highlight);
    if (!annot) return; // Highlight may not be supported in all builds

    annot.setRect({ left: 10, top: 100, right: 200, bottom: 80 });

    const quadResult = annot.appendAttachmentPoints({
      x1: 10,
      y1: 100,
      x2: 200,
      y2: 100,
      x3: 10,
      y3: 80,
      x4: 200,
      y4: 80,
    });
    expect(quadResult).toBe(true);
  });

  test('create ink annotation with stroke', async ({ testPage }) => {
    using annot = testPage.createAnnotation(AnnotationType.Ink);
    expect(annot).not.toBeNull();

    annot!.setRect({ left: 10, top: 100, right: 200, bottom: 50 });

    const points = [
      { x: 20, y: 90 },
      { x: 50, y: 70 },
      { x: 100, y: 80 },
    ];
    const strokeIndex = annot!.addInkStroke(points);
    expect(strokeIndex).toBeGreaterThanOrEqual(0);
  });

  test('generateContent after mutations', async ({ testPage }) => {
    using annot = testPage.createAnnotation(AnnotationType.Square);
    expect(annot).not.toBeNull();

    annot!.setRect({ left: 10, top: 100, right: 200, bottom: 50 });
    annot!.setColour({ r: 0, g: 0, b: 255, a: 255 }, 'stroke');

    const result = testPage.generateContent();
    expect(result).toBe(true);
  });
});
