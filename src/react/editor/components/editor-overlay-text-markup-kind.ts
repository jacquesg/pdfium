import { AnnotationType } from '../../../core/types.js';
import type { TextMarkupSelectionKind } from './selection-overlay.types.js';

export function resolveTextMarkupSelectionKind(type: AnnotationType): TextMarkupSelectionKind {
  if (type === AnnotationType.Highlight) return 'highlight';
  if (type === AnnotationType.Underline) return 'underline';
  if (type === AnnotationType.Strikeout) return 'strikeout';
  return 'squiggly';
}
