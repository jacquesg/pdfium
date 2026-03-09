import type { OptimisticAnnotationPatch } from './annotation-mutation-patch-utils.js';
import { clearPreviewMutationEntry, previewMutationEntry } from './annotation-mutation-store-entry-operations.js';
import type { AnnotationMutationStoreState } from './annotation-mutation-store-state.js';
import { buildMutationStorePreviewContext } from './annotation-mutation-store-write-context.js';

export function previewMutationStoreEntry(
  state: AnnotationMutationStoreState,
  pageIndex: number,
  annotationIndex: number,
  patch: OptimisticAnnotationPatch,
  notify: () => void,
): void {
  previewMutationEntry(buildMutationStorePreviewContext(state), pageIndex, annotationIndex, patch, notify);
}

export function clearMutationStorePreview(
  state: AnnotationMutationStoreState,
  pageIndex: number,
  annotationIndex: number,
  notify: () => void,
): void {
  clearPreviewMutationEntry(buildMutationStorePreviewContext(state), pageIndex, annotationIndex, notify);
}
