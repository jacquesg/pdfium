import { type AnnotationBorder, type AnnotationColourType, AnnotationType } from '../../core/types.js';

export function defaultColourTypeForSubtype(subtype: AnnotationType): AnnotationColourType {
  if (subtype === AnnotationType.Highlight || subtype === AnnotationType.Redact) {
    return 'interior';
  }
  return 'stroke';
}

export function bordersEqual(a: AnnotationBorder | null, b: AnnotationBorder | null): boolean {
  if (a === null || b === null) {
    return a === b;
  }
  return (
    Math.abs(a.horizontalRadius - b.horizontalRadius) < 1e-6 &&
    Math.abs(a.verticalRadius - b.verticalRadius) < 1e-6 &&
    Math.abs(a.borderWidth - b.borderWidth) < 1e-6
  );
}
