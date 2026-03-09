import { useCallback } from 'react';
import { type OptimisticAnnotationPatch, useAnnotationMutationStore } from '../internal/annotation-mutation-store.js';

export function useOptimisticAnnotationMutation(pageIndex: number) {
  const mutationStore = useAnnotationMutationStore();

  const runWithOptimisticMutation = useCallback(
    async (
      annotationIndex: number,
      patch: OptimisticAnnotationPatch,
      operation: () => Promise<void>,
    ): Promise<void> => {
      const complete = mutationStore.begin(pageIndex, annotationIndex, patch);
      try {
        await operation();
      } catch (error) {
        mutationStore.clear(pageIndex, annotationIndex);
        throw error;
      } finally {
        complete();
      }
    },
    [mutationStore, pageIndex],
  );

  return {
    mutationStore,
    runWithOptimisticMutation,
  };
}
