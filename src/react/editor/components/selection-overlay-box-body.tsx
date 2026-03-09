import type { ReactNode } from 'react';
import type { SelectionBoxBodyProps } from './selection-overlay-box-body.types.js';
import { buildSelectionBoxBodySurfaceProps } from './selection-overlay-box-body-style.js';
import { SelectionBoxBodySurface } from './selection-overlay-box-body-surface.js';
import { SelectionBoxLivePreview } from './selection-overlay-box-live-preview.js';

export function SelectionBoxBody({
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
}: SelectionBoxBodyProps): ReactNode {
  const surfaceProps = buildSelectionBoxBodySurfaceProps({
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
  });

  return (
    <SelectionBoxBodySurface {...surfaceProps}>
      {showLivePreview ? (
        <SelectionBoxLivePreview
          appearance={appearance}
          boxFillColour={boxFillColour}
          boxStrokeColour={boxStrokeColour}
          liveStrokeWidth={liveStrokeWidth}
          overlayRect={overlayRect}
        />
      ) : null}
    </SelectionBoxBodySurface>
  );
}
