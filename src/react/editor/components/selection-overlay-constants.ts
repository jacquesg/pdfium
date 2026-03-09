import type { BoxResizeHandle } from '../shape-constraints.js';

export const HANDLE_VISUAL_SIZE = 8;
export const HANDLE_HIT_SIZE = 20;
export const HALF_HANDLE_VISUAL = HANDLE_VISUAL_SIZE / 2;
export const HANDLE_HIT_PADDING = (HANDLE_HIT_SIZE - HANDLE_VISUAL_SIZE) / 2;
export const MIN_RESIZE_SIZE = 10;
export const MOUSE_DRAG_POINTER_ID = -1;
export const RECT_EPSILON = 0.01;
export const LINE_INTERACTION_PADDING = 12;
export const DEFAULT_STROKE_PREVIEW_COLOUR = 'rgba(15, 23, 42, 0.78)';
export const DEFAULT_HANDLE_BORDER_COLOUR = 'rgba(15, 23, 42, 0.78)';
export const DEFAULT_HANDLE_FILL_COLOUR = '#ffffff';
export const DEFAULT_BOUNDS_BORDER_COLOUR = 'rgba(15, 23, 42, 0.24)';
export const DEFAULT_DISABLED_BOUNDS_BORDER_COLOUR = 'rgba(15, 23, 42, 0.28)';
export const DEFAULT_DISABLED_BOUNDS_BACKGROUND = 'rgba(15, 23, 42, 0.03)';
export const DEFAULT_MARKUP_SELECTION_STROKE = 'rgba(15, 23, 42, 0.34)';
export const DEFAULT_MARKUP_SELECTION_FILL = 'rgba(15, 23, 42, 0.06)';

export type HandlePosition = BoxResizeHandle;
export type LineHandlePosition = 'start' | 'end';

export const BOX_HANDLES: readonly HandlePosition[] = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];

export const BOX_CURSOR_MAP: Record<HandlePosition, string> = {
  nw: 'nwse-resize',
  n: 'ns-resize',
  ne: 'nesw-resize',
  e: 'ew-resize',
  se: 'nwse-resize',
  s: 'ns-resize',
  sw: 'nesw-resize',
  w: 'ew-resize',
};
