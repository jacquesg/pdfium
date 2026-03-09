import type { AnnotationMutationStoreState } from './annotation-mutation-store-state.js';

export function buildMutationStoreEntryContext(state: AnnotationMutationStoreState) {
  return {
    entries: state.entries,
    idleWaiters: state.idleWaiters,
    staleEntryTimers: state.staleEntryTimers,
  };
}

export function buildMutationStoreClearContext(state: AnnotationMutationStoreState) {
  return {
    entries: state.entries,
    idleWaiters: state.idleWaiters,
    previewPatches: state.previewPatches,
    staleEntryTimers: state.staleEntryTimers,
  };
}

export function buildMutationStorePreviewContext(state: AnnotationMutationStoreState) {
  return {
    previewPatches: state.previewPatches,
  };
}

export function buildMutationStoreAcknowledgeContext(state: AnnotationMutationStoreState) {
  return {
    entries: state.entries,
    staleEntryTimers: state.staleEntryTimers,
  };
}
