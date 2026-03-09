import type { ReactNode } from 'react';
import type { SelectionOverlayContentProps } from './selection-overlay-content.types.js';
import { SelectionLineOverlay } from './selection-overlay-renderers.js';

export function SelectionOverlayLineContent({
  appearance,
  dragging,
  interactive,
  lineStrokeColour,
  liveStrokeWidth,
  overlayRect,
  previewLine,
  showLivePreview,
  onLineBodyMouseDown,
  onLineBodyPointerDown,
  onLineHandleMouseDown,
  onLineHandlePointerDown,
}: SelectionOverlayContentProps): ReactNode {
  if (appearance.kind !== 'line' || previewLine === null) {
    return null;
  }

  return (
    <SelectionLineOverlay
      dragging={dragging}
      interactive={interactive}
      linePreview={previewLine}
      lineStrokeColour={lineStrokeColour}
      liveStrokeWidth={liveStrokeWidth}
      overlayRect={overlayRect}
      showLivePreview={showLivePreview}
      onBodyMouseDown={onLineBodyMouseDown}
      onBodyPointerDown={onLineBodyPointerDown}
      onHandleMouseDown={onLineHandleMouseDown}
      onHandlePointerDown={onLineHandlePointerDown}
    />
  );
}
