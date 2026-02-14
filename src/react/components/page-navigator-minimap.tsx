'use client';

import { type CSSProperties, type MouseEvent, useCallback, useRef } from 'react';
import type { WorkerPDFiumDocument } from '../../context/worker-client.js';
import type { Rect } from '../../core/types.js';
import { useRenderPage } from '../use-render.js';
import { PDFCanvas } from './pdf-canvas.js';

interface PageNavigatorMinimapProps {
  document: WorkerPDFiumDocument;
  pageIndex: number;
  /** Thumbnail width in CSS pixels. Default: 200. */
  thumbnailWidth?: number;
  /** Current viewport in PDF page coordinates (left, top, right, bottom). */
  viewport: Rect;
  /** Called when user clicks to reposition the viewport centre. */
  onViewportChange: (viewport: Rect) => void;
  className?: string;
  style?: CSSProperties;
}

/**
 * Minimap navigator showing a page thumbnail with a viewport rectangle overlay.
 *
 * Clicking on the minimap repositions the viewport centre. The viewport rectangle
 * is drawn as an SVG overlay on top of the rendered thumbnail.
 */
function PageNavigatorMinimap({
  document,
  pageIndex,
  thumbnailWidth = 200,
  viewport,
  onViewportChange,
  className,
  style,
}: PageNavigatorMinimapProps) {
  const containerRef = useRef<HTMLButtonElement>(null);

  const {
    renderKey,
    width: bitmapWidth,
    height: bitmapHeight,
    originalWidth,
    originalHeight,
  } = useRenderPage(document, pageIndex, { width: thumbnailWidth });

  // Scale from PDF page coordinates to CSS pixels
  const effectiveOrigW = originalWidth ?? 0;
  const effectiveOrigH = originalHeight ?? 0;
  const scaleX = effectiveOrigW > 0 ? thumbnailWidth / effectiveOrigW : 1;
  const thumbHeight = effectiveOrigH > 0 ? effectiveOrigH * scaleX : 0;

  // Convert viewport (PDF coords, bottom-left origin) to screen coords (top-left origin)
  const vpX = viewport.left * scaleX;
  const vpY = (effectiveOrigH - viewport.top) * scaleX;
  const vpW = (viewport.right - viewport.left) * scaleX;
  const vpH = (viewport.top - viewport.bottom) * scaleX;

  const handleClick = useCallback(
    (e: MouseEvent<HTMLButtonElement>) => {
      const btn = containerRef.current;
      if (!btn || effectiveOrigW <= 0 || effectiveOrigH <= 0) return;

      const rect = btn.getBoundingClientRect();
      const cssX = e.clientX - rect.left;
      const cssY = e.clientY - rect.top;

      // Convert click position to PDF page coordinates
      const pdfX = cssX / scaleX;
      const pdfY = effectiveOrigH - cssY / scaleX;

      // Centre the viewport on the click position, keeping dimensions
      const vpWidth = viewport.right - viewport.left;
      const vpHeight = viewport.top - viewport.bottom;
      const halfW = vpWidth / 2;
      const halfH = vpHeight / 2;

      // Clamp to page boundaries
      const left = Math.max(0, Math.min(pdfX - halfW, effectiveOrigW - vpWidth));
      const bottom = Math.max(0, Math.min(pdfY - halfH, effectiveOrigH - vpHeight));

      onViewportChange({
        left,
        top: bottom + vpHeight,
        right: left + vpWidth,
        bottom,
      });
    },
    [scaleX, effectiveOrigW, effectiveOrigH, viewport, onViewportChange],
  );

  return (
    <button
      type="button"
      ref={containerRef}
      aria-label={`Page ${pageIndex + 1} minimap navigator`}
      className={className}
      onClick={handleClick}
      style={{
        position: 'relative',
        display: 'block',
        width: thumbnailWidth,
        height: thumbHeight,
        cursor: 'crosshair',
        overflow: 'hidden',
        padding: 0,
        border: 'none',
        background: 'none',
        ...style,
      }}
    >
      <PDFCanvas
        width={bitmapWidth ?? 0}
        height={bitmapHeight ?? 0}
        renderKey={renderKey}
        aria-label={`Page ${pageIndex + 1} minimap`}
        style={{ width: thumbnailWidth, height: thumbHeight }}
      />
      {/* Viewport rectangle overlay */}
      <svg
        width={thumbnailWidth}
        height={thumbHeight}
        style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
        aria-hidden="true"
      >
        <rect
          x={vpX}
          y={vpY}
          width={vpW}
          height={vpH}
          fill="rgba(59, 130, 246, 0.15)"
          stroke="rgba(59, 130, 246, 0.8)"
          strokeWidth={2}
        />
      </svg>
    </button>
  );
}

export { PageNavigatorMinimap };
export type { PageNavigatorMinimapProps };
