import { type ReactNode, useMemo } from 'react';
import type { WorkerPDFiumDocument } from '../../../context/worker-client.js';
import type { Rect } from '../../../core/types.js';
import { PDFCanvas } from '../../components/pdf-canvas.js';
import { pdfRectToScreen } from '../../coordinates.js';
import { useDevicePixelRatio } from '../../hooks/use-device-pixel-ratio.js';
import { useRenderPage } from '../../use-render.js';

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export interface CommittedAnnotationMaskRectOptions {
  readonly rect: Rect;
  readonly strokeWidth?: number;
  readonly scale: number;
  readonly pageWidth: number;
  readonly pageHeight: number;
}

export function buildCommittedAnnotationMaskRect({
  rect,
  strokeWidth = 1,
  scale,
  pageWidth,
  pageHeight,
}: CommittedAnnotationMaskRectOptions): Rect {
  const screenPaddingPx = 4;
  const pdfPadding = Math.max(strokeWidth, screenPaddingPx / Math.max(scale, 0.01));
  const left = clamp(rect.left - pdfPadding, 0, pageWidth);
  const right = clamp(rect.right + pdfPadding, left, pageWidth);
  const bottom = clamp(rect.bottom - pdfPadding, 0, pageHeight);
  const top = clamp(rect.top + pdfPadding, bottom, pageHeight);
  return { left, right, bottom, top };
}

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
      style={{
        position: 'absolute',
        left: screenRect.x,
        top: screenRect.y,
        width: screenRect.width,
        height: screenRect.height,
        overflow: 'hidden',
        pointerEvents: 'none',
        opacity: active ? 1 : 0,
      }}
    >
      <PDFCanvas
        width={render.width}
        height={render.height}
        renderKey={render.renderKey}
        style={{
          position: 'absolute',
          left: -screenRect.x,
          top: -screenRect.y,
          width: pageWidth,
          height: pageHeight,
          pointerEvents: 'none',
        }}
      />
    </div>
  );
}
