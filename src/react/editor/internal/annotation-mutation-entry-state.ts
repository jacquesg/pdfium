import type { OptimisticAnnotationEntry, OptimisticAnnotationPatch } from './annotation-mutation-patch.types.js';
import { mergePatch } from './annotation-mutation-patch-merge.js';
import { resolveIdleWaiters } from './annotation-mutation-store-idle.js';

export function clearMutationStoreState(
  staleEntryTimers: Map<string, ReturnType<typeof setTimeout>>,
  entries: Map<string, OptimisticAnnotationEntry>,
  previewPatches: Map<string, OptimisticAnnotationPatch>,
  idleWaiters: Set<() => void>,
): boolean {
  if (staleEntryTimers.size === 0 && entries.size === 0 && previewPatches.size === 0) {
    return false;
  }
  for (const timer of staleEntryTimers.values()) {
    clearTimeout(timer);
  }
  staleEntryTimers.clear();
  entries.clear();
  previewPatches.clear();
  resolveIdleWaiters(idleWaiters);
  return true;
}

export function createStartedMutationEntry(
  existing: OptimisticAnnotationEntry | undefined,
  patch: OptimisticAnnotationPatch,
): OptimisticAnnotationEntry {
  const hasActiveMutation = (existing?.pendingCount ?? 0) > 0;
  return {
    pendingCount: (existing?.pendingCount ?? 0) + 1,
    patch: existing && hasActiveMutation ? mergePatch(existing.patch, patch) : patch,
    settledAtMs: null,
  };
}

export function createCompletedMutationEntry(
  entry: OptimisticAnnotationEntry,
  nowMs = Date.now(),
): OptimisticAnnotationEntry {
  const pendingCount = Math.max(0, entry.pendingCount - 1);
  return {
    ...entry,
    pendingCount,
    settledAtMs: pendingCount === 0 ? nowMs : null,
  };
}
