import { useCallback, useMemo } from 'react';
import { SetAnnotationBorderCommand, SetAnnotationStyleCommand } from '../command.js';
import {
  bordersEqual,
  buildStyleMutationPatch,
  hasBorderStyleMutation,
  hasColourStyleMutation,
} from './annotation-crud-support.js';
import type {
  AnnotationBorderStyleMutationsResult,
  UseAnnotationStyleMutationsOptions,
} from './annotation-style-mutations.types.js';

export function useAnnotationBorderStyleMutations({
  document,
  getPage,
  pushCommand,
  runWithOptimisticMutation,
  warnIfStyleMutationBursts,
}: UseAnnotationStyleMutationsOptions): AnnotationBorderStyleMutationsResult {
  const setAnnotationBorder = useCallback<AnnotationBorderStyleMutationsResult['setAnnotationBorder']>(
    async (annotationIndex, oldBorder, newBorder) => {
      if (!document) return;
      if (bordersEqual(oldBorder, newBorder)) return;
      warnIfStyleMutationBursts('border', annotationIndex);
      await runWithOptimisticMutation(annotationIndex, { border: newBorder }, async () => {
        const command = new SetAnnotationBorderCommand(getPage, annotationIndex, oldBorder, newBorder);
        await pushCommand(command);
      });
    },
    [document, getPage, pushCommand, runWithOptimisticMutation, warnIfStyleMutationBursts],
  );

  const setAnnotationStyle = useCallback<NonNullable<AnnotationBorderStyleMutationsResult['setAnnotationStyle']>>(
    async (annotationIndex, style) => {
      if (!document) return;

      const stroke = hasColourStyleMutation(style.stroke) ? style.stroke : undefined;
      const interior = hasColourStyleMutation(style.interior) ? style.interior : undefined;
      const border = hasBorderStyleMutation(style.border) ? style.border : undefined;
      if (stroke === undefined && interior === undefined && border === undefined) {
        return;
      }

      const patch = buildStyleMutationPatch({ stroke, interior, border });
      await runWithOptimisticMutation(annotationIndex, patch, async () => {
        const command = new SetAnnotationStyleCommand(getPage, annotationIndex, {
          ...(stroke !== undefined ? { stroke } : {}),
          ...(interior !== undefined ? { interior } : {}),
          ...(border !== undefined ? { border } : {}),
        });
        await pushCommand(command);
      });
    },
    [document, getPage, pushCommand, runWithOptimisticMutation],
  );

  return useMemo(
    () => ({
      setAnnotationBorder,
      setAnnotationStyle,
    }),
    [setAnnotationBorder, setAnnotationStyle],
  );
}
