import type { ScreenRect } from '../shape-constraints.js';
import type { ScreenLine } from './selection-overlay-appearance.types.js';
import type { HandlePosition, LineHandlePosition } from './selection-overlay-constants.js';

export interface BoxMoveDragSession {
  pointerId: number;
  captureElement: Element | null;
  x: number;
  y: number;
  screenRect: ScreenRect;
  mode: 'move';
}

export interface BoxResizeDragSession {
  pointerId: number;
  captureElement: Element | null;
  x: number;
  y: number;
  screenRect: ScreenRect;
  mode: 'resize';
  handle: HandlePosition;
}

export interface LineMoveDragSession {
  pointerId: number;
  captureElement: Element | null;
  x: number;
  y: number;
  screenLine: ScreenLine;
  mode: 'line-move';
}

export interface LineResizeDragSession {
  pointerId: number;
  captureElement: Element | null;
  x: number;
  y: number;
  screenLine: ScreenLine;
  mode: 'line-resize';
  handle: LineHandlePosition;
}

export type BoxDragSession = BoxMoveDragSession | BoxResizeDragSession;
export type LineDragSession = LineMoveDragSession | LineResizeDragSession;
export type DragSession = BoxMoveDragSession | BoxResizeDragSession | LineMoveDragSession | LineResizeDragSession;
