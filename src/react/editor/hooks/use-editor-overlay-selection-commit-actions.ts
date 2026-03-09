import { useEditorOverlaySelectionBoxCommitActions } from './use-editor-overlay-selection-box-commit-actions.js';
import type {
  EditorOverlaySelectionCommitActionsResult,
  UseEditorOverlaySelectionCommitActionsOptions,
} from './use-editor-overlay-selection-commit-actions.types.js';
import { useEditorOverlaySelectionLineCommitActions } from './use-editor-overlay-selection-line-commit-actions.js';

export function useEditorOverlaySelectionCommitActions({
  crud,
  runCreateAndSelectMutation,
  runMutation,
  scale,
  selectedCommittedAnnotation,
  selection,
  toolConfigs,
}: UseEditorOverlaySelectionCommitActionsOptions): EditorOverlaySelectionCommitActionsResult {
  const { handleMove, handleResize } = useEditorOverlaySelectionBoxCommitActions({
    crud,
    runMutation,
    selectedCommittedAnnotation,
    selection,
  });
  const { handleMoveLine, handleResizeLine } = useEditorOverlaySelectionLineCommitActions({
    crud,
    runCreateAndSelectMutation,
    scale,
    selectedCommittedAnnotation,
    toolConfigs,
  });

  return {
    handleMove,
    handleMoveLine,
    handleResize,
    handleResizeLine,
  };
}

export type {
  EditorOverlaySelectionCommitActionsResult,
  UseEditorOverlaySelectionCommitActionsOptions,
} from './use-editor-overlay-selection-commit-actions.types.js';
