import { useSyncExternalStore } from 'react';
import { useAnnotationMutationStore } from './annotation-mutation-store-context.js';

/**
 * Returns whether an annotation currently has at least one in-flight mutation.
 */
export function useAnnotationMutationPending(pageIndex: number, annotationIndex: number): boolean {
  const store = useAnnotationMutationStore();
  const version = useSyncExternalStore(
    (listener) => store.subscribe(listener),
    () => store.getSnapshot(),
    () => store.getSnapshot(),
  );
  void version;
  return store.hasPending(pageIndex, annotationIndex);
}

/**
 * Returns whether any annotation mutation is currently in-flight.
 */
export function useAnyAnnotationMutationPending(): boolean {
  const store = useAnnotationMutationStore();
  const version = useSyncExternalStore(
    (listener) => store.subscribe(listener),
    () => store.getSnapshot(),
    () => store.getSnapshot(),
  );
  void version;
  return store.hasAnyPending();
}
