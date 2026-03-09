import { MIN_HIT_TARGET_SIZE_PX } from './editor-overlay-hit-target.constants.js';

export function expandScreenRectForHitTarget(
  rect: { x: number; y: number; width: number; height: number },
  minSizePx = MIN_HIT_TARGET_SIZE_PX,
): { x: number; y: number; width: number; height: number } {
  const width = Math.max(rect.width, minSizePx);
  const height = Math.max(rect.height, minSizePx);

  return {
    x: rect.x - (width - rect.width) / 2,
    y: rect.y - (height - rect.height) / 2,
    width,
    height,
  };
}

export function clampScreenRectToPageBounds(
  rect: { x: number; y: number; width: number; height: number },
  pageWidth: number,
  pageHeight: number,
): { x: number; y: number; width: number; height: number } {
  const maxWidth = Math.max(0, pageWidth);
  const maxHeight = Math.max(0, pageHeight);
  const left = clamp(rect.x, 0, maxWidth);
  const top = clamp(rect.y, 0, maxHeight);
  const right = clamp(rect.x + rect.width, left, maxWidth);
  const bottom = clamp(rect.y + rect.height, top, maxHeight);

  return {
    x: left,
    y: top,
    width: Math.max(0, right - left),
    height: Math.max(0, bottom - top),
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
