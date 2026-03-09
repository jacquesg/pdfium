import {
  type BoxAppearance,
  type BoxResizeDragSession,
  type HandlePosition,
  MIN_RESIZE_SIZE,
} from '../components/selection-overlay.types.js';
import { getBoxHandlePoint, resizeScreenRectFromHandle, type ScreenRect } from '../shape-constraints.js';

export function createBoxResizeSession(
  pointerId: number,
  captureElement: Element | null,
  clientX: number,
  clientY: number,
  screenRect: ScreenRect,
  handle: HandlePosition,
): BoxResizeDragSession {
  return {
    pointerId,
    captureElement,
    x: clientX,
    y: clientY,
    screenRect,
    mode: 'resize',
    handle,
  };
}

export function applyBoxResizeAtClientPosition(
  session: BoxResizeDragSession,
  clientX: number,
  clientY: number,
  appearance: BoxAppearance,
  maxWidth: number,
  maxHeight: number,
  shiftKey: boolean,
): ScreenRect {
  const dx = clientX - session.x;
  const dy = clientY - session.y;
  const handleOrigin = getBoxHandlePoint(session.screenRect, session.handle);
  const handlePoint = {
    x: handleOrigin.x + dx,
    y: handleOrigin.y + dy,
  };

  return resizeScreenRectFromHandle(
    session.screenRect,
    session.handle,
    handlePoint,
    { width: maxWidth, height: maxHeight },
    {
      lockAspectRatio: shiftKey && (appearance.kind === 'rectangle' || appearance.kind === 'ellipse'),
      minSize: MIN_RESIZE_SIZE,
    },
  );
}
