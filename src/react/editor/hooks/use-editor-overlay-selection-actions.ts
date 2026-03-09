import { useCallback } from 'react';
import type {
  EditorOverlaySelectionActionsResult,
  UseEditorOverlaySelectionActionsOptions,
} from './editor-overlay-selection-actions.types.js';
import { useEditorOverlaySelectionCommitActions } from './use-editor-overlay-selection-commit-actions.js';
import { useEditorOverlaySelectionPreviewActions } from './use-editor-overlay-selection-preview-actions.js';

export function useEditorOverlaySelectionActions({
  crud,
  mutationStore,
  pageIndex,
  runCreateAndSelectMutation,
  runMutation,
  scale,
  select,
  selectedAnnotation,
  selectedCommittedAnnotation,
  selection,
  toolConfigs,
}: UseEditorOverlaySelectionActionsOptions): EditorOverlaySelectionActionsResult {
  const { clearSelectionPreview, previewSelectionLine, previewSelectionRect } = useEditorOverlaySelectionPreviewActions(
    {
      mutationStore,
      pageIndex,
      scale,
      selectedAnnotation,
      selectedCommittedAnnotation,
      selection,
      toolConfigs,
    },
  );
  const { handleMove, handleMoveLine, handleResize, handleResizeLine } = useEditorOverlaySelectionCommitActions({
    crud,
    runCreateAndSelectMutation,
    runMutation,
    scale,
    selectedCommittedAnnotation,
    selection,
    toolConfigs,
  });

  const handleAnnotationClick = useCallback(
    (annotationIndex: number) => {
      select(pageIndex, annotationIndex);
    },
    [pageIndex, select],
  );

  return {
    clearSelectionPreview,
    handleAnnotationClick,
    handleMove,
    handleMoveLine,
    handleResize,
    handleResizeLine,
    previewSelectionLine,
    previewSelectionRect,
  };
}

export type {
  EditorOverlaySelectionActionsResult,
  UseEditorOverlaySelectionActionsOptions,
} from './editor-overlay-selection-actions.types.js';
