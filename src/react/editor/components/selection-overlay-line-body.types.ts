import type { MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent } from 'react';
import type { ScreenRect } from '../shape-constraints.js';
import type { ScreenLine } from './selection-overlay.types.js';

export interface SelectionLineBodyProps {
  readonly dragging: boolean;
  readonly interactive: boolean;
  readonly linePreview: ScreenLine;
  readonly lineStrokeColour: string;
  readonly liveStrokeWidth: number;
  readonly overlayRect: ScreenRect;
  readonly showLivePreview: boolean;
  readonly onBodyMouseDown: (event: ReactMouseEvent) => void;
  readonly onBodyPointerDown: (event: ReactPointerEvent) => void;
}
