import type { MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent } from 'react';
import type { ScreenRect } from '../shape-constraints.js';
import type {
  HandlePosition,
  LineHandlePosition,
  ScreenLine,
  SelectionOverlayAppearance,
} from './selection-overlay.types.js';

export interface SelectionOverlayContentProps {
  readonly appearance: SelectionOverlayAppearance;
  readonly boxFillColour: string;
  readonly boxStrokeColour: string;
  readonly dragging: boolean;
  readonly interactive: boolean;
  readonly lineStrokeColour: string;
  readonly liveStrokeWidth: number;
  readonly originalHeight: number;
  readonly overlayRect: ScreenRect;
  readonly previewLine: ScreenLine | null;
  readonly scale: number;
  readonly showLivePreview: boolean;
  readonly onBoxBodyMouseDown: (event: ReactMouseEvent) => void;
  readonly onBoxBodyPointerDown: (event: ReactPointerEvent) => void;
  readonly onBoxHandleMouseDown: (handle: HandlePosition, event: ReactMouseEvent) => void;
  readonly onBoxHandlePointerDown: (handle: HandlePosition, event: ReactPointerEvent) => void;
  readonly onLineBodyMouseDown: (event: ReactMouseEvent) => void;
  readonly onLineBodyPointerDown: (event: ReactPointerEvent) => void;
  readonly onLineHandleMouseDown: (handle: LineHandlePosition, event: ReactMouseEvent) => void;
  readonly onLineHandlePointerDown: (handle: LineHandlePosition, event: ReactPointerEvent) => void;
}
