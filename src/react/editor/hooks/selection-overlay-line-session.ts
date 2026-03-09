import type {
  LineHandlePosition,
  LineMoveDragSession,
  LineResizeDragSession,
  ScreenLine,
} from '../components/selection-overlay.types.js';

export function cloneScreenLine(line: ScreenLine): ScreenLine {
  return {
    start: { ...line.start },
    end: { ...line.end },
  };
}

export function createLineMoveSession(
  pointerId: number,
  captureElement: Element | null,
  clientX: number,
  clientY: number,
  screenLine: ScreenLine,
): LineMoveDragSession {
  return {
    pointerId,
    captureElement,
    x: clientX,
    y: clientY,
    screenLine,
    mode: 'line-move',
  };
}

export function createLineResizeSession(
  pointerId: number,
  captureElement: Element | null,
  clientX: number,
  clientY: number,
  screenLine: ScreenLine,
  handle: LineHandlePosition,
): LineResizeDragSession {
  return {
    pointerId,
    captureElement,
    x: clientX,
    y: clientY,
    screenLine,
    mode: 'line-resize',
    handle,
  };
}
