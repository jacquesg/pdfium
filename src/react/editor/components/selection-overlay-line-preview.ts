import type { Point } from '../../../core/types.js';
import { pdfToScreen } from '../../coordinates.js';
import { clampScreenPoint, type ScreenPoint } from '../shape-constraints.js';
import { DEFAULT_STROKE_PREVIEW_COLOUR, type ScreenLine } from './selection-overlay.types.js';

export function buildInitialLinePreview(
  endpoints: { start: Point; end: Point },
  scale: number,
  originalHeight: number,
  maxWidth: number,
  maxHeight: number,
): ScreenLine {
  const screenLine = {
    start: pdfToScreen(endpoints.start, { scale, originalHeight }),
    end: pdfToScreen(endpoints.end, { scale, originalHeight }),
  };

  return {
    start: clampScreenPoint(screenLine.start, { width: maxWidth, height: maxHeight }),
    end: clampScreenPoint(screenLine.end, { width: maxWidth, height: maxHeight }),
  };
}

export function midpoint(a: ScreenPoint, b: ScreenPoint): ScreenPoint {
  return {
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2,
  };
}

export function buildSquigglyPath(start: ScreenPoint, end: ScreenPoint): string {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const length = Math.hypot(dx, dy);
  if (length <= 0.01) {
    return `M ${start.x} ${start.y} L ${end.x} ${end.y}`;
  }

  const step = 6;
  const amplitude = 1.8;
  const ux = dx / length;
  const uy = dy / length;
  const px = -uy;
  const py = ux;
  const segmentCount = Math.max(2, Math.round(length / step));
  let path = `M ${start.x} ${start.y}`;
  for (let index = 1; index < segmentCount; index++) {
    const t = index / segmentCount;
    const baseX = start.x + dx * t;
    const baseY = start.y + dy * t;
    const direction = index % 2 === 0 ? -1 : 1;
    path += ` L ${baseX + px * amplitude * direction} ${baseY + py * amplitude * direction}`;
  }
  path += ` L ${end.x} ${end.y}`;
  return path;
}

export { DEFAULT_STROKE_PREVIEW_COLOUR };
