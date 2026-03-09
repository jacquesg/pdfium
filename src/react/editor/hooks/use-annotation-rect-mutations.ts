import { useCallback, useMemo } from 'react';
import { SetAnnotationRectCommand } from '../command.js';
import { rectsEqual } from './annotation-crud-support.js';
import type {
  AnnotationRectMutationsResult,
  UseAnnotationGeometryMutationsOptions,
} from './annotation-geometry-mutations.types.js';

export function useAnnotationRectMutations({
  document,
  getPage,
  pushCommand,
  runWithOptimisticMutation,
}: Pick<
  UseAnnotationGeometryMutationsOptions,
  'document' | 'getPage' | 'pushCommand' | 'runWithOptimisticMutation'
>): AnnotationRectMutationsResult {
  const runRectMutation = useCallback(
    async (
      annotationIndex: number,
      oldRect: { left: number; top: number; right: number; bottom: number },
      newRect: { left: number; top: number; right: number; bottom: number },
      description: string,
    ) => {
      if (!document) return;
      if (rectsEqual(oldRect, newRect)) return;
      await runWithOptimisticMutation(annotationIndex, { bounds: newRect }, async () => {
        const command = new SetAnnotationRectCommand(getPage, annotationIndex, oldRect, newRect, description);
        await pushCommand(command);
      });
    },
    [document, getPage, pushCommand, runWithOptimisticMutation],
  );

  const moveAnnotation = useCallback<AnnotationRectMutationsResult['moveAnnotation']>(
    async (annotationIndex, oldRect, newRect) => {
      await runRectMutation(annotationIndex, oldRect, newRect, 'Move annotation');
    },
    [runRectMutation],
  );

  const resizeAnnotation = useCallback<AnnotationRectMutationsResult['resizeAnnotation']>(
    async (annotationIndex, oldRect, newRect) => {
      await runRectMutation(annotationIndex, oldRect, newRect, 'Resize annotation');
    },
    [runRectMutation],
  );

  return useMemo(
    () => ({
      moveAnnotation,
      resizeAnnotation,
    }),
    [moveAnnotation, resizeAnnotation],
  );
}
