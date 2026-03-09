import type { SerialisedAnnotation } from '../../../context/protocol.js';
import type { WorkerPDFiumDocument } from '../../../context/worker-client.js';
import type { Point, Rect } from '../../../core/types.js';
import type { OptimisticAnnotationPatch } from '../internal/annotation-mutation-store.js';

export interface EditorOverlaySelectionLayerProps {
  readonly document: WorkerPDFiumDocument | null;
  readonly height: number;
  readonly onMove: (newRect: Rect) => void;
  readonly onMoveLine: (nextLine: { start: Point; end: Point }) => void;
  readonly onPreviewClear: () => void;
  readonly onPreviewLine: (previewLine: { start: Point; end: Point }) => void;
  readonly onPreviewRect: (previewRect: Rect) => void;
  readonly onResize: (newRect: Rect) => void;
  readonly onResizeLine: (nextLine: { start: Point; end: Point }) => void;
  readonly originalHeight: number;
  readonly pageIndex: number;
  readonly scale: number;
  readonly selectedAnnotation: SerialisedAnnotation | null;
  readonly selectedCommittedAnnotation: SerialisedAnnotation | null;
  readonly selectedPreviewPatch?: OptimisticAnnotationPatch | undefined;
  readonly width: number;
}
