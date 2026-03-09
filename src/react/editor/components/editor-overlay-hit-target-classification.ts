import type { SerialisedAnnotation } from '../../../context/protocol.js';
import {
  NON_SELECTABLE_ANNOTATION_TYPES,
  NON_TRANSFORMABLE_ANNOTATION_TYPES,
  TEXT_MARKUP_ANNOTATION_TYPES,
} from './editor-overlay-hit-target.constants.js';

export function isTransformableAnnotation(annotation: SerialisedAnnotation): boolean {
  return !NON_TRANSFORMABLE_ANNOTATION_TYPES.has(annotation.type);
}

export function canRenderHitTarget(annotation: SerialisedAnnotation): boolean {
  return !NON_SELECTABLE_ANNOTATION_TYPES.has(annotation.type);
}

export function hasMarkupHitTargetGeometry(annotation: SerialisedAnnotation): boolean {
  return TEXT_MARKUP_ANNOTATION_TYPES.has(annotation.type) && (annotation.attachmentPoints?.length ?? 0) > 0;
}
