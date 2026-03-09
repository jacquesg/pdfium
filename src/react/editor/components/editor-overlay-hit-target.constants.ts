import { AnnotationType } from '../../../core/types.js';

export const MIN_HIT_TARGET_SIZE_PX = 14;
export const LINE_HIT_TARGET_PADDING_PX = 8;

export const NON_TRANSFORMABLE_ANNOTATION_TYPES = new Set<AnnotationType>([
  AnnotationType.Highlight,
  AnnotationType.Underline,
  AnnotationType.Strikeout,
  AnnotationType.Squiggly,
]);

export const NON_SELECTABLE_ANNOTATION_TYPES = new Set<AnnotationType>([AnnotationType.Link]);

export const TEXT_MARKUP_ANNOTATION_TYPES = new Set<AnnotationType>([
  AnnotationType.Highlight,
  AnnotationType.Underline,
  AnnotationType.Strikeout,
  AnnotationType.Squiggly,
]);
