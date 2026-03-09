import { type ReactNode, useMemo } from 'react';
import type { WorkerPDFiumDocument } from '../../../context/worker-client.js';
import type { Rect } from '../../../core/types.js';
import { PDFCanvas } from '../../components/pdf-canvas.js';
import { pdfRectToScreen } from '../../coordinates.js';
import { useDevicePixelRatio } from '../../hooks/use-device-pixel-ratio.js';
import { useRenderPage } from '../../use-render.js';
import {
  buildCommittedAnnotationMaskCanvasStyle,
  buildCommittedAnnotationMaskFrameStyle,
} from './committed-annotation-mask-overlay-support.js';

export type { CommittedAnnotationMaskRectOptions } from './committed-annotation-mask-overlay-support.js';
export { buildCommittedAnnotationMaskRect } from './committed-annotation-mask-overlay-support.js';

export interface CommittedAnnotationMaskOverlayProps {
  readonly document: WorkerPDFiumDocument;
  readonly pageIndex: number;
  readonly maskRect: Rect;
  readonly scale: number;
  readonly originalHeight: number;
  readonly pageWidth: number;
  readonly pageHeight: number;
  readonly active?: boolean;
}

export function CommittedAnnotationMaskOverlay({
  document,
  pageIndex,
  maskRect,
  scale,
  originalHeight,
  pageWidth,
  pageHeight,
  active = false,
}: CommittedAnnotationMaskOverlayProps): ReactNode {
  const dpr = useDevicePixelRatio();
  const renderScale = scale * dpr;
  const screenRect = useMemo(
    () => pdfRectToScreen(maskRect, { scale, originalHeight }),
    [maskRect, scale, originalHeight],
  );
  const render = useRenderPage(document, pageIndex, {
    scale: renderScale,
    clipRect: maskRect,
    renderAnnotations: false,
  });

  if (!render.renderKey || render.width === null || render.height === null) {
    return null;
  }

  return (
    <div
      {...(active ? { 'data-testid': 'selection-committed-mask' } : {})}
      aria-hidden="true"
      style={buildCommittedAnnotationMaskFrameStyle({ active, screenRect })}
    >
      <PDFCanvas
        width={render.width}
        height={render.height}
        renderKey={render.renderKey}
        style={buildCommittedAnnotationMaskCanvasStyle({ pageHeight, pageWidth, screenRect })}
      />
    </div>
  );
}
