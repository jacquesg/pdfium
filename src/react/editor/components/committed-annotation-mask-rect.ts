import type { Rect } from '../../../core/types.js';

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
