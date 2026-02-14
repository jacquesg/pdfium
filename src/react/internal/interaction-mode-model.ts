import type { ZoomAnchor } from '../hooks/use-visible-pages.js';

export interface MarqueeRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PanDragStart {
  x: number;
  y: number;
  scrollLeft: number;
  scrollTop: number;
}

interface MarqueeZoomInput {
  rect: MarqueeRect;
  scale: number;
  containerWidth: number;
  containerHeight: number;
  containerScrollLeft: number;
  containerScrollTop: number;
}

interface MarqueeZoomResolution {
  newScale: number;
  anchor: ZoomAnchor;
  targetScrollLeft: number;
  targetScrollTop: number;
}

const MIN_MARQUEE_SIZE = 5;
const INTERACTION_CSS_ID = 'pdfium-interaction-css';

function injectInteractionCss(): void {
  if (typeof document === 'undefined') return;
  if (document.getElementById(INTERACTION_CSS_ID)) return;

  const style = document.createElement('style');
  style.id = INTERACTION_CSS_ID;
  style.textContent = [
    '[data-pdfium-interaction="pan"] .pdfium-text-layer { pointer-events: none !important; user-select: none !important; cursor: inherit !important; }',
    '[data-pdfium-interaction="pan"] a { pointer-events: none !important; cursor: inherit !important; }',
    '[data-pdfium-interaction="marquee"] .pdfium-text-layer { pointer-events: none !important; user-select: none !important; cursor: inherit !important; }',
    '[data-pdfium-interaction="marquee"] a { pointer-events: none !important; cursor: inherit !important; }',
  ].join('\n');
  document.head.appendChild(style);
}

function resolvePanScrollPosition(dragStart: PanDragStart, clientX: number, clientY: number) {
  const dx = clientX - dragStart.x;
  const dy = clientY - dragStart.y;
  return {
    scrollLeft: dragStart.scrollLeft - dx,
    scrollTop: dragStart.scrollTop - dy,
  };
}

function createMarqueeRect(originX: number, originY: number, clientX: number, clientY: number): MarqueeRect {
  return {
    x: Math.min(originX, clientX),
    y: Math.min(originY, clientY),
    width: Math.abs(clientX - originX),
    height: Math.abs(clientY - originY),
  };
}

function resolveMarqueeZoom(input: MarqueeZoomInput): MarqueeZoomResolution | null {
  const { rect, scale, containerWidth, containerHeight, containerScrollLeft, containerScrollTop } = input;
  if (rect.width < MIN_MARQUEE_SIZE || rect.height < MIN_MARQUEE_SIZE) return null;
  if (containerWidth <= 0 || containerHeight <= 0 || scale <= 0) return null;

  const newScale = Math.min(containerWidth / rect.width, containerHeight / rect.height) * scale;
  const ratio = newScale / scale;

  const marqueeCentreContentX = rect.x + rect.width / 2 + containerScrollLeft;
  const marqueeCentreContentY = rect.y + rect.height / 2 + containerScrollTop;

  return {
    newScale,
    anchor: {
      cursorX: containerWidth / 2,
      cursorY: containerHeight / 2,
      scrollLeft: marqueeCentreContentX - containerWidth / 2,
      scrollTop: marqueeCentreContentY - containerHeight / 2,
      ratio,
    },
    targetScrollLeft: marqueeCentreContentX * ratio - containerWidth / 2,
    targetScrollTop: marqueeCentreContentY * ratio - containerHeight / 2,
  };
}

export { createMarqueeRect, injectInteractionCss, resolveMarqueeZoom, resolvePanScrollPosition };
export type { MarqueeZoomInput, MarqueeZoomResolution };
