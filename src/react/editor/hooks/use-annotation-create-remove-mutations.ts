import { useCallback, useMemo } from 'react';
import { usePDFiumInstance } from '../../context.js';
import { CreateAnnotationCommand, RemoveAnnotationCommand } from '../command.js';
import type {
  AnnotationCreateRemoveMutationsResult,
  UseAnnotationGeometryMutationsOptions,
} from './annotation-geometry-mutations.types.js';

export function useAnnotationCreateRemoveMutations({
  document,
  getPage,
  mutationStore,
  pageIndex,
  pushCommand,
}: Pick<
  UseAnnotationGeometryMutationsOptions,
  'document' | 'getPage' | 'mutationStore' | 'pageIndex' | 'pushCommand'
>): AnnotationCreateRemoveMutationsResult {
  const { instance } = usePDFiumInstance();

  const createAnnotation = useCallback<AnnotationCreateRemoveMutationsResult['createAnnotation']>(
    async (subtype, rect, options) => {
      if (!document) return undefined;
      const command = new CreateAnnotationCommand(getPage, subtype, rect, options);
      await pushCommand(command);
      return command.createdIndex;
    },
    [document, getPage, pushCommand],
  );

  const removeAnnotation = useCallback<AnnotationCreateRemoveMutationsResult['removeAnnotation']>(
    async (annotationIndex, snapshot) => {
      if (!document) return;
      const snapshotRestore =
        instance !== null
          ? {
              document,
              openDocument: (data: Uint8Array | ArrayBuffer) => instance.openDocument(data),
            }
          : undefined;
      const command = new RemoveAnnotationCommand(getPage, annotationIndex, snapshot, snapshotRestore);
      await pushCommand(command);
      mutationStore.clear(pageIndex, annotationIndex);
    },
    [document, getPage, instance, mutationStore, pageIndex, pushCommand],
  );

  return useMemo(
    () => ({
      createAnnotation,
      removeAnnotation,
    }),
    [createAnnotation, removeAnnotation],
  );
}
