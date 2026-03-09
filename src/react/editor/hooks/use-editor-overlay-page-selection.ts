import type { UseEditorOverlayPageStateOptions } from './editor-overlay-page-state.types.js';
import { useEditorOverlaySelectionState } from './use-editor-overlay-selection-state.js';
import type { ReturnTypeUseEditorOverlayServices } from './use-editor-overlay-services.js';
import { useEditorSelectionLifecycle } from './use-editor-selection-lifecycle.js';

interface UseEditorOverlayPageSelectionOptions
  extends Pick<UseEditorOverlayPageStateOptions, 'annotationsPending' | 'pageIndex'>,
    Pick<
      ReturnTypeUseEditorOverlayServices,
      | 'activeTool'
      | 'clearPendingMarkupAction'
      | 'committedAnnotations'
      | 'crud'
      | 'effectiveSelectionEnabled'
      | 'mutationStore'
      | 'pendingMarkupAction'
      | 'resolvedAnnotations'
    > {}

export function useEditorOverlayPageSelection({
  activeTool,
  annotationsPending,
  clearPendingMarkupAction,
  committedAnnotations,
  crud,
  effectiveSelectionEnabled,
  mutationStore,
  pageIndex,
  pendingMarkupAction,
  resolvedAnnotations,
}: UseEditorOverlayPageSelectionOptions) {
  const selectionState = useEditorOverlaySelectionState({
    committedAnnotations,
    crud,
    mutationStore,
    pageIndex,
    resolvedAnnotations,
  });
  const isNeutralMode = activeTool === 'idle';
  const { containerRef } = useEditorSelectionLifecycle({
    annotationsPending,
    clearPendingMarkupAction,
    clearSelection: selectionState.clearSelection,
    effectiveSelectionEnabled,
    isNeutralMode,
    pageIndex,
    pendingMarkupAction,
    resolvedAnnotations,
    selection: selectionState.selection,
  });

  return {
    ...selectionState,
    containerRef,
    isNeutralMode,
  };
}

export type ReturnTypeUseEditorOverlayPageSelection = ReturnType<typeof useEditorOverlayPageSelection>;
