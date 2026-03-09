import {
  filterMinimumShapeDragEndCandidates,
  pickNearestShapeDragPoint,
} from './editor-test-shape-drag-points-support.js';
import type { ShapeDragPoint, ShapeDragSnapshot } from './editor-test-shape-drag-snapshot.js';

export interface ShapeDragPoints {
  readonly start: ShapeDragPoint;
  readonly end: ShapeDragPoint;
}

export function pickShapeDragPoints(snapshot: ShapeDragSnapshot | null): ShapeDragPoints | null {
  if (snapshot === null || snapshot.safePoints.length < 2) {
    return null;
  }
  const { left, top, right, bottom, safePoints } = snapshot;
  const width = right - left;
  const height = bottom - top;

  const start = pickNearestShapeDragPoint(left + width * 0.22, top + height * 0.22, safePoints);
  if (!start) {
    return null;
  }

  const minimumWidth = Math.max(30, width * 0.18);
  const minimumHeight = Math.max(20, height * 0.16);
  const endCandidates = filterMinimumShapeDragEndCandidates(start, safePoints, minimumWidth, minimumHeight);
  const end =
    pickNearestShapeDragPoint(left + width * 0.68, top + height * 0.58, endCandidates) ??
    pickNearestShapeDragPoint(left + width * 0.62, top + height * 0.52, endCandidates);

  if (!end) {
    return null;
  }

  return { start, end };
}
