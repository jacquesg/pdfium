import { useMemo } from 'react';
import type { StyleMutationActions, UseAnnotationStyleMutationsOptions } from './annotation-style-mutations.types.js';
import { useAnnotationBorderStyleMutations } from './use-annotation-border-style-mutations.js';
import { useAnnotationColourStringMutations } from './use-annotation-colour-string-mutations.js';

export function useAnnotationStyleMutations({
  document,
  getPage,
  pushCommand,
  runWithOptimisticMutation,
  warnIfStyleMutationBursts,
}: UseAnnotationStyleMutationsOptions): StyleMutationActions {
  const colourStringMutations = useAnnotationColourStringMutations({
    document,
    getPage,
    pushCommand,
    runWithOptimisticMutation,
    warnIfStyleMutationBursts,
  });
  const borderStyleMutations = useAnnotationBorderStyleMutations({
    document,
    getPage,
    pushCommand,
    runWithOptimisticMutation,
    warnIfStyleMutationBursts,
  });

  return useMemo(
    () => ({
      ...colourStringMutations,
      ...borderStyleMutations,
    }),
    [borderStyleMutations, colourStringMutations],
  );
}

export type { StyleMutationActions, UseAnnotationStyleMutationsOptions } from './annotation-style-mutations.types.js';
