import type { ShapeDragPoint } from './editor-test-shape-drag-snapshot.js';

export function pickNearestShapeDragPoint(
  targetX: number,
  targetY: number,
  points: ShapeDragPoint[],
): ShapeDragPoint | null {
  let bestPoint: ShapeDragPoint | null = null;
  let bestDistanceSq = Number.POSITIVE_INFINITY;

  for (const point of points) {
    const dx = point.x - targetX;
    const dy = point.y - targetY;
    const distanceSq = dx * dx + dy * dy;
    if (distanceSq < bestDistanceSq) {
      bestDistanceSq = distanceSq;
      bestPoint = point;
    }
  }

  return bestPoint;
}

export function filterMinimumShapeDragEndCandidates(
  start: ShapeDragPoint,
  points: ShapeDragPoint[],
  minimumWidth: number,
  minimumHeight: number,
): ShapeDragPoint[] {
  return points.filter((point) => {
    return point.x - start.x >= minimumWidth && point.y - start.y >= minimumHeight;
  });
}
