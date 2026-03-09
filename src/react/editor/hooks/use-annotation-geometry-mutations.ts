import { useMemo } from 'react';
import type {
  GeometryMutationActions,
  UseAnnotationGeometryMutationsOptions,
} from './annotation-geometry-mutations.types.js';
import { useAnnotationCreateRemoveMutations } from './use-annotation-create-remove-mutations.js';
import { useAnnotationLineFallbackMutations } from './use-annotation-line-fallback-mutations.js';
import { useAnnotationRectMutations } from './use-annotation-rect-mutations.js';

export function useAnnotationGeometryMutations({
  document,
  getPage,
  mutationStore,
  pageIndex,
  pushCommand,
  runWithOptimisticMutation,
}: UseAnnotationGeometryMutationsOptions): GeometryMutationActions {
  const createRemoveMutations = useAnnotationCreateRemoveMutations({
    document,
    getPage,
    mutationStore,
    pageIndex,
    pushCommand,
  });
  const rectMutations = useAnnotationRectMutations({
    document,
    getPage,
    pushCommand,
    runWithOptimisticMutation,
  });
  const lineFallbackMutations = useAnnotationLineFallbackMutations({
    document,
    getPage,
    mutationStore,
    pageIndex,
    pushCommand,
  });

  return useMemo(
    () => ({
      ...createRemoveMutations,
      ...rectMutations,
      ...lineFallbackMutations,
    }),
    [createRemoveMutations, lineFallbackMutations, rectMutations],
  );
}

export type {
  GeometryMutationActions,
  UseAnnotationGeometryMutationsOptions,
} from './annotation-geometry-mutations.types.js';
