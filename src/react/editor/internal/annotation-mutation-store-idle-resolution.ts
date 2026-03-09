import type { OptimisticAnnotationEntry } from './annotation-mutation-patch.types.js';
import type { AnnotationMutationStoreCollections } from './annotation-mutation-store-entry.types.js';
import { resolveIdleWaiters } from './annotation-mutation-store-support.js';

export function hasPendingEntries(entries: Iterable<OptimisticAnnotationEntry>): boolean {
  for (const entry of entries) {
    if (entry.pendingCount > 0) {
      return true;
    }
  }
  return false;
}

export function resolveIdleWaitersIfStoreIdle({
  entries,
  idleWaiters,
}: Pick<AnnotationMutationStoreCollections, 'entries' | 'idleWaiters'>): void {
  if (hasPendingEntries(entries.values())) return;
  resolveIdleWaiters(idleWaiters);
}
