import type { ReactNode } from 'react';
import { BOX_CURSOR_MAP, BOX_HANDLES } from './selection-overlay.types.js';
import type { SelectionBoxOverlayProps } from './selection-overlay-box-renderer.types.js';
import { getHandleOffset } from './selection-overlay-geometry.js';
import { SelectionHandle } from './selection-overlay-handle.js';

type SelectionBoxHandlesProps = Pick<
  SelectionBoxOverlayProps,
  'interactive' | 'overlayRect' | 'onHandleMouseDown' | 'onHandlePointerDown'
>;

export function SelectionBoxHandles({
  interactive,
  overlayRect,
  onHandleMouseDown,
  onHandlePointerDown,
}: SelectionBoxHandlesProps): ReactNode {
  return BOX_HANDLES.map((handle) => {
    const offset = getHandleOffset(handle, overlayRect.width, overlayRect.height);
    return (
      <SelectionHandle
        key={handle}
        dataTestId={`handle-${handle}`}
        cursor={BOX_CURSOR_MAP[handle]}
        interactive={interactive}
        left={offset.x}
        top={offset.y}
        onPointerDown={(event) => onHandlePointerDown(handle, event)}
        onMouseDown={(event) => onHandleMouseDown(handle, event)}
      />
    );
  });
}
