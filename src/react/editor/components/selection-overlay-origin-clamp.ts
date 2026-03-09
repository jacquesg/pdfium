import type { ScreenRect } from '../shape-constraints.js';

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function clampScreenRectOrigin(screenRect: ScreenRect, maxWidth: number, maxHeight: number): ScreenRect {
  const maxX = Number.isFinite(maxWidth) ? Math.max(0, maxWidth - screenRect.width) : Number.POSITIVE_INFINITY;
  const maxY = Number.isFinite(maxHeight) ? Math.max(0, maxHeight - screenRect.height) : Number.POSITIVE_INFINITY;
  return {
    ...screenRect,
    x: clamp(screenRect.x, 0, maxX),
    y: clamp(screenRect.y, 0, maxY),
  };
}
