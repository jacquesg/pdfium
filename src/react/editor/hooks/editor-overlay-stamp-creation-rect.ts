import type { Rect } from '../../../core/types.js';
import { screenToPdf } from '../../coordinates.js';
import { STAMP_HALF_SIZE } from './editor-overlay-action-support.js';

export function buildStampAnnotationRect({
  originalHeight,
  point,
  scale,
}: {
  readonly originalHeight: number;
  readonly point: { x: number; y: number };
  readonly scale: number;
}): Rect {
  const topLeft = screenToPdf(
    { x: point.x - STAMP_HALF_SIZE, y: point.y - STAMP_HALF_SIZE },
    { scale, originalHeight },
  );
  const bottomRight = screenToPdf(
    { x: point.x + STAMP_HALF_SIZE, y: point.y + STAMP_HALF_SIZE },
    { scale, originalHeight },
  );

  return {
    left: topLeft.x,
    top: topLeft.y,
    right: bottomRight.x,
    bottom: bottomRight.y,
  };
}
