import type { ReactNode } from 'react';
import { SelectionBoxBody } from './selection-overlay-box-body.js';
import { SelectionBoxHandles } from './selection-overlay-box-handles.js';
import type { SelectionBoxOverlayProps } from './selection-overlay-box-renderer.types.js';

export type { SelectionBoxOverlayProps } from './selection-overlay-box-renderer.types.js';

export function SelectionBoxOverlay({
  appearance,
  boxFillColour,
  boxStrokeColour,
  dragging,
  interactive,
  liveStrokeWidth,
  overlayRect,
  showLivePreview,
  onBodyMouseDown,
  onBodyPointerDown,
  onHandleMouseDown,
  onHandlePointerDown,
}: SelectionBoxOverlayProps): ReactNode {
  return (
    <>
      <SelectionBoxBody
        appearance={appearance}
        boxFillColour={boxFillColour}
        boxStrokeColour={boxStrokeColour}
        dragging={dragging}
        interactive={interactive}
        liveStrokeWidth={liveStrokeWidth}
        overlayRect={overlayRect}
        showLivePreview={showLivePreview}
        onBodyMouseDown={onBodyMouseDown}
        onBodyPointerDown={onBodyPointerDown}
      />
      <SelectionBoxHandles
        interactive={interactive}
        overlayRect={overlayRect}
        onHandleMouseDown={onHandleMouseDown}
        onHandlePointerDown={onHandlePointerDown}
      />
    </>
  );
}
