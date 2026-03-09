import { makeKey } from './annotation-mutation-patch-utils.js';
import type { AnnotationMutationStoreCollections } from './annotation-mutation-store-entry.types.js';
import { resolveIdleWaitersIfStoreIdle } from './annotation-mutation-store-idle-resolution.js';
import { clearStaleEntryTimer } from './annotation-mutation-store-support.js';

export function clearMutationEntry(
  collections: AnnotationMutationStoreCollections,
  pageIndex: number,
  annotationIndex: number,
  notify: () => void,
): void {
  const key = makeKey(pageIndex, annotationIndex);
  const hadEntry = collections.entries.has(key);
  const hadPreview = collections.previewPatches.has(key);
  if (!hadEntry && !hadPreview) return;
  if (hadEntry) {
    clearStaleEntryTimer(collections.staleEntryTimers, key);
    collections.entries.delete(key);
  }
  if (hadPreview) {
    collections.previewPatches.delete(key);
  }
  resolveIdleWaitersIfStoreIdle(collections);
  notify();
}
