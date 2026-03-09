import { useCallback, useMemo } from 'react';
import { AnnotationType } from '../../../core/types.js';
import { CompositeCommand, CreateAnnotationCommand, RemoveAnnotationCommand } from '../command.js';
import { lineFallbackMatchesSnapshot, normaliseStrokeWidth } from './annotation-crud-support.js';
import type {
  AnnotationLineFallbackMutationsResult,
  UseAnnotationGeometryMutationsOptions,
} from './annotation-geometry-mutations.types.js';

export function useAnnotationLineFallbackMutations({
  document,
  getPage,
  mutationStore,
  pageIndex,
  pushCommand,
}: Pick<
  UseAnnotationGeometryMutationsOptions,
  'document' | 'getPage' | 'mutationStore' | 'pageIndex' | 'pushCommand'
>): AnnotationLineFallbackMutationsResult {
  const replaceLineFallback = useCallback<AnnotationLineFallbackMutationsResult['replaceLineFallback']>(
    async (snapshot, rect, start, end, strokeColour, strokeWidth) => {
      if (!document) return undefined;
      const resolvedStrokeWidth = normaliseStrokeWidth(strokeWidth);
      if (lineFallbackMatchesSnapshot(snapshot, rect, start, end, strokeColour, resolvedStrokeWidth)) {
        return snapshot.index;
      }

      mutationStore.clear(pageIndex, snapshot.index);
      const removeCommand = new RemoveAnnotationCommand(getPage, snapshot.index, snapshot);
      const createCommand = new CreateAnnotationCommand(getPage, AnnotationType.Ink, rect, {
        colour: strokeColour,
        inkPaths: [[start, end]],
        borderWidth: resolvedStrokeWidth,
        isLineFallback: true,
      });
      await pushCommand(new CompositeCommand('Transform line annotation', [removeCommand, createCommand]));
      return createCommand.createdIndex;
    },
    [document, getPage, mutationStore, pageIndex, pushCommand],
  );

  return useMemo(
    () => ({
      replaceLineFallback,
    }),
    [replaceLineFallback],
  );
}
