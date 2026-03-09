import type { SerialisedAnnotation } from '../../../context/protocol.js';
import { AnnotationType } from '../../../core/types.js';
import { getLineLikeEndpoints, isLineLikeAnnotation } from '../line-utils.js';
import { resolveTextMarkupSelectionKind } from './editor-overlay-text-markup-kind.js';

export function buildMarkupSelectionAppearance(annotation: SerialisedAnnotation, strokeWidth: number) {
  if (
    (annotation.type === AnnotationType.Highlight ||
      annotation.type === AnnotationType.Underline ||
      annotation.type === AnnotationType.Strikeout ||
      annotation.type === AnnotationType.Squiggly) &&
    (annotation.attachmentPoints?.length ?? 0) > 0
  ) {
    return {
      kind: 'text-markup' as const,
      markupType: resolveTextMarkupSelectionKind(annotation.type),
      quads: annotation.attachmentPoints ?? [],
      strokeWidth,
    };
  }
  return null;
}

export function buildShapeSelectionAppearance(annotation: SerialisedAnnotation, strokeWidth: number) {
  if (annotation.type === AnnotationType.Square) {
    return {
      kind: 'rectangle' as const,
      strokeWidth,
      ...(annotation.colour.stroke !== undefined ? { strokeColour: annotation.colour.stroke } : {}),
      fillColour: annotation.colour.interior ?? null,
    };
  }
  if (annotation.type === AnnotationType.Circle) {
    return {
      kind: 'ellipse' as const,
      strokeWidth,
      ...(annotation.colour.stroke !== undefined ? { strokeColour: annotation.colour.stroke } : {}),
      fillColour: annotation.colour.interior ?? null,
    };
  }
  return null;
}

export function buildLineSelectionAppearance(annotation: SerialisedAnnotation, strokeWidth: number) {
  if (!isLineLikeAnnotation(annotation)) {
    return null;
  }
  const endpoints = getLineLikeEndpoints(annotation);
  if (endpoints === undefined) {
    return null;
  }
  return {
    kind: 'line' as const,
    endpoints,
    strokeWidth,
    ...(annotation.colour.stroke !== undefined ? { strokeColour: annotation.colour.stroke } : {}),
  };
}
