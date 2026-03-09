import type { SerialisedQuadPoints } from '../../../context/protocol.js';
import type { Colour, Rect } from '../../../core/types.js';

function normaliseRect(rect: Rect): Rect {
  return {
    left: Math.min(rect.left, rect.right),
    top: Math.max(rect.top, rect.bottom),
    right: Math.max(rect.left, rect.right),
    bottom: Math.min(rect.top, rect.bottom),
  };
}

function rectToQuadPoints(rect: Rect): SerialisedQuadPoints {
  const normalised = normaliseRect(rect);
  return {
    // QuadPoints contract: bottom-left, bottom-right, top-left, top-right.
    x1: normalised.left,
    y1: normalised.bottom,
    x2: normalised.right,
    y2: normalised.bottom,
    x3: normalised.left,
    y3: normalised.top,
    x4: normalised.right,
    y4: normalised.top,
  };
}

export function buildTextMarkupCreationRequest(
  rects: readonly Rect[],
  boundingRect: Rect,
  colour?: Colour,
): { bounds: Rect; options: { quadPoints: SerialisedQuadPoints[]; colour?: Colour } } | null {
  if (rects.length === 0) return null;

  return {
    bounds: normaliseRect(boundingRect),
    options: colour ? { quadPoints: rects.map(rectToQuadPoints), colour } : { quadPoints: rects.map(rectToQuadPoints) },
  };
}
