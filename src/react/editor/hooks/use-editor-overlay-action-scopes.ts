import type { UseEditorOverlayActionsOptions } from './editor-overlay-actions.types.js';
import { useEditorOverlayMutationRunners } from './use-editor-overlay-mutation-runners.js';
import { useEditorOverlaySelectionActions } from './use-editor-overlay-selection-actions.js';
import { useEditorOverlayToolActions } from './use-editor-overlay-tool-actions.js';

export function useEditorOverlayActionScopes({
  activeTool,
  clearPendingMarkupAction,
  crud,
  freetextInput,
  mutationStore,
  originalHeight,
  pageIndex,
  pendingMarkupAction,
  redaction,
  scale,
  select,
  selectedAnnotation,
  selectedCommittedAnnotation,
  selection,
  setActiveTool,
  textMarkup,
  toolConfigs,
}: UseEditorOverlayActionsOptions) {
  const { runCreateAndSelectMutation, runMutation } = useEditorOverlayMutationRunners({
    pageIndex,
    select,
  });
  const selectionActions = useEditorOverlaySelectionActions({
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
  });
  const toolActions = useEditorOverlayToolActions({
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
  });

  return {
    selectionActions,
    toolActions,
  };
}
