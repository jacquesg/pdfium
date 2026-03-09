import { useMemo } from 'react';
import type {
  EditorOverlayCreationActionsResult,
  UseEditorOverlayCreationActionsOptions,
} from './editor-overlay-creation-actions.types.js';
import { useEditorOverlayDrawingCreationActions } from './use-editor-overlay-drawing-creation-actions.js';
import { useEditorOverlayStampCreationAction } from './use-editor-overlay-stamp-creation-action.js';

export function useEditorOverlayCreationActions({
  activeTool,
  crud,
  originalHeight,
  redaction,
  runCreateAndSelectMutation,
  runMutation,
  scale,
  setActiveTool,
  toolConfigs,
}: UseEditorOverlayCreationActionsOptions): EditorOverlayCreationActionsResult {
  const drawingActions = useEditorOverlayDrawingCreationActions({
    activeTool,
    crud,
    originalHeight,
    redaction,
    runCreateAndSelectMutation,
    runMutation,
    scale,
    setActiveTool,
    toolConfigs,
  });
  const stampAction = useEditorOverlayStampCreationAction({
    activeTool,
    crud,
    originalHeight,
    redaction,
    runCreateAndSelectMutation,
    runMutation,
    scale,
    setActiveTool,
    toolConfigs,
  });

  return useMemo(
    () => ({
      ...drawingActions,
      ...stampAction,
    }),
    [drawingActions, stampAction],
  );
}

export type {
  EditorOverlayCreationActionsResult,
  UseEditorOverlayCreationActionsOptions,
} from './editor-overlay-creation-actions.types.js';
