import type { OptimisticAnnotationEntry, OptimisticAnnotationPatch } from './annotation-mutation-patch.types.js';
import { clearMutationStoreState } from './annotation-mutation-store-support.js';

export interface AnnotationMutationStoreState {
  readonly entries: Map<string, OptimisticAnnotationEntry>;
  readonly idleWaiters: Set<() => void>;
  readonly listeners: Set<() => void>;
  readonly previewPatches: Map<string, OptimisticAnnotationPatch>;
  readonly staleEntryTimers: Map<string, ReturnType<typeof setTimeout>>;
  version: number;
}

export function createAnnotationMutationStoreState(): AnnotationMutationStoreState {
  return {
    entries: new Map<string, OptimisticAnnotationEntry>(),
    idleWaiters: new Set<() => void>(),
    listeners: new Set<() => void>(),
    previewPatches: new Map<string, OptimisticAnnotationPatch>(),
    staleEntryTimers: new Map<string, ReturnType<typeof setTimeout>>(),
    version: 0,
  };
}

export function subscribeToAnnotationMutationStore(
  state: AnnotationMutationStoreState,
  listener: () => void,
): () => void {
  state.listeners.add(listener);
  return () => {
    state.listeners.delete(listener);
  };
}

export function notifyAnnotationMutationStore(state: AnnotationMutationStoreState): void {
  state.version++;
  for (const listener of state.listeners) {
    listener();
  }
}

export function destroyAnnotationMutationStoreState(state: AnnotationMutationStoreState): void {
  clearMutationStoreState(state.staleEntryTimers, state.entries, state.previewPatches, state.idleWaiters);
  state.listeners.clear();
  state.version = 0;
}

export function resetAnnotationMutationStoreState(state: AnnotationMutationStoreState): boolean {
  return clearMutationStoreState(state.staleEntryTimers, state.entries, state.previewPatches, state.idleWaiters);
}
