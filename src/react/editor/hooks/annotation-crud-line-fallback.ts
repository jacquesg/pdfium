import type { SerialisedAnnotation } from '../../../context/protocol.js';
import type { Colour, Rect } from '../../../core/types.js';
import { getLineLikeEndpoints } from '../line-utils.js';
import { coloursEqual, pointsEqual, rectsEqual, strokeWidthsEqual } from './annotation-crud-comparisons.js';

export function normaliseStrokeWidth(value: number): number {
  if (!Number.isFinite(value)) {
    return 1;
  }

  return Math.max(0.25, value);
}

export function lineFallbackMatchesSnapshot(
  snapshot: SerialisedAnnotation,
  rect: Rect,
  start: { x: number; y: number },
  end: { x: number; y: number },
  strokeColour: Colour,
  resolvedStrokeWidth: number,
): boolean {
  const currentEndpoints = getLineLikeEndpoints(snapshot);
  const sameGeometry =
    rectsEqual(snapshot.bounds, rect) &&
    currentEndpoints !== undefined &&
    pointsEqual(currentEndpoints.start, start) &&
    pointsEqual(currentEndpoints.end, end);
  const sameStrokeColour = coloursEqual(snapshot.colour.stroke ?? strokeColour, strokeColour);
  const sameStrokeWidth = strokeWidthsEqual(snapshot.border?.borderWidth ?? resolvedStrokeWidth, resolvedStrokeWidth);

  return sameGeometry && sameStrokeColour && sameStrokeWidth;
}
