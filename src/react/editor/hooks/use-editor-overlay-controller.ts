import type { EditorOverlayProps } from '../components/editor-overlay.types.js';
import { useEditorOverlayLayerProps } from './use-editor-overlay-layer-props.js';
import { useEditorOverlayPageState } from './use-editor-overlay-page-state.js';

export function useEditorOverlayController({
  annotations,
  annotationsPending = false,
  document,
  height,
  originalHeight,
  pageIndex,
  scale,
  selectionEnabled,
  width,
}: EditorOverlayProps) {
  const pageState = useEditorOverlayPageState({
    annotations,
    annotationsPending,
    document,
    originalHeight,
    pageIndex,
    scale,
    selectionEnabled,
  });

  return useEditorOverlayLayerProps({
    document,
    height,
    originalHeight,
    pageIndex,
    pageState,
    scale,
    width,
  });
}
