import type { SerialisedAnnotation } from '../../../context/protocol.js';
import { pdfRectToScreen } from '../../coordinates.js';
import { isEditorRedactionAnnotation } from '../redaction-utils.js';

export interface RedactionOverlayRect {
  readonly height: number;
  readonly index: number;
  readonly width: number;
  readonly x: number;
  readonly y: number;
}

interface BuildRedactionOverlayRectsOptions {
  readonly annotations: readonly SerialisedAnnotation[];
  readonly originalHeight: number;
  readonly scale: number;
}

export function buildRedactionOverlayRects({
  annotations,
  originalHeight,
  scale,
}: BuildRedactionOverlayRectsOptions): RedactionOverlayRect[] {
  return annotations.filter(isEditorRedactionAnnotation).map((annotation) => ({
    index: annotation.index,
    ...pdfRectToScreen(annotation.bounds, { scale, originalHeight }),
  }));
}
