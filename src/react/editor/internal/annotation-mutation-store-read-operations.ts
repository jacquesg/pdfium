import type { SerialisedAnnotation } from '../../../context/protocol.js';
import { mergeResolvedAnnotationsForPage } from './annotation-mutation-page-resolution.js';
import { makeKey, type OptimisticAnnotationPatch } from './annotation-mutation-patch-utils.js';
import { hasPendingEntries } from './annotation-mutation-store-entry-operations.js';
import type { AnnotationMutationStoreState } from './annotation-mutation-store-state.js';
import { waitForMutationStoreIdle } from './annotation-mutation-store-support.js';

export function getMutationStorePatch(
  state: AnnotationMutationStoreState,
  pageIndex: number,
  annotationIndex: number,
): OptimisticAnnotationPatch | undefined {
  return state.entries.get(makeKey(pageIndex, annotationIndex))?.patch;
}

export function getMutationStorePreviewPatch(
  state: AnnotationMutationStoreState,
  pageIndex: number,
  annotationIndex: number,
): OptimisticAnnotationPatch | undefined {
  return state.previewPatches.get(makeKey(pageIndex, annotationIndex));
}

export function hasPendingMutationEntry(
  state: AnnotationMutationStoreState,
  pageIndex: number,
  annotationIndex: number,
): boolean {
  const entry = state.entries.get(makeKey(pageIndex, annotationIndex));
  return (entry?.pendingCount ?? 0) > 0;
}

export function hasAnyPendingMutationEntries(state: AnnotationMutationStoreState): boolean {
  return hasPendingEntries(state.entries.values());
}

export function waitForMutationStoreToBeIdle(state: AnnotationMutationStoreState): Promise<void> {
  return waitForMutationStoreIdle(state.idleWaiters, () => hasAnyPendingMutationEntries(state));
}

export function mergeMutationStorePage(
  state: AnnotationMutationStoreState,
  pageIndex: number,
  annotations: readonly SerialisedAnnotation[],
  includePreview = true,
): readonly SerialisedAnnotation[] {
  return mergeResolvedAnnotationsForPage(pageIndex, annotations, state.entries, state.previewPatches, includePreview);
}
