import type { SerialisedAnnotation } from '../../../context/protocol.js';
import type { OptimisticAnnotationPatch } from './annotation-mutation-patch-utils.js';
import {
  getMutationStorePatch,
  getMutationStorePreviewPatch,
  hasAnyPendingMutationEntries,
  hasPendingMutationEntry,
  mergeMutationStorePage,
  waitForMutationStoreToBeIdle,
} from './annotation-mutation-store-read-operations.js';
import type { AnnotationMutationStoreState } from './annotation-mutation-store-state.js';

export function createAnnotationMutationStoreQueryApi(state: AnnotationMutationStoreState) {
  return {
    getPatch(pageIndex: number, annotationIndex: number): OptimisticAnnotationPatch | undefined {
      return getMutationStorePatch(state, pageIndex, annotationIndex);
    },
    getPreviewPatch(pageIndex: number, annotationIndex: number): OptimisticAnnotationPatch | undefined {
      return getMutationStorePreviewPatch(state, pageIndex, annotationIndex);
    },
    hasPending(pageIndex: number, annotationIndex: number): boolean {
      return hasPendingMutationEntry(state, pageIndex, annotationIndex);
    },
    hasAnyPending(): boolean {
      return hasAnyPendingMutationEntries(state);
    },
    waitForIdle(): Promise<void> {
      return waitForMutationStoreToBeIdle(state);
    },
    mergeForPage(
      pageIndex: number,
      annotations: readonly SerialisedAnnotation[],
      includePreview = true,
    ): readonly SerialisedAnnotation[] {
      return mergeMutationStorePage(state, pageIndex, annotations, includePreview);
    },
  };
}
