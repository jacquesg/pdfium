import type { BoxMoveDragSession } from '../components/selection-overlay.types.js';
import type { ScreenRect } from '../shape-constraints.js';

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function createBoxMoveSession(
  pointerId: number,
  captureElement: Element | null,
  clientX: number,
  clientY: number,
  screenRect: ScreenRect,
): BoxMoveDragSession {
  return {
    pointerId,
    captureElement,
    x: clientX,
    y: clientY,
    screenRect,
    mode: 'move',
  };
}

export function applyBoxMoveAtClientPosition(
  session: BoxMoveDragSession,
  clientX: number,
  clientY: number,
  maxWidth: number,
  maxHeight: number,
): ScreenRect {
  const dx = clientX - session.x;
  const dy = clientY - session.y;
  const maxX = Number.isFinite(maxWidth) ? Math.max(0, maxWidth - session.screenRect.width) : Number.POSITIVE_INFINITY;
  const maxY = Number.isFinite(maxHeight)
    ? Math.max(0, maxHeight - session.screenRect.height)
    : Number.POSITIVE_INFINITY;

  return {
    x: clamp(session.screenRect.x + dx, 0, maxX),
    y: clamp(session.screenRect.y + dy, 0, maxY),
    width: session.screenRect.width,
    height: session.screenRect.height,
  };
}
