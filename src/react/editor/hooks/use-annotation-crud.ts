/**
 * Annotation CRUD hook for the editor.
 *
 * Wraps worker page methods, pushes commands to the undo stack,
 * and bumps the document revision for cache invalidation.
 *
 * @module react/editor/hooks/use-annotation-crud
 */

import type { WorkerPDFiumDocument } from '../../../context/worker-client.js';
import type { AnnotationCrudActions } from './annotation-crud.types.js';
import { useAnnotationCommandBridge } from './use-annotation-command-bridge.js';
import { useAnnotationCrudActions } from './use-annotation-crud-actions.js';
import { useAnnotationGeometryMutations } from './use-annotation-geometry-mutations.js';
import { useAnnotationStyleMutationBurstWarning } from './use-annotation-style-mutation-burst-warning.js';
import { useAnnotationStyleMutations } from './use-annotation-style-mutations.js';
import { useOptimisticAnnotationMutation } from './use-optimistic-annotation-mutation.js';

/**
 * Provides annotation CRUD operations for a specific page,
 * integrated with the editor's undo/redo stack.
 *
 * Must be called within an `EditorProvider` and `PDFiumProvider`.
 */
export function useAnnotationCrud(document: WorkerPDFiumDocument | null, pageIndex: number): AnnotationCrudActions {
  const { getPage, pushCommand } = useAnnotationCommandBridge(document, pageIndex);
  const { mutationStore, runWithOptimisticMutation } = useOptimisticAnnotationMutation(pageIndex);
  const warnIfStyleMutationBursts = useAnnotationStyleMutationBurstWarning(pageIndex);

  const geometryMutations = useAnnotationGeometryMutations({
    document,
    getPage,
    mutationStore,
    pageIndex,
    pushCommand,
    runWithOptimisticMutation,
  });
  const styleMutations = useAnnotationStyleMutations({
    document,
    getPage,
    pushCommand,
    runWithOptimisticMutation,
    warnIfStyleMutationBursts,
  });

  return useAnnotationCrudActions({
    geometryMutations,
    styleMutations,
  });
}

export type { AnnotationCrudActions } from './annotation-crud.types.js';
