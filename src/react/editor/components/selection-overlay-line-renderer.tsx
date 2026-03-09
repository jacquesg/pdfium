import type { MouseEvent as ReactMouseEvent, ReactNode, PointerEvent as ReactPointerEvent } from 'react';
import type { ScreenRect } from '../shape-constraints.js';
import type { LineHandlePosition, ScreenLine } from './selection-overlay.types.js';
import { SelectionLineBody } from './selection-overlay-line-body.js';
import { SelectionLineHandles } from './selection-overlay-line-handles.js';

interface SelectionLineOverlayProps {
  readonly dragging: boolean;
  readonly interactive: boolean;
  readonly linePreview: ScreenLine;
  readonly lineStrokeColour: string;
  readonly liveStrokeWidth: number;
  readonly overlayRect: ScreenRect;
  readonly showLivePreview: boolean;
  readonly onBodyMouseDown: (event: ReactMouseEvent) => void;
  readonly onBodyPointerDown: (event: ReactPointerEvent) => void;
  readonly onHandleMouseDown: (handle: LineHandlePosition, event: ReactMouseEvent) => void;
  readonly onHandlePointerDown: (handle: LineHandlePosition, event: ReactPointerEvent) => void;
}

export function SelectionLineOverlay({
  dragging,
  interactive,
  linePreview,
  lineStrokeColour,
  liveStrokeWidth,
  overlayRect,
  showLivePreview,
  onBodyMouseDown,
  onBodyPointerDown,
  onHandleMouseDown,
  onHandlePointerDown,
}: SelectionLineOverlayProps): ReactNode {
  return (
    <>
      <SelectionLineBody
        dragging={dragging}
        interactive={interactive}
        linePreview={linePreview}
        lineStrokeColour={lineStrokeColour}
        liveStrokeWidth={liveStrokeWidth}
        overlayRect={overlayRect}
        showLivePreview={showLivePreview}
        onBodyMouseDown={onBodyMouseDown}
        onBodyPointerDown={onBodyPointerDown}
      />
      <SelectionLineHandles
        interactive={interactive}
        linePreview={linePreview}
        overlayRect={overlayRect}
        onHandleMouseDown={onHandleMouseDown}
        onHandlePointerDown={onHandlePointerDown}
      />
    </>
  );
}
