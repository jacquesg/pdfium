import type { WorkerPDFiumDocument } from '../../../context/worker-client.js';
import type { EditorOverlayLayersProps } from '../components/editor-overlay-layers.types.js';
import type { EditorOverlayPageState } from './editor-overlay-page-state.types.js';

interface UseEditorOverlayLayerPropsOptions
  extends Pick<EditorOverlayLayersProps, 'height' | 'originalHeight' | 'pageIndex' | 'scale' | 'width'> {
  readonly document: WorkerPDFiumDocument | null;
  readonly pageState: EditorOverlayPageState;
}

export function useEditorOverlayLayerProps({
  document,
  height,
  originalHeight,
  pageIndex,
  pageState,
  scale,
  width,
}: UseEditorOverlayLayerPropsOptions): EditorOverlayLayersProps {
  return {
    actions: pageState.actions,
    activeTool: pageState.activeTool,
    containerRef: pageState.containerRef,
    document,
    effectiveSelectionEnabled: pageState.effectiveSelectionEnabled,
    freetextInput: pageState.freetextInput,
    height,
    inkDrawing: pageState.inkDrawing,
    isNeutralMode: pageState.isNeutralMode,
    originalHeight,
    pageIndex,
    pendingMarkupAction: pageState.pendingMarkupAction,
    resolvedAnnotations: pageState.resolvedAnnotations,
    scale,
    selectedAnnotation: pageState.selectedAnnotation,
    selectedCommittedAnnotation: pageState.selectedCommittedAnnotation,
    selectedPreviewPatch: pageState.selectedPreviewPatch,
    selection: pageState.selection,
    toolConfigs: pageState.toolConfigs,
    width,
  };
}
