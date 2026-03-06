/**
 * Utilities for line-tool fallback annotations.
 *
 * @module react/editor/line-utils
 */

import type { SerialisedAnnotation } from '../../context/protocol.js';
import { AnnotationType, type Point } from '../../core/types.js';

/**
 * Resolved line endpoints used by editor UI.
 */
export interface SerialisedLineEndpoints {
  readonly start: Point;
  readonly end: Point;
}

function hasTwoPointInkPath(paths: SerialisedAnnotation['inkPaths']): paths is [Array<{ x: number; y: number }>] {
  return Array.isArray(paths) && paths.length === 1 && Array.isArray(paths[0]) && (paths[0]?.length ?? 0) === 2;
}

/**
 * Returns true when the annotation should be treated as a line in editor UI.
 *
 * True for:
 * - native `/Line` annotations
 * - Ink annotations explicitly marked as line-tool fallbacks
 */
export function isLineLikeAnnotation(
  annotation: Pick<SerialisedAnnotation, 'type' | 'lineFallback' | 'inkPaths'>,
): boolean {
  if (annotation.type === AnnotationType.Line) {
    return true;
  }
  if (annotation.type !== AnnotationType.Ink) {
    return false;
  }
  if (annotation.lineFallback === true) {
    return true;
  }
  return false;
}

/**
 * Gets line endpoints for a line-like annotation.
 */
export function getLineLikeEndpoints(
  annotation: Pick<SerialisedAnnotation, 'line' | 'inkPaths' | 'lineFallback'>,
): SerialisedLineEndpoints | undefined {
  if (annotation.line) {
    return annotation.line;
  }
  if (annotation.lineFallback !== true || !hasTwoPointInkPath(annotation.inkPaths)) {
    return undefined;
  }
  const start = annotation.inkPaths[0]?.[0];
  const end = annotation.inkPaths[0]?.[1];
  if (!start || !end) {
    return undefined;
  }
  return {
    start: { x: start.x, y: start.y },
    end: { x: end.x, y: end.y },
  };
}
