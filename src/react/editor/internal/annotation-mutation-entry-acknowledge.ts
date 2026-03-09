import type { SerialisedAnnotation } from '../../../context/protocol.js';
import { collectAcknowledgedMutationKeys } from './annotation-mutation-page-resolution.js';
import type { AnnotationMutationStoreCollections } from './annotation-mutation-store-entry.types.js';
import { clearStaleEntryTimer } from './annotation-mutation-store-support.js';

export function acknowledgeMutationEntries(
  { entries, staleEntryTimers }: Pick<AnnotationMutationStoreCollections, 'entries' | 'staleEntryTimers'>,
  pageIndex: number,
  annotations: readonly SerialisedAnnotation[],
  notify: () => void,
): void {
  const acknowledgedKeys = collectAcknowledgedMutationKeys(pageIndex, annotations, entries);
  if (acknowledgedKeys.length === 0) {
    return;
  }

  for (const key of acknowledgedKeys) {
    clearStaleEntryTimer(staleEntryTimers, key);
    entries.delete(key);
  }
  notify();
}
