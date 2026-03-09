import { useCallback, useMemo } from 'react';
import { SetAnnotationColourCommand, SetAnnotationStringCommand } from '../command.js';
import { coloursEqual, getStringMutationPatch } from './annotation-crud-support.js';
import type {
  AnnotationColourStringMutationsResult,
  UseAnnotationStyleMutationsOptions,
} from './annotation-style-mutations.types.js';

export function useAnnotationColourStringMutations({
  document,
  getPage,
  pushCommand,
  runWithOptimisticMutation,
  warnIfStyleMutationBursts,
}: UseAnnotationStyleMutationsOptions): AnnotationColourStringMutationsResult {
  const setAnnotationColour = useCallback<AnnotationColourStringMutationsResult['setAnnotationColour']>(
    async (annotationIndex, colourType, oldColour, newColour, preserveBorder) => {
      if (!document) return;
      if (coloursEqual(oldColour, newColour)) return;
      warnIfStyleMutationBursts('colour', annotationIndex);
      const patch = {
        colour: colourType === 'stroke' ? { stroke: newColour } : { interior: newColour },
        ...(preserveBorder !== undefined ? { border: preserveBorder } : {}),
      };
      await runWithOptimisticMutation(annotationIndex, patch, async () => {
        const command = new SetAnnotationColourCommand(
          getPage,
          annotationIndex,
          colourType,
          oldColour,
          newColour,
          preserveBorder ?? null,
        );
        await pushCommand(command);
      });
    },
    [document, getPage, pushCommand, runWithOptimisticMutation, warnIfStyleMutationBursts],
  );

  const setAnnotationString = useCallback<AnnotationColourStringMutationsResult['setAnnotationString']>(
    async (annotationIndex, key, oldValue, newValue) => {
      if (!document) return;
      if (oldValue === newValue) return;
      const patch = getStringMutationPatch(key, newValue);
      if (patch === undefined) {
        const command = new SetAnnotationStringCommand(getPage, annotationIndex, key, oldValue, newValue);
        await pushCommand(command);
        return;
      }
      await runWithOptimisticMutation(annotationIndex, patch, async () => {
        const command = new SetAnnotationStringCommand(getPage, annotationIndex, key, oldValue, newValue);
        await pushCommand(command);
      });
    },
    [document, getPage, pushCommand, runWithOptimisticMutation],
  );

  return useMemo(
    () => ({
      setAnnotationColour,
      setAnnotationString,
    }),
    [setAnnotationColour, setAnnotationString],
  );
}
