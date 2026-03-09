import { useCallback } from 'react';
import type { Rect } from '../../../core/types.js';
import type { UseEditorOverlaySelectionCommitActionsOptions } from './use-editor-overlay-selection-commit-actions.types.js';

type BoxOptions = Pick<
  UseEditorOverlaySelectionCommitActionsOptions,
  'crud' | 'runMutation' | 'selectedCommittedAnnotation' | 'selection'
>;

export function useEditorOverlaySelectionBoxCommitActions({
  crud,
  runMutation,
  selectedCommittedAnnotation,
  selection,
}: BoxOptions) {
  const handleMove = useCallback(
    (newRect: Rect) => {
      if (!selection || !selectedCommittedAnnotation) return;
      runMutation(crud.moveAnnotation(selection.annotationIndex, selectedCommittedAnnotation.bounds, newRect));
    },
    [crud, runMutation, selectedCommittedAnnotation, selection],
  );

  const handleResize = useCallback(
    (newRect: Rect) => {
      if (!selection || !selectedCommittedAnnotation) return;
      runMutation(crud.resizeAnnotation(selection.annotationIndex, selectedCommittedAnnotation.bounds, newRect));
    },
    [crud, runMutation, selectedCommittedAnnotation, selection],
  );

  return {
    handleMove,
    handleResize,
  };
}
