/**
 * Integration tests for editor-oriented save/reload fidelity.
 *
 * Verifies that key annotation types used by the editor round-trip
 * through `save()` + reopen with geometry/style metadata intact.
 */

import { AnnotationType } from '../../src/core/types.js';
import { LINE_FALLBACK_MARKER_KEY, LINE_FALLBACK_MARKER_VALUE } from '../../src/internal/annotation-markers.js';
import { REDACTION_FALLBACK_CONTENTS_MARKER } from '../../src/internal/redaction-markers.js';
import { describe, expect, test } from '../utils/fixtures.js';

const SQUARE_CONTENTS = 'editor-fidelity-square';
const CIRCLE_CONTENTS = 'editor-fidelity-circle';
const LINE_CONTENTS = 'editor-fidelity-line-fallback';
const REDACT_CONTENTS = 'editor-fidelity-redact';
const MARKUP_QUAD_A = {
  x1: 88,
  y1: 676,
  x2: 236,
  y2: 676,
  x3: 88,
  y3: 656,
  x4: 236,
  y4: 656,
} as const;
const MARKUP_QUAD_B = {
  x1: 88,
  y1: 640,
  x2: 264,
  y2: 640,
  x3: 88,
  y3: 620,
  x4: 264,
  y4: 620,
} as const;
const MARKUP_BOUNDS = { left: 88, top: 676, right: 264, bottom: 620 } as const;
const MARKUP_SCENARIOS = [
  {
    type: AnnotationType.Highlight,
    contents: 'editor-fidelity-highlight',
    stroke: { r: 234, g: 179, b: 8, a: 128 },
  },
  {
    type: AnnotationType.Underline,
    contents: 'editor-fidelity-underline',
    stroke: { r: 37, g: 99, b: 235, a: 255 },
  },
  {
    type: AnnotationType.Strikeout,
    contents: 'editor-fidelity-strikeout',
    stroke: { r: 220, g: 38, b: 38, a: 255 },
  },
] as const;

function rectEquals(
  a: { left: number; top: number; right: number; bottom: number } | null,
  b: { left: number; top: number; right: number; bottom: number },
): boolean {
  if (a === null) return false;
  return (
    Math.abs(a.left - b.left) < 0.001 &&
    Math.abs(a.top - b.top) < 0.001 &&
    Math.abs(a.right - b.right) < 0.001 &&
    Math.abs(a.bottom - b.bottom) < 0.001
  );
}

function expandRectByHalfStroke(
  rect: { left: number; top: number; right: number; bottom: number },
  strokeWidth: number,
): { left: number; top: number; right: number; bottom: number } {
  const halfStroke = strokeWidth / 2;
  return {
    left: rect.left - halfStroke,
    top: rect.top + halfStroke,
    right: rect.right + halfStroke,
    bottom: rect.bottom - halfStroke,
  };
}

function quadEquals(
  a: {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    x3: number;
    y3: number;
    x4: number;
    y4: number;
  } | null,
  b: {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    x3: number;
    y3: number;
    x4: number;
    y4: number;
  },
): boolean {
  if (a === null) return false;
  return (
    Math.abs(a.x1 - b.x1) < 0.001 &&
    Math.abs(a.y1 - b.y1) < 0.001 &&
    Math.abs(a.x2 - b.x2) < 0.001 &&
    Math.abs(a.y2 - b.y2) < 0.001 &&
    Math.abs(a.x3 - b.x3) < 0.001 &&
    Math.abs(a.y3 - b.y3) < 0.001 &&
    Math.abs(a.x4 - b.x4) < 0.001 &&
    Math.abs(a.y4 - b.y4) < 0.001
  );
}

describe('Editor save/reload fidelity', () => {
  test('persists rectangle geometry, stroke, fill, and border width', async ({ pdfium, openDocument }) => {
    using source = await openDocument('test_1.pdf');
    using page = source.getPage(0);

    using square = page.createAnnotation(AnnotationType.Square);
    expect(square).not.toBeNull();

    const bounds = { left: 42, top: 710, right: 220, bottom: 560 };
    const stroke = { r: 34, g: 136, b: 51, a: 153 };
    const fill = { r: 17, g: 68, b: 170, a: 153 };

    expect(square!.setRect(bounds)).toBe(true);
    expect(square!.setBorder({ horizontalRadius: 0, verticalRadius: 0, borderWidth: 4 })).toBe(true);
    expect(square!.setColour(stroke, 'stroke')).toBe(true);
    expect(square!.setColour(fill, 'interior')).toBe(true);
    expect(square!.setStringValue('Contents', SQUARE_CONTENTS)).toBe(true);
    expect(page.generateContent()).toBe(true);

    const bytes = source.save();
    using reopened = await pdfium.openDocument(bytes);
    using reopenedPage = reopened.getPage(0);
    const annotations = reopenedPage.getAnnotations();
    try {
      const persisted = annotations.find((annotation) => annotation.contents === SQUARE_CONTENTS);
      expect(persisted).toBeDefined();
      expect(persisted?.type).toBe(AnnotationType.Square);
      expect(persisted?.getRect()).toEqual(bounds);
      expect(persisted?.getColour('stroke')).toEqual(stroke);
      expect(persisted?.getColour('interior')).toEqual(fill);
      const border = persisted?.getBorder();
      expect(border).not.toBeNull();
      expect(border?.borderWidth).toBeCloseTo(4, 3);
    } finally {
      for (const annotation of annotations) {
        annotation.dispose();
      }
    }
  });

  test('persists circle geometry, stroke, fill, and border width', async ({ pdfium, openDocument }) => {
    using source = await openDocument('test_1.pdf');
    using page = source.getPage(0);

    using circle = page.createAnnotation(AnnotationType.Circle);
    expect(circle).not.toBeNull();

    const bounds = { left: 84, top: 680, right: 244, bottom: 520 };
    const stroke = { r: 201, g: 85, b: 12, a: 160 };
    const fill = { r: 14, g: 116, b: 144, a: 160 };

    expect(circle!.setRect(bounds)).toBe(true);
    expect(circle!.setBorder({ horizontalRadius: 0, verticalRadius: 0, borderWidth: 3.5 })).toBe(true);
    expect(circle!.setColour(stroke, 'stroke')).toBe(true);
    expect(circle!.setColour(fill, 'interior')).toBe(true);
    expect(circle!.setStringValue('Contents', CIRCLE_CONTENTS)).toBe(true);
    expect(page.generateContent()).toBe(true);

    const bytes = source.save();
    using reopened = await pdfium.openDocument(bytes);
    using reopenedPage = reopened.getPage(0);
    const annotations = reopenedPage.getAnnotations();
    try {
      const persisted = annotations.find((annotation) => annotation.contents === CIRCLE_CONTENTS);
      expect(persisted).toBeDefined();
      expect(persisted?.type).toBe(AnnotationType.Circle);
      expect(persisted?.getRect()).toEqual(bounds);
      expect(persisted?.getColour('stroke')).toEqual(stroke);
      expect(persisted?.getColour('interior')).toEqual(fill);
      const border = persisted?.getBorder();
      expect(border).not.toBeNull();
      expect(border?.borderWidth).toBeCloseTo(3.5, 3);
    } finally {
      for (const annotation of annotations) {
        annotation.dispose();
      }
    }
  });

  test('persists line-fallback ink marker, points, and width', async ({ pdfium, openDocument }) => {
    using source = await openDocument('test_1.pdf');
    using page = source.getPage(0);

    using lineFallback = page.createAnnotation(AnnotationType.Ink);
    expect(lineFallback).not.toBeNull();

    const bounds = { left: 80, top: 640, right: 300, bottom: 520 };
    const stroke = { r: 18, g: 52, b: 86, a: 128 };
    const strokeWidth = 2.5;
    const points = [
      { x: 90, y: 620 },
      { x: 290, y: 540 },
    ] as const;

    expect(lineFallback!.setRect(bounds)).toBe(true);
    expect(lineFallback!.addInkStroke(points)).toBeGreaterThanOrEqual(0);
    expect(lineFallback!.setBorder({ horizontalRadius: 0, verticalRadius: 0, borderWidth: strokeWidth })).toBe(true);
    expect(lineFallback!.setColour(stroke, 'stroke')).toBe(true);
    expect(lineFallback!.setStringValue(LINE_FALLBACK_MARKER_KEY, LINE_FALLBACK_MARKER_VALUE)).toBe(true);
    expect(lineFallback!.setStringValue('Contents', LINE_CONTENTS)).toBe(true);
    expect(page.generateContent()).toBe(true);

    const bytes = source.save();
    using reopened = await pdfium.openDocument(bytes);
    using reopenedPage = reopened.getPage(0);
    const annotations = reopenedPage.getAnnotations();
    try {
      const persisted = annotations.find((annotation) => annotation.contents === LINE_CONTENTS);
      expect(persisted).toBeDefined();
      expect(persisted?.type).toBe(AnnotationType.Ink);
      expect(rectEquals(persisted?.getRect() ?? null, expandRectByHalfStroke(bounds, strokeWidth))).toBe(true);
      expect(persisted?.getStringValue(LINE_FALLBACK_MARKER_KEY)).toBe(LINE_FALLBACK_MARKER_VALUE);
      expect(persisted?.getColour('stroke')).toEqual(stroke);
      const border = persisted?.getBorder();
      expect(border).not.toBeNull();
      expect(border?.borderWidth).toBeCloseTo(strokeWidth, 3);
      expect(persisted?.inkPathCount).toBeGreaterThanOrEqual(1);
      expect(persisted?.getInkPath(0)).toEqual(points);
    } finally {
      for (const annotation of annotations) {
        annotation.dispose();
      }
    }
  });

  for (const scenario of MARKUP_SCENARIOS) {
    test(`persists ${scenario.type} quad points and stroke colour`, async ({ pdfium, openDocument }) => {
      using source = await openDocument('test_1.pdf');
      using page = source.getPage(0);

      using markup = page.createAnnotation(scenario.type);
      expect(markup).not.toBeNull();
      if (!markup) {
        return;
      }

      expect(markup.setRect(MARKUP_BOUNDS)).toBe(true);
      expect(markup.appendAttachmentPoints(MARKUP_QUAD_A)).toBe(true);
      expect(markup.appendAttachmentPoints(MARKUP_QUAD_B)).toBe(true);
      expect(markup.setColour(scenario.stroke, 'stroke')).toBe(true);
      expect(markup.setStringValue('Contents', scenario.contents)).toBe(true);
      expect(page.generateContent()).toBe(true);

      const bytes = source.save();
      using reopened = await pdfium.openDocument(bytes);
      using reopenedPage = reopened.getPage(0);
      const annotations = reopenedPage.getAnnotations();
      try {
        const persisted = annotations.find((annotation) => annotation.contents === scenario.contents);
        expect(persisted).toBeDefined();
        expect(persisted?.type).toBe(scenario.type);
        expect(persisted?.getRect()).toEqual(MARKUP_BOUNDS);
        expect(persisted?.attachmentPointCount).toBe(2);
        expect(quadEquals(persisted?.getAttachmentPoints(0) ?? null, MARKUP_QUAD_A)).toBe(true);
        expect(quadEquals(persisted?.getAttachmentPoints(1) ?? null, MARKUP_QUAD_B)).toBe(true);
        expect(persisted?.getColour(scenario.type === AnnotationType.Highlight ? 'interior' : 'stroke')).toEqual(
          scenario.stroke,
        );
      } finally {
        for (const annotation of annotations) {
          annotation.dispose();
        }
      }
    });
  }

  test('persists editor redaction annotation bounds (native or fallback)', async ({ pdfium, openDocument }) => {
    using source = await openDocument('test_1.pdf');
    using page = source.getPage(0);

    using nativeRedact = page.createAnnotation(AnnotationType.Redact);
    using fallbackRedact = nativeRedact === null ? page.createAnnotation(AnnotationType.Square) : null;
    const redact = nativeRedact ?? fallbackRedact;
    expect(redact).not.toBeNull();

    const bounds = { left: 130, top: 500, right: 320, bottom: 420 };
    const fill = { r: 0, g: 0, b: 0, a: 255 };
    const redactContents = nativeRedact !== null ? REDACT_CONTENTS : REDACTION_FALLBACK_CONTENTS_MARKER;

    expect(redact!.setRect(bounds)).toBe(true);
    expect(redact!.setColour(fill, 'interior')).toBe(true);
    expect(redact!.setStringValue('Contents', redactContents)).toBe(true);
    expect(page.generateContent()).toBe(true);

    const bytes = source.save();
    using reopened = await pdfium.openDocument(bytes);
    using reopenedPage = reopened.getPage(0);
    const annotations = reopenedPage.getAnnotations();
    try {
      const persisted = annotations.find(
        (annotation) =>
          rectEquals(annotation.getRect(), bounds) &&
          (annotation.type === AnnotationType.Redact ||
            (annotation.type === AnnotationType.Square && annotation.contents === REDACTION_FALLBACK_CONTENTS_MARKER)),
      );
      expect(persisted).toBeDefined();
      expect(persisted?.getRect()).toEqual(bounds);
    } finally {
      for (const annotation of annotations) {
        annotation.dispose();
      }
    }
  });
});
