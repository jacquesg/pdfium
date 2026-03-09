import type {
  EditorOverlayToolActionsResult,
  UseEditorOverlayToolActionsOptions,
} from './editor-overlay-tool-actions.types.js';
import { useEditorOverlayCreationActions } from './use-editor-overlay-creation-actions.js';
import { useEditorOverlayTextActions } from './use-editor-overlay-text-actions.js';

export function useEditorOverlayToolActionsRuntime({
  activeTool,
  clearPendingMarkupAction,
  crud,
  freetextInput,
  originalHeight,
  pendingMarkupAction,
  redaction,
  runCreateAndSelectMutation,
  runMutation,
  scale,
  setActiveTool,
  textMarkup,
  toolConfigs,
}: UseEditorOverlayToolActionsOptions): EditorOverlayToolActionsResult {
  const creationActions = useEditorOverlayCreationActions({
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
  const textActions = useEditorOverlayTextActions({
    clearPendingMarkupAction,
    freetextInput,
    pendingMarkupAction,
    runCreateAndSelectMutation,
    setActiveTool,
    textMarkup,
    toolConfigs,
  });

  return {
    ...creationActions,
    ...textActions,
  };
}
