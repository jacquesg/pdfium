import { useMemo } from 'react';
import type { AnnotationCrudActions } from './annotation-crud.types.js';
import type { GeometryMutationActions } from './annotation-geometry-mutations.types.js';
import type { StyleMutationActions } from './annotation-style-mutations.types.js';

interface UseAnnotationCrudActionsOptions {
  readonly geometryMutations: GeometryMutationActions;
  readonly styleMutations: StyleMutationActions;
}

export function useAnnotationCrudActions({
  geometryMutations,
  styleMutations,
}: UseAnnotationCrudActionsOptions): AnnotationCrudActions {
  return useMemo(
    () => ({
      ...geometryMutations,
      ...styleMutations,
    }),
    [geometryMutations, styleMutations],
  );
}
