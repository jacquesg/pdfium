import type { Point, Rect } from '../../../core/types.js';

export function buildFallbackLineRect(start: Point, end: Point, strokeWidth: number, scale: number): Rect {
  const minSpan = Math.max(2 / Math.max(scale, 0.01), strokeWidth);
  let left = Math.min(start.x, end.x);
  let right = Math.max(start.x, end.x);
  let bottom = Math.min(start.y, end.y);
  let top = Math.max(start.y, end.y);
  if (right - left < minSpan) {
    const midX = (left + right) / 2;
    left = midX - minSpan / 2;
    right = midX + minSpan / 2;
  }
  if (top - bottom < minSpan) {
    const midY = (top + bottom) / 2;
    bottom = midY - minSpan / 2;
    top = midY + minSpan / 2;
  }
  return { left, top, right, bottom };
}
