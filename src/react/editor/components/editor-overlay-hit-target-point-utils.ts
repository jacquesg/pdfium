import type { SerialisedAnnotation } from '../../../context/protocol.js';
import { pdfToScreen } from '../../coordinates.js';

export function quadToScreenPoints(
  quad: NonNullable<SerialisedAnnotation['attachmentPoints']>[number],
  scale: number,
  originalHeight: number,
): [{ x: number; y: number }, { x: number; y: number }, { x: number; y: number }, { x: number; y: number }] {
  return [
    pdfToScreen({ x: quad.x1, y: quad.y1 }, { scale, originalHeight }),
    pdfToScreen({ x: quad.x2, y: quad.y2 }, { scale, originalHeight }),
    pdfToScreen({ x: quad.x3, y: quad.y3 }, { scale, originalHeight }),
    pdfToScreen({ x: quad.x4, y: quad.y4 }, { scale, originalHeight }),
  ];
}

export function screenPointsToRect(points: readonly { x: number; y: number }[]): {
  x: number;
  y: number;
  width: number;
  height: number;
} {
  const xValues = points.map((point) => point.x);
  const yValues = points.map((point) => point.y);
  const left = Math.min(...xValues);
  const right = Math.max(...xValues);
  const top = Math.min(...yValues);
  const bottom = Math.max(...yValues);

  return {
    x: left,
    y: top,
    width: Math.max(0, right - left),
    height: Math.max(0, bottom - top),
  };
}

export function midpoint(a: { x: number; y: number }, b: { x: number; y: number }): { x: number; y: number } {
  return {
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2,
  };
}
