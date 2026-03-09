import type { OptimisticAnnotationEntry, OptimisticAnnotationPatch } from './annotation-mutation-patch.types.js';

export interface AnnotationMutationStoreCollections {
  readonly entries: Map<string, OptimisticAnnotationEntry>;
  readonly idleWaiters: Set<() => void>;
  readonly previewPatches: Map<string, OptimisticAnnotationPatch>;
  readonly staleEntryTimers: Map<string, ReturnType<typeof setTimeout>>;
}
