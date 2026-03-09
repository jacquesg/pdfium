import type { ReactNode } from 'react';
import type { SerialisedAnnotation } from '../../../context/protocol.js';
import type { WorkerPDFiumDocument } from '../../../context/worker-client.js';
import { EditorOverlayCommittedSelectionMask } from './editor-overlay-committed-selection-mask.js';
import type { SelectionOverlayAppearance } from './selection-overlay.js';

interface EditorOverlaySelectionMaskLayerProps {
  readonly activeTransformPreview: boolean;
  readonly document: WorkerPDFiumDocument | null;
  readonly height: number;
  readonly originalHeight: number;
  readonly pageIndex: number;
  readonly scale: number;
  readonly selectedCommittedAnnotation: SerialisedAnnotation | null;
  readonly selectionAppearanceKind: SelectionOverlayAppearance['kind'];
  readonly width: number;
}

export function EditorOverlaySelectionMaskLayer({
  activeTransformPreview,
  document,
  height,
  originalHeight,
  pageIndex,
  scale,
  selectedCommittedAnnotation,
  selectionAppearanceKind,
  width,
}: EditorOverlaySelectionMaskLayerProps): ReactNode {
  if (selectionAppearanceKind === 'bounds') {
    return null;
  }

  return (
    <EditorOverlayCommittedSelectionMask
      active={activeTransformPreview}
      document={document}
      height={height}
      originalHeight={originalHeight}
      pageIndex={pageIndex}
      scale={scale}
      selectedCommittedAnnotation={selectedCommittedAnnotation}
      width={width}
    />
  );
}
