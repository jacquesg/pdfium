import { type AnnotationColourType, AnnotationType } from '../../../core/types.js';
import type { ToolConfigKey } from '../types.js';

export function primaryColourTypeForAnnotation(type: AnnotationType): AnnotationColourType {
  if (type === AnnotationType.Redact) {
    return 'interior';
  }
  return 'stroke';
}

export function supportsFillColour(type: AnnotationType): boolean {
  return (
    type === AnnotationType.Square ||
    type === AnnotationType.Circle ||
    type === AnnotationType.Highlight ||
    type === AnnotationType.Redact
  );
}

export function supportsFillToggle(type: AnnotationType): boolean {
  return type === AnnotationType.Square || type === AnnotationType.Circle;
}

export function supportsStrokeColour(type: AnnotationType): boolean {
  return type !== AnnotationType.Highlight && type !== AnnotationType.Redact;
}

export function supportsBorderEditing(type: AnnotationType): boolean {
  return (
    type === AnnotationType.Square ||
    type === AnnotationType.Circle ||
    type === AnnotationType.Line ||
    type === AnnotationType.Ink
  );
}

export function opacityAffectsFill(type: AnnotationType): boolean {
  return type === AnnotationType.Square || type === AnnotationType.Circle;
}

export function resolvePresetTarget(type: AnnotationType): ToolConfigKey | null {
  switch (type) {
    case AnnotationType.Square:
      return 'rectangle';
    case AnnotationType.Circle:
      return 'circle';
    case AnnotationType.Line:
      return 'line';
    case AnnotationType.Ink:
      return 'ink';
    case AnnotationType.FreeText:
      return 'freetext';
    case AnnotationType.Highlight:
      return 'highlight';
    case AnnotationType.Underline:
      return 'underline';
    case AnnotationType.Strikeout:
      return 'strikeout';
    case AnnotationType.Redact:
      return 'redact';
    default:
      return null;
  }
}
