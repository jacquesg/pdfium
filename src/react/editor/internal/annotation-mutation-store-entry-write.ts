import type { OptimisticAnnotationPatch } from './annotation-mutation-patch-utils.js';
import { beginMutationEntry, clearMutationEntry } from './annotation-mutation-store-entry-operations.js';
import type { AnnotationMutationStoreState } from './annotation-mutation-store-state.js';
import {
  buildMutationStoreClearContext,
  buildMutationStoreEntryContext,
} from './annotation-mutation-store-write-context.js';

export function beginMutationStoreEntry(
  state: AnnotationMutationStoreState,
  pageIndex: number,
  annotationIndex: number,
  patch: OptimisticAnnotationPatch,
  notify: () => void,
): () => void {
  return beginMutationEntry(buildMutationStoreEntryContext(state), pageIndex, annotationIndex, patch, notify);
}

export function clearMutationStoreEntry(
  state: AnnotationMutationStoreState,
  pageIndex: number,
  annotationIndex: number,
  notify: () => void,
): void {
  clearMutationEntry(buildMutationStoreClearContext(state), pageIndex, annotationIndex, notify);
}
