import type { EditorOverlayPageState, UseEditorOverlayPageStateOptions } from './editor-overlay-page-state.types.js';
import { buildEditorOverlayPageState } from './editor-overlay-page-state-support.js';
import { useEditorOverlayPageActions } from './use-editor-overlay-page-actions.js';
import { useEditorOverlayPageSelection } from './use-editor-overlay-page-selection.js';
import { useEditorOverlayServices } from './use-editor-overlay-services.js';

export function useEditorOverlayPageState({
  annotations,
  annotationsPending,
  document,
  originalHeight,
  pageIndex,
  scale,
  selectionEnabled,
}: UseEditorOverlayPageStateOptions): EditorOverlayPageState {
  const services = useEditorOverlayServices({
    annotations,
    document,
    pageIndex,
    selectionEnabled,
  });
  const overlaySelection = useEditorOverlayPageSelection({
    activeTool: services.activeTool,
    annotationsPending,
    clearPendingMarkupAction: services.clearPendingMarkupAction,
    committedAnnotations: services.committedAnnotations,
    crud: services.crud,
    effectiveSelectionEnabled: services.effectiveSelectionEnabled,
    mutationStore: services.mutationStore,
    pageIndex,
    pendingMarkupAction: services.pendingMarkupAction,
    resolvedAnnotations: services.resolvedAnnotations,
  });
  const actions = useEditorOverlayPageActions({
    originalHeight,
    overlaySelection,
    pageIndex,
    scale,
    services,
  });

  return buildEditorOverlayPageState({
    actions,
    overlaySelection,
    services,
  });
}
