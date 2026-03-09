import type { ReactNode } from 'react';
import type { SerialisedAnnotation } from '../../../context/protocol.js';
import type { WorkerPDFiumDocument } from '../../../context/worker-client.js';
import type { EditorOverlayActionsResult } from '../hooks/use-editor-overlay-actions.js';
import type { OptimisticAnnotationPatch } from '../internal/annotation-mutation-store.js';
import { hasSelectionOverlayLayer } from './editor-overlay-layer-support.js';
import { EditorOverlaySelectionLayer } from './editor-overlay-selection-layer.js';

interface EditorOverlayPassiveSelectionLayerProps {
  readonly actions: EditorOverlayActionsResult;
  readonly document: WorkerPDFiumDocument | null;
  readonly effectiveSelectionEnabled: boolean;
  readonly height: number;
  readonly isNeutralMode: boolean;
  readonly originalHeight: number;
  readonly pageIndex: number;
  readonly scale: number;
  readonly selectedAnnotation: SerialisedAnnotation | null;
  readonly selectedCommittedAnnotation: SerialisedAnnotation | null;
  readonly selectedPreviewPatch?: OptimisticAnnotationPatch | undefined;
  readonly width: number;
}

export function EditorOverlayPassiveSelectionLayer({
  actions,
  document,
  effectiveSelectionEnabled,
  height,
  isNeutralMode,
  originalHeight,
  pageIndex,
  scale,
  selectedAnnotation,
  selectedCommittedAnnotation,
  selectedPreviewPatch,
  width,
}: EditorOverlayPassiveSelectionLayerProps): ReactNode {
  if (!hasSelectionOverlayLayer(effectiveSelectionEnabled, isNeutralMode, selectedAnnotation)) {
    return null;
  }

  return (
    <EditorOverlaySelectionLayer
      document={document}
      pageIndex={pageIndex}
      scale={scale}
      originalHeight={originalHeight}
      width={width}
      height={height}
      selectedAnnotation={selectedAnnotation}
      selectedCommittedAnnotation={selectedCommittedAnnotation}
      selectedPreviewPatch={selectedPreviewPatch}
      onMove={actions.handleMove}
      onResize={actions.handleResize}
      onMoveLine={actions.handleMoveLine}
      onResizeLine={actions.handleResizeLine}
      onPreviewRect={actions.previewSelectionRect}
      onPreviewLine={actions.previewSelectionLine}
      onPreviewClear={actions.clearSelectionPreview}
    />
  );
}
