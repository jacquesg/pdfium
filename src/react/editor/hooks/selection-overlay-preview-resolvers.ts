import { pdfRectToScreen } from '../../coordinates.js';
import type { BoxAppearance, ScreenLine, SelectionOverlayAppearance } from '../components/selection-overlay.types.js';
import { buildInitialLinePreview, clampScreenRectOrigin } from '../components/selection-overlay-geometry.js';
import type { ScreenRect } from '../shape-constraints.js';

interface SelectionOverlayPreviewGeometryOptions {
  readonly appearance: SelectionOverlayAppearance;
  readonly maxHeight: number;
  readonly maxWidth: number;
  readonly originalHeight: number;
  readonly rect: { left: number; top: number; right: number; bottom: number };
  readonly scale: number;
}

export function resolveBoxAppearance(appearance: SelectionOverlayAppearance): BoxAppearance {
  if (appearance.kind === 'bounds' || appearance.kind === 'rectangle' || appearance.kind === 'ellipse') {
    return appearance;
  }
  return { kind: 'bounds' };
}

export function buildResolvedPreviewRect({
  maxHeight,
  maxWidth,
  originalHeight,
  rect,
  scale,
}: Omit<SelectionOverlayPreviewGeometryOptions, 'appearance'>): ScreenRect {
  return clampScreenRectOrigin(pdfRectToScreen(rect, { scale, originalHeight }), maxWidth, maxHeight);
}

export function buildResolvedPreviewLine({
  appearance,
  maxHeight,
  maxWidth,
  originalHeight,
  scale,
}: Omit<SelectionOverlayPreviewGeometryOptions, 'rect'>): ScreenLine | null {
  return appearance.kind === 'line'
    ? buildInitialLinePreview(appearance.endpoints, scale, originalHeight, maxWidth, maxHeight)
    : null;
}
