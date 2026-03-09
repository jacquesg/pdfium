import { useMemo } from 'react';
import type {
  EditorOverlayDrawingCreationActionsResult,
  UseEditorOverlayCreationActionsOptions,
} from './editor-overlay-creation-actions.types.js';
import { useEditorOverlayInkCompleteAction } from './use-editor-overlay-ink-complete-action.js';
import { useEditorOverlayRedactCreateAction } from './use-editor-overlay-redact-create-action.js';
import { useEditorOverlayShapeCreateAction } from './use-editor-overlay-shape-create-action.js';

export function useEditorOverlayDrawingCreationActions({
  activeTool,
  crud,
  originalHeight,
  redaction,
  runCreateAndSelectMutation,
  runMutation,
  scale,
  setActiveTool,
  toolConfigs,
}: UseEditorOverlayCreationActionsOptions): EditorOverlayDrawingCreationActionsResult {
  const handleInkComplete = useEditorOverlayInkCompleteAction({
    crud,
    originalHeight,
    runMutation,
    scale,
    toolConfigs,
  });
  const handleShapeCreate = useEditorOverlayShapeCreateAction({
    activeTool,
    crud,
    runCreateAndSelectMutation,
    scale,
    setActiveTool,
    toolConfigs,
  });
  const handleRedactCreate = useEditorOverlayRedactCreateAction({
    redaction,
    runCreateAndSelectMutation,
    setActiveTool,
    toolConfigs,
  });

  return useMemo(
    () => ({
      handleInkComplete,
      handleRedactCreate,
      handleShapeCreate,
    }),
    [handleInkComplete, handleRedactCreate, handleShapeCreate],
  );
}
