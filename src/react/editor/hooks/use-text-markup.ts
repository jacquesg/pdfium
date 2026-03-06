/**
 * Text markup hook.
 *
 * Converts text selection rectangles to quad points for creating
 * Highlight, Underline, and StrikeOut annotations.
 *
 * @module react/editor/hooks/use-text-markup
 */

import { useCallback } from 'react';
import type { SerialisedQuadPoints } from '../../../context/protocol.js';
import type { AnnotationType, Colour, Rect } from '../../../core/types.js';
import type { AnnotationCrudActions } from './use-annotation-crud.js';

type TextMarkupSubtype = AnnotationType.Highlight | AnnotationType.Underline | AnnotationType.Strikeout;

function normaliseRect(rect: Rect): Rect {
  return {
    left: Math.min(rect.left, rect.right),
    top: Math.max(rect.top, rect.bottom),
    right: Math.max(rect.left, rect.right),
    bottom: Math.min(rect.top, rect.bottom),
  };
}

function rectToQuadPoints(rect: Rect): SerialisedQuadPoints {
  const normalised = normaliseRect(rect);
  return {
    // QuadPoints contract: bottom-left, bottom-right, top-left, top-right.
    x1: normalised.left,
    y1: normalised.bottom,
    x2: normalised.right,
    y2: normalised.bottom,
    x3: normalised.left,
    y3: normalised.top,
    x4: normalised.right,
    y4: normalised.top,
  };
}

/**
 * Return type of `useTextMarkup`.
 */
export interface TextMarkupActions {
  /** Create a text markup annotation from selection rectangles. */
  createMarkup(
    subtype: TextMarkupSubtype,
    rects: readonly Rect[],
    boundingRect: Rect,
    colour?: Colour,
  ): Promise<number | undefined>;
}

/**
 * Converts text selection rectangles to quad points and creates
 * text markup annotations (Highlight, Underline, StrikeOut).
 *
 * Must be called within an `EditorProvider`.
 */
export function useTextMarkup(crud: AnnotationCrudActions): TextMarkupActions {
  const createMarkup = useCallback(
    async (
      subtype: TextMarkupSubtype,
      rects: readonly Rect[],
      boundingRect: Rect,
      colour?: Colour,
    ): Promise<number | undefined> => {
      if (rects.length === 0) return undefined;

      const quadPoints: SerialisedQuadPoints[] = rects.map(rectToQuadPoints);
      const normalisedBoundingRect = normaliseRect(boundingRect);

      return crud.createAnnotation(subtype, normalisedBoundingRect, colour ? { quadPoints, colour } : { quadPoints });
    },
    [crud],
  );

  return { createMarkup };
}
