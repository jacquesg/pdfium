import type { SerialisedAnnotation } from '../../../context/protocol.js';
import type { AnnotationMutationStore, OptimisticAnnotationPatch } from '../internal/annotation-mutation-store.js';
import type { AnnotationSelection } from '../types.js';

interface UseEditorOverlaySelectedAnnotationsOptions {
  readonly committedAnnotations: readonly SerialisedAnnotation[];
  readonly mutationStore: AnnotationMutationStore;
  readonly pageIndex: number;
  readonly resolvedAnnotations: readonly SerialisedAnnotation[];
  readonly selection: AnnotationSelection | null;
}

function findSelectedAnnotation(
  annotations: readonly SerialisedAnnotation[],
  selection: AnnotationSelection | null,
  pageIndex: number,
): SerialisedAnnotation | null {
  return selection?.pageIndex === pageIndex
    ? (annotations.find((annotation) => annotation.index === selection.annotationIndex) ?? null)
    : null;
}

function getSelectedPreviewPatch(
  mutationStore: AnnotationMutationStore,
  selection: AnnotationSelection | null,
  pageIndex: number,
): OptimisticAnnotationPatch | undefined {
  return selection?.pageIndex === pageIndex
    ? mutationStore.getPreviewPatch(pageIndex, selection.annotationIndex)
    : undefined;
}

export function useEditorOverlaySelectedAnnotations({
  committedAnnotations,
  mutationStore,
  pageIndex,
  resolvedAnnotations,
  selection,
}: UseEditorOverlaySelectedAnnotationsOptions) {
  return {
    selectedAnnotation: findSelectedAnnotation(resolvedAnnotations, selection, pageIndex),
    selectedCommittedAnnotation: findSelectedAnnotation(committedAnnotations, selection, pageIndex),
    selectedPreviewPatch: getSelectedPreviewPatch(mutationStore, selection, pageIndex),
  };
}
