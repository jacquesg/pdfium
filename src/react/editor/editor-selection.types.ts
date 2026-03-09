/**
 * Identifies a selected annotation on a specific page.
 */
export interface AnnotationSelection {
  readonly pageIndex: number;
  /** PDF annotation index (`SerialisedAnnotation.index`), not array position. */
  readonly annotationIndex: number;
}
