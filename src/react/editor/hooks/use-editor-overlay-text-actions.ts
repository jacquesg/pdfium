import type {
  EditorOverlayTextActionsResult,
  UseEditorOverlayTextActionsOptions,
} from './editor-overlay-text-actions.types.js';
import { useEditorOverlayFreetextActions } from './use-editor-overlay-freetext-actions.js';
import { useEditorOverlayMarkupActions } from './use-editor-overlay-markup-actions.js';

export type { EditorOverlayTextActionsResult } from './editor-overlay-text-actions.types.js';

export function useEditorOverlayTextActions({
  clearPendingMarkupAction,
  freetextInput,
  pendingMarkupAction,
  runCreateAndSelectMutation,
  setActiveTool,
  textMarkup,
  toolConfigs,
}: UseEditorOverlayTextActionsOptions): EditorOverlayTextActionsResult {
  const freetextActions = useEditorOverlayFreetextActions({ freetextInput });
  const markupActions = useEditorOverlayMarkupActions({
    clearPendingMarkupAction,
    pendingMarkupAction,
    runCreateAndSelectMutation,
    setActiveTool,
    textMarkup,
    toolConfigs,
  });

  return {
    ...freetextActions,
    ...markupActions,
  };
}
