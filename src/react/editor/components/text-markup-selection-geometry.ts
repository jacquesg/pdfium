import type { Rect } from '../../../core/types.js';
import { screenToPdf } from '../../coordinates.js';

interface ResolveTextMarkupPdfRectsOptions {
  readonly containerRect: DOMRect;
  readonly height: number;
  readonly originalHeight: number;
  readonly range: Range;
  readonly scale: number;
  readonly width: number;
}

export interface TextMarkupPdfSelection {
  readonly boundingRect: Rect;
  readonly rects: readonly Rect[];
}

function collectPageClientRects(range: Range, containerRect: DOMRect): readonly DOMRect[] {
  return Array.from(range.getClientRects()).filter(
    (rect) =>
      rect.right > containerRect.left &&
      rect.left < containerRect.right &&
      rect.bottom > containerRect.top &&
      rect.top < containerRect.bottom &&
      rect.width > 0 &&
      rect.height > 0,
  );
}

export function resolveTextMarkupPdfSelection({
  containerRect,
  height,
  originalHeight,
  range,
  scale,
  width,
}: ResolveTextMarkupPdfRectsOptions): TextMarkupPdfSelection | null {
  const pageRects = collectPageClientRects(range, containerRect);
  if (pageRects.length === 0) {
    return null;
  }

  const rects = pageRects.map((rect) => {
    const topLeft = screenToPdf(
      { x: Math.max(0, rect.left - containerRect.left), y: Math.max(0, rect.top - containerRect.top) },
      { scale, originalHeight },
    );
    const bottomRight = screenToPdf(
      {
        x: Math.min(width, rect.right - containerRect.left),
        y: Math.min(height, rect.bottom - containerRect.top),
      },
      { scale, originalHeight },
    );
    return { left: topLeft.x, top: topLeft.y, right: bottomRight.x, bottom: bottomRight.y };
  });

  return {
    boundingRect: {
      left: Math.min(...rects.map((rect) => rect.left)),
      top: Math.max(...rects.map((rect) => rect.top)),
      right: Math.max(...rects.map((rect) => rect.right)),
      bottom: Math.min(...rects.map((rect) => rect.bottom)),
    },
    rects,
  };
}
