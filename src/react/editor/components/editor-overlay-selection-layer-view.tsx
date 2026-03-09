import type { ReactNode } from 'react';
import type { EditorOverlaySelectionLayerProps } from './editor-overlay-selection-layer.types.js';
import { EditorOverlaySelectionMaskLayer } from './editor-overlay-selection-mask-layer.js';
import type { SelectionOverlayAppearance } from './selection-overlay.js';
import { SelectionOverlay } from './selection-overlay.js';

interface EditorOverlaySelectionLayerViewProps
  extends Omit<EditorOverlaySelectionLayerProps, 'selectedAnnotation' | 'selectedPreviewPatch'> {
  readonly activeTransformPreview: boolean;
  readonly interactiveSelection: boolean;
  readonly selectedAnnotation: NonNullable<EditorOverlaySelectionLayerProps['selectedAnnotation']>;
  readonly selectionAppearance: SelectionOverlayAppearance;
  readonly useFallbackLineCallbacks: boolean;
}

export function EditorOverlaySelectionLayerView({
  activeTransformPreview,
  document,
  height,
  interactiveSelection,
  onMove,
  onMoveLine,
  onPreviewClear,
  onPreviewLine,
  onPreviewRect,
  onResize,
  onResizeLine,
  originalHeight,
  pageIndex,
  scale,
  selectedAnnotation,
  selectedCommittedAnnotation,
  selectionAppearance,
  useFallbackLineCallbacks,
  width,
}: EditorOverlaySelectionLayerViewProps): ReactNode {
  return (
    <>
      {interactiveSelection && (
        <EditorOverlaySelectionMaskLayer
          activeTransformPreview={activeTransformPreview}
          document={document}
          height={height}
          originalHeight={originalHeight}
          pageIndex={pageIndex}
          scale={scale}
          selectedCommittedAnnotation={selectedCommittedAnnotation}
          selectionAppearanceKind={selectionAppearance.kind}
          width={width}
        />
      )}
      <SelectionOverlay
        rect={selectedAnnotation.bounds}
        scale={scale}
        originalHeight={originalHeight}
        maxWidth={width}
        maxHeight={height}
        appearance={selectionAppearance}
        interactive={interactiveSelection}
        onPreviewRect={onPreviewRect}
        onPreviewLine={onPreviewLine}
        onPreviewClear={onPreviewClear}
        onMove={onMove}
        onResize={onResize}
        {...(useFallbackLineCallbacks ? { onMoveLine, onResizeLine } : {})}
      />
    </>
  );
}
