import type { EditorOverlayPageState } from './editor-overlay-page-state.types.js';
import type { EditorOverlayActionsResult } from './use-editor-overlay-actions.js';
import type { ReturnTypeUseEditorOverlayPageSelection } from './use-editor-overlay-page-selection.js';
import type { ReturnTypeUseEditorOverlayServices } from './use-editor-overlay-services.js';

interface BuildEditorOverlayPageStateOptions {
  readonly actions: EditorOverlayActionsResult;
  readonly overlaySelection: ReturnTypeUseEditorOverlayPageSelection;
  readonly services: ReturnTypeUseEditorOverlayServices;
}

export function buildEditorOverlayPageState({
  actions,
  overlaySelection,
  services,
}: BuildEditorOverlayPageStateOptions): EditorOverlayPageState {
  return {
    actions,
    activeTool: services.activeTool,
    containerRef: overlaySelection.containerRef,
    effectiveSelectionEnabled: services.effectiveSelectionEnabled,
    freetextInput: services.freetextInput,
    inkDrawing: services.inkDrawing,
    isNeutralMode: overlaySelection.isNeutralMode,
    pendingMarkupAction: services.pendingMarkupAction,
    resolvedAnnotations: services.resolvedAnnotations,
    selectedAnnotation: overlaySelection.selectedAnnotation,
    selectedCommittedAnnotation: overlaySelection.selectedCommittedAnnotation,
    selectedPreviewPatch: overlaySelection.selectedPreviewPatch,
    selection: overlaySelection.selection,
    toolConfigs: services.toolConfigs,
  };
}
