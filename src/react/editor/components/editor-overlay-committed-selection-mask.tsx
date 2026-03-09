import type { ReactNode } from 'react';
import type { SerialisedAnnotation } from '../../../context/protocol.js';
import type { WorkerPDFiumDocument } from '../../../context/worker-client.js';
import {
  buildCommittedAnnotationMaskRect,
  CommittedAnnotationMaskOverlay,
} from './committed-annotation-mask-overlay.js';

interface EditorOverlayCommittedSelectionMaskProps {
  readonly active: boolean;
  readonly document: WorkerPDFiumDocument | null;
  readonly height: number;
  readonly originalHeight: number;
  readonly pageIndex: number;
  readonly scale: number;
  readonly selectedCommittedAnnotation: SerialisedAnnotation | null;
  readonly width: number;
}

export function EditorOverlayCommittedSelectionMask({
  active,
  document,
  height,
  originalHeight,
  pageIndex,
  scale,
  selectedCommittedAnnotation,
  width,
}: EditorOverlayCommittedSelectionMaskProps): ReactNode {
  if (document === null || selectedCommittedAnnotation === null) {
    return null;
  }

  return (
    <CommittedAnnotationMaskOverlay
      document={document}
      pageIndex={pageIndex}
      maskRect={buildCommittedAnnotationMaskRect({
        rect: selectedCommittedAnnotation.bounds,
        strokeWidth: Math.max(0.25, selectedCommittedAnnotation.border?.borderWidth ?? 1),
        scale,
        pageWidth: Math.max(width / Math.max(scale, 0.01), selectedCommittedAnnotation.bounds.right),
        pageHeight: Math.max(originalHeight, selectedCommittedAnnotation.bounds.top),
      })}
      scale={scale}
      originalHeight={originalHeight}
      pageWidth={width}
      pageHeight={height}
      active={active}
    />
  );
}
