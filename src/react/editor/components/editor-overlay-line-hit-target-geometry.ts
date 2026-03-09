import type { SerialisedAnnotation } from '../../../context/protocol.js';
import { pdfToScreen } from '../../coordinates.js';
import { getLineLikeEndpoints } from '../line-utils.js';
import {
  clampScreenRectToPageBounds,
  LINE_HIT_TARGET_PADDING_PX,
  MIN_HIT_TARGET_SIZE_PX,
} from './editor-overlay-hit-target-support.js';

export function buildLineHitTargetGeometry(
  annotation: SerialisedAnnotation,
  scale: number,
  originalHeight: number,
  pageWidth: number,
  pageHeight: number,
): {
  rect: { x: number; y: number; width: number; height: number };
  start: { x: number; y: number };
  end: { x: number; y: number };
} | null {
  const endpoints = getLineLikeEndpoints(annotation);
  if (!endpoints) {
    return null;
  }

  const start = pdfToScreen(endpoints.start, { scale, originalHeight });
  const end = pdfToScreen(endpoints.end, { scale, originalHeight });
  const left = Math.min(start.x, end.x) - LINE_HIT_TARGET_PADDING_PX;
  const top = Math.min(start.y, end.y) - LINE_HIT_TARGET_PADDING_PX;
  const right = Math.max(start.x, end.x) + LINE_HIT_TARGET_PADDING_PX;
  const bottom = Math.max(start.y, end.y) + LINE_HIT_TARGET_PADDING_PX;
  const rect = clampScreenRectToPageBounds(
    {
      x: left,
      y: top,
      width: Math.max(MIN_HIT_TARGET_SIZE_PX, right - left),
      height: Math.max(MIN_HIT_TARGET_SIZE_PX, bottom - top),
    },
    pageWidth,
    pageHeight,
  );

  return {
    rect,
    start: { x: start.x - rect.x, y: start.y - rect.y },
    end: { x: end.x - rect.x, y: end.y - rect.y },
  };
}
