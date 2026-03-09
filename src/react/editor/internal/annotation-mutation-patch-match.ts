import type { SerialisedAnnotation } from '../../../context/protocol.js';
import { inkPathsEqual, linesEqual } from './annotation-mutation-geometry-match.js';
import type { OptimisticAnnotationPatch } from './annotation-mutation-patch.types.js';
import { bordersEqual, coloursEqual, rectsEqual } from './annotation-mutation-value-match.js';

export function annotationMatchesPatch(annotation: SerialisedAnnotation, patch: OptimisticAnnotationPatch): boolean {
  if (patch.bounds !== undefined && !rectsEqual(annotation.bounds, patch.bounds)) {
    return false;
  }
  if (patch.border !== undefined && !bordersEqual(annotation.border, patch.border)) {
    return false;
  }
  if (patch.line !== undefined && !linesEqual(annotation.line, patch.line)) {
    return false;
  }
  if (patch.inkPaths !== undefined && !inkPathsEqual(annotation.inkPaths, patch.inkPaths)) {
    return false;
  }
  if (patch.contents !== undefined && annotation.contents !== patch.contents) {
    return false;
  }
  if (patch.author !== undefined && annotation.author !== patch.author) {
    return false;
  }
  if (patch.subject !== undefined && annotation.subject !== patch.subject) {
    return false;
  }
  if (patch.colour !== undefined) {
    if (patch.colour.stroke !== undefined && !coloursEqual(annotation.colour.stroke, patch.colour.stroke)) {
      return false;
    }
    if (patch.colour.interior !== undefined && !coloursEqual(annotation.colour.interior, patch.colour.interior)) {
      return false;
    }
  }
  return true;
}
