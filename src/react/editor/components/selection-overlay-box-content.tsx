import type { ReactNode } from 'react';
import type { SelectionOverlayContentProps } from './selection-overlay-content.types.js';
import { SelectionBoxOverlay } from './selection-overlay-renderers.js';

export function SelectionOverlayBoxContent({
  appearance,
  boxFillColour,
  boxStrokeColour,
  dragging,
  interactive,
  liveStrokeWidth,
  overlayRect,
  showLivePreview,
  onBoxBodyMouseDown,
  onBoxBodyPointerDown,
  onBoxHandleMouseDown,
  onBoxHandlePointerDown,
}: SelectionOverlayContentProps): ReactNode {
  if (appearance.kind === 'line' || appearance.kind === 'text-markup') {
    return null;
  }

  return (
    <SelectionBoxOverlay
      appearance={appearance}
      boxFillColour={boxFillColour}
      boxStrokeColour={boxStrokeColour}
      dragging={dragging}
      interactive={interactive}
      liveStrokeWidth={liveStrokeWidth}
      overlayRect={overlayRect}
      showLivePreview={showLivePreview}
      onBodyMouseDown={onBoxBodyMouseDown}
      onBodyPointerDown={onBoxBodyPointerDown}
      onHandleMouseDown={onBoxHandleMouseDown}
      onHandlePointerDown={onBoxHandlePointerDown}
    />
  );
}
