import { useEditorOverlayActions } from './use-editor-overlay-actions.js';
import type { ReturnTypeUseEditorOverlayPageSelection } from './use-editor-overlay-page-selection.js';
import type { ReturnTypeUseEditorOverlayServices } from './use-editor-overlay-services.js';

interface UseEditorOverlayPageActionsOptions {
  readonly originalHeight: number;
  readonly overlaySelection: ReturnTypeUseEditorOverlayPageSelection;
  readonly pageIndex: number;
  readonly scale: number;
  readonly services: ReturnTypeUseEditorOverlayServices;
}

export function useEditorOverlayPageActions({
  originalHeight,
  overlaySelection,
  pageIndex,
  scale,
  services,
}: UseEditorOverlayPageActionsOptions) {
  return useEditorOverlayActions({
    activeTool: services.activeTool,
    clearPendingMarkupAction: services.clearPendingMarkupAction,
    crud: services.crud,
    freetextInput: services.freetextInput,
    mutationStore: services.mutationStore,
    originalHeight,
    pageIndex,
    pendingMarkupAction: services.pendingMarkupAction,
    redaction: services.redaction,
    scale,
    select: overlaySelection.select,
    selectedAnnotation: overlaySelection.selectedAnnotation,
    selectedCommittedAnnotation: overlaySelection.selectedCommittedAnnotation,
    selection: overlaySelection.selection,
    setActiveTool: services.setActiveTool,
    textMarkup: services.textMarkup,
    toolConfigs: services.toolConfigs,
  });
}
