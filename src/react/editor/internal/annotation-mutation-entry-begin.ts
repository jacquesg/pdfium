import { makeKey, type OptimisticAnnotationPatch } from './annotation-mutation-patch-utils.js';
import type { AnnotationMutationStoreCollections } from './annotation-mutation-store-entry.types.js';
import { resolveIdleWaitersIfStoreIdle } from './annotation-mutation-store-idle-resolution.js';
import {
  clearStaleEntryTimer,
  createCompletedMutationEntry,
  createStartedMutationEntry,
  scheduleStaleEntryTimer,
} from './annotation-mutation-store-support.js';

export function beginMutationEntry(
  {
    entries,
    idleWaiters,
    staleEntryTimers,
  }: Pick<AnnotationMutationStoreCollections, 'entries' | 'idleWaiters' | 'staleEntryTimers'>,
  pageIndex: number,
  annotationIndex: number,
  patch: OptimisticAnnotationPatch,
  notify: () => void,
): () => void {
  const key = makeKey(pageIndex, annotationIndex);
  const existing = entries.get(key);
  clearStaleEntryTimer(staleEntryTimers, key);
  entries.set(key, createStartedMutationEntry(existing, patch));
  notify();

  let completed = false;
  return () => {
    if (completed) return;
    completed = true;
    const current = entries.get(key);
    if (current === undefined) return;
    const nextEntry = createCompletedMutationEntry(current);
    entries.set(key, nextEntry);
    if (nextEntry.pendingCount === 0) {
      scheduleStaleEntryTimer(staleEntryTimers, key, notify);
    } else {
      clearStaleEntryTimer(staleEntryTimers, key);
    }
    resolveIdleWaitersIfStoreIdle({ entries, idleWaiters });
    notify();
  };
}
