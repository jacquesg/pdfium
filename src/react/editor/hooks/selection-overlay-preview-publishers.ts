import type { ScreenLine } from '../components/selection-overlay.types.js';
import { screenPointToPdfPoint, screenRectToPdfRect } from '../components/selection-overlay-geometry.js';
import type { ScreenRect } from '../shape-constraints.js';

export function publishRectPreview(
  screenRect: ScreenRect,
  scale: number,
  originalHeight: number,
  onPreviewRect?: ((previewRect: { left: number; top: number; right: number; bottom: number }) => void) | undefined,
): void {
  onPreviewRect?.(screenRectToPdfRect(screenRect, scale, originalHeight));
}

export function publishLinePreview(
  screenLine: ScreenLine,
  scale: number,
  originalHeight: number,
  onPreviewLine?:
    | ((previewLine: { start: { x: number; y: number }; end: { x: number; y: number } }) => void)
    | undefined,
): void {
  if (!onPreviewLine) {
    return;
  }
  onPreviewLine({
    start: screenPointToPdfPoint(screenLine.start, scale, originalHeight),
    end: screenPointToPdfPoint(screenLine.end, scale, originalHeight),
  });
}
