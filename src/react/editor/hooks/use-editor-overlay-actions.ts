import type { EditorOverlayActionsResult, UseEditorOverlayActionsOptions } from './editor-overlay-actions.types.js';
import { useEditorOverlayActionScopes } from './use-editor-overlay-action-scopes.js';

export function useEditorOverlayActions({
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
}: UseEditorOverlayActionsOptions): EditorOverlayActionsResult {
  const { selectionActions, toolActions } = useEditorOverlayActionScopes({
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
  });

  return {
    ...selectionActions,
    ...toolActions,
  };
}

export type { EditorOverlayActionsResult, UseEditorOverlayActionsOptions } from './editor-overlay-actions.types.js';
