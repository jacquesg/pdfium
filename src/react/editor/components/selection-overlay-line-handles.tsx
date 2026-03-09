import type { MouseEvent as ReactMouseEvent, ReactNode, PointerEvent as ReactPointerEvent } from 'react';
import type { ScreenRect } from '../shape-constraints.js';
import type { LineHandlePosition, ScreenLine } from './selection-overlay.types.js';
import { getLineHandleOffset } from './selection-overlay-geometry.js';
import { SelectionHandle } from './selection-overlay-handle.js';

interface SelectionLineHandlesProps {
  readonly interactive: boolean;
  readonly linePreview: ScreenLine;
  readonly overlayRect: ScreenRect;
  readonly onHandleMouseDown: (handle: LineHandlePosition, event: ReactMouseEvent) => void;
  readonly onHandlePointerDown: (handle: LineHandlePosition, event: ReactPointerEvent) => void;
}

export function SelectionLineHandles({
  interactive,
  linePreview,
  overlayRect,
  onHandleMouseDown,
  onHandlePointerDown,
}: SelectionLineHandlesProps): ReactNode {
  return (
    <>
      <SelectionHandle
        dataTestId="handle-start"
        cursor="grab"
        interactive={interactive}
        left={getLineHandleOffset(linePreview.start, overlayRect).x}
        top={getLineHandleOffset(linePreview.start, overlayRect).y}
        onPointerDown={(event) => onHandlePointerDown('start', event)}
        onMouseDown={(event) => onHandleMouseDown('start', event)}
      />
      <SelectionHandle
        dataTestId="handle-end"
        cursor="grab"
        interactive={interactive}
        left={getLineHandleOffset(linePreview.end, overlayRect).x}
        top={getLineHandleOffset(linePreview.end, overlayRect).y}
        onPointerDown={(event) => onHandlePointerDown('end', event)}
        onMouseDown={(event) => onHandleMouseDown('end', event)}
      />
    </>
  );
}
