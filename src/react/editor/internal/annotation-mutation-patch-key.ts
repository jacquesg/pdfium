export interface AnnotationMutationKeyParts {
  readonly pageIndex: number;
  readonly annotationIndex: number;
}

export function makeKey(pageIndex: number, annotationIndex: number): string {
  return `${String(pageIndex)}:${String(annotationIndex)}`;
}

export function isFiniteNumber(value: number): boolean {
  return Number.isFinite(value);
}

export function parseKey(key: string): AnnotationMutationKeyParts | null {
  const [pagePart, indexPart] = key.split(':');
  const pageIndex = Number.parseInt(pagePart ?? '', 10);
  const annotationIndex = Number.parseInt(indexPart ?? '', 10);
  if (!isFiniteNumber(pageIndex) || !isFiniteNumber(annotationIndex)) {
    return null;
  }
  return { pageIndex, annotationIndex };
}
