import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AnnotationType } from '../../../../../src/core/types.js';
import type { AnnotationCrudActions } from '../../../../../src/react/editor/hooks/use-annotation-crud.js';
import { useTextMarkup } from '../../../../../src/react/editor/hooks/use-text-markup.js';

function createMockCrud(): AnnotationCrudActions {
  return {
    createAnnotation: vi.fn().mockResolvedValue(0),
    removeAnnotation: vi.fn().mockResolvedValue(undefined),
    moveAnnotation: vi.fn().mockResolvedValue(undefined),
    resizeAnnotation: vi.fn().mockResolvedValue(undefined),
    setAnnotationColour: vi.fn().mockResolvedValue(undefined),
    setAnnotationBorder: vi.fn().mockResolvedValue(undefined),
    setAnnotationString: vi.fn().mockResolvedValue(undefined),
    replaceLineFallback: vi.fn().mockResolvedValue(undefined),
  };
}

describe('useTextMarkup', () => {
  it('returns undefined for empty rects', async () => {
    const crud = createMockCrud();
    const { result } = renderHook(() => useTextMarkup(crud));

    let returnValue: number | undefined;
    await act(async () => {
      returnValue = await result.current.createMarkup(AnnotationType.Highlight, [], {
        left: 0,
        top: 0,
        right: 100,
        bottom: 100,
      });
    });

    expect(returnValue).toBeUndefined();
    expect(crud.createAnnotation).not.toHaveBeenCalled();
  });

  it('converts rects to quad points and calls createAnnotation', async () => {
    const crud = createMockCrud();
    const { result } = renderHook(() => useTextMarkup(crud));

    const rects = [{ left: 10, top: 40, right: 110, bottom: 20 }];
    const boundingRect = { left: 10, top: 40, right: 110, bottom: 20 };

    let returnValue: number | undefined;
    await act(async () => {
      returnValue = await result.current.createMarkup(AnnotationType.Highlight, rects, boundingRect);
    });

    expect(crud.createAnnotation).toHaveBeenCalledWith(AnnotationType.Highlight, boundingRect, {
      quadPoints: [{ x1: 10, y1: 20, x2: 110, y2: 20, x3: 10, y3: 40, x4: 110, y4: 40 }],
    });
    expect(returnValue).toBe(0);
  });

  it('normalises rect orientation for quad points and bounding rect', async () => {
    const crud = createMockCrud();
    const { result } = renderHook(() => useTextMarkup(crud));

    // Inverted values (left > right, top < bottom) should be corrected.
    const rects = [{ left: 110, top: 20, right: 10, bottom: 40 }];
    const boundingRect = { left: 110, top: 20, right: 10, bottom: 40 };

    await act(async () => {
      await result.current.createMarkup(AnnotationType.Underline, rects, boundingRect);
    });

    expect(crud.createAnnotation).toHaveBeenCalledWith(
      AnnotationType.Underline,
      {
        left: 10,
        top: 40,
        right: 110,
        bottom: 20,
      },
      {
        quadPoints: [{ x1: 10, y1: 20, x2: 110, y2: 20, x3: 10, y3: 40, x4: 110, y4: 40 }],
      },
    );
  });
});
