import type { MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent } from 'react';
import type { ScreenRect } from '../shape-constraints.js';
import type { BoxAppearance, HandlePosition } from './selection-overlay.types.js';

export interface SelectionBoxOverlayProps {
  readonly appearance: BoxAppearance;
  readonly boxFillColour: string;
  readonly boxStrokeColour: string;
  readonly dragging: boolean;
  readonly interactive: boolean;
  readonly liveStrokeWidth: number;
  readonly overlayRect: ScreenRect;
  readonly showLivePreview: boolean;
  readonly onBodyMouseDown: (event: ReactMouseEvent) => void;
  readonly onBodyPointerDown: (event: ReactPointerEvent) => void;
  readonly onHandleMouseDown: (handle: HandlePosition, event: ReactMouseEvent) => void;
  readonly onHandlePointerDown: (handle: HandlePosition, event: ReactPointerEvent) => void;
}
