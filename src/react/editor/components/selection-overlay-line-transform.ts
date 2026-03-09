import { clampScreenPoint, type ScreenPoint } from '../shape-constraints.js';
import type { LineHandlePosition, ScreenLine } from './selection-overlay.types.js';

export function translateScreenLine(
  line: ScreenLine,
  dx: number,
  dy: number,
  maxWidth: number,
  maxHeight: number,
): ScreenLine {
  const minX = Math.min(line.start.x, line.end.x);
  const minY = Math.min(line.start.y, line.end.y);
  const maxX = Math.max(line.start.x, line.end.x);
  const maxY = Math.max(line.start.y, line.end.y);
  const allowedDx = Number.isFinite(maxWidth) ? clamp(dx, -minX, maxWidth - maxX) : dx;
  const allowedDy = Number.isFinite(maxHeight) ? clamp(dy, -minY, maxHeight - maxY) : dy;

  return {
    start: { x: line.start.x + allowedDx, y: line.start.y + allowedDy },
    end: { x: line.end.x + allowedDx, y: line.end.y + allowedDy },
  };
}

export function setScreenLineEndpoint(
  line: ScreenLine,
  handle: LineHandlePosition,
  point: ScreenPoint,
  maxWidth: number,
  maxHeight: number,
): ScreenLine {
  const clampedPoint = clampScreenPoint(point, { width: maxWidth, height: maxHeight });
  return handle === 'start' ? { start: clampedPoint, end: line.end } : { start: line.start, end: clampedPoint };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
