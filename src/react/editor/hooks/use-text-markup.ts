/**
 * Text markup hook.
 *
 * Converts text selection rectangles to quad points for creating
 * Highlight, Underline, and StrikeOut annotations.
 *
 * @module react/editor/hooks/use-text-markup
 */

import { useCallback } from 'react';
import type { AnnotationType, Colour, Rect } from '../../../core/types.js';
import { buildTextMarkupCreationRequest } from './text-markup-support.js';
import type { AnnotationCrudActions } from './use-annotation-crud.js';

type TextMarkupSubtype = AnnotationType.Highlight | AnnotationType.Underline | AnnotationType.Strikeout;

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
      const request = buildTextMarkupCreationRequest(rects, boundingRect, colour);
      if (request === null) return undefined;
      return crud.createAnnotation(subtype, request.bounds, request.options);
    },
    [crud],
  );

  return { createMarkup };
}
