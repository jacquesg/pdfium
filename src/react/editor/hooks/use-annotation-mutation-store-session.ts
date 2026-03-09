import { useEffect, useRef } from 'react';
import { AnnotationMutationStore } from '../internal/annotation-mutation-store.js';

export function useAnnotationMutationStoreSession(): AnnotationMutationStore {
  const mutationStoreRef = useRef<AnnotationMutationStore | null>(null);
  if (mutationStoreRef.current === null) {
    mutationStoreRef.current = new AnnotationMutationStore();
  }
  const mutationStore = mutationStoreRef.current;

  useEffect(
    () => () => {
      mutationStore.destroy();
    },
    [mutationStore],
  );

  return mutationStore;
}
