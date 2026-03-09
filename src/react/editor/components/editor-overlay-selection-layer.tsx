import type { ReactNode } from 'react';
import type { EditorOverlaySelectionLayerProps } from './editor-overlay-selection-layer.types.js';
import { buildEditorOverlaySelectionState } from './editor-overlay-selection-layer-support.js';
import { EditorOverlaySelectionLayerView } from './editor-overlay-selection-layer-view.js';

export function EditorOverlaySelectionLayer({
  document,
  pageIndex,
  scale,
  originalHeight,
  width,
  height,
  selectedAnnotation,
  selectedCommittedAnnotation,
  selectedPreviewPatch,
  onMove,
  onResize,
  onMoveLine,
  onResizeLine,
  onPreviewRect,
  onPreviewLine,
  onPreviewClear,
}: EditorOverlaySelectionLayerProps): ReactNode {
  if (selectedAnnotation === null) {
    return null;
  }

  const { activeTransformPreview, interactiveSelection, selectionAppearance, useFallbackLineCallbacks } =
    buildEditorOverlaySelectionState({
      selectedAnnotation,
      selectedPreviewPatch,
    });

  return (
    <EditorOverlaySelectionLayerView
      activeTransformPreview={activeTransformPreview}
      document={document}
      height={height}
      interactiveSelection={interactiveSelection}
      onMove={onMove}
      onMoveLine={onMoveLine}
      onPreviewClear={onPreviewClear}
      onPreviewLine={onPreviewLine}
      onPreviewRect={onPreviewRect}
      onResize={onResize}
      onResizeLine={onResizeLine}
      originalHeight={originalHeight}
      pageIndex={pageIndex}
      scale={scale}
      selectedAnnotation={selectedAnnotation}
      selectedCommittedAnnotation={selectedCommittedAnnotation}
      selectionAppearance={selectionAppearance}
      useFallbackLineCallbacks={useFallbackLineCallbacks}
      width={width}
    />
  );
}

export type { EditorOverlaySelectionLayerProps } from './editor-overlay-selection-layer.types.js';
