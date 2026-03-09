import type { SerialisedAnnotation } from '../../../context/protocol.js';
import type { OptimisticAnnotationPatch } from './annotation-mutation-patch-utils.js';
import type { AnnotationMutationStoreState } from './annotation-mutation-store-state.js';
import {
  acknowledgeMutationStorePage,
  beginMutationStoreEntry,
  clearMutationStoreEntry,
  clearMutationStorePreview,
  previewMutationStoreEntry,
} from './annotation-mutation-store-write-operations.js';

export function createAnnotationMutationStoreWriteApi(state: AnnotationMutationStoreState, notify: () => void) {
  return {
    begin(pageIndex: number, annotationIndex: number, patch: OptimisticAnnotationPatch): () => void {
      return beginMutationStoreEntry(state, pageIndex, annotationIndex, patch, notify);
    },
    clear(pageIndex: number, annotationIndex: number): void {
      clearMutationStoreEntry(state, pageIndex, annotationIndex, notify);
    },
    preview(pageIndex: number, annotationIndex: number, patch: OptimisticAnnotationPatch): void {
      previewMutationStoreEntry(state, pageIndex, annotationIndex, patch, notify);
    },
    clearPreview(pageIndex: number, annotationIndex: number): void {
      clearMutationStorePreview(state, pageIndex, annotationIndex, notify);
    },
    acknowledge(pageIndex: number, annotations: readonly SerialisedAnnotation[]): void {
      acknowledgeMutationStorePage(state, pageIndex, annotations, notify);
    },
  };
}
