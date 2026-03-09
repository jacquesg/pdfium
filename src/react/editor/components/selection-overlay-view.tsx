import type { ReactNode } from 'react';
import type { SelectionOverlayControllerResult } from '../hooks/use-selection-overlay-controller.js';
import { SelectionOverlayContent } from './selection-overlay-content.js';
import { SelectionOverlayRoot } from './selection-overlay-root.js';

interface SelectionOverlayViewProps {
  readonly controller: SelectionOverlayControllerResult;
}

export function SelectionOverlayView({ controller }: SelectionOverlayViewProps): ReactNode {
  return (
    <SelectionOverlayRoot
      rootStyle={controller.rootStyle}
      onPointerMove={controller.handlePointerMove}
      onPointerUp={controller.handlePointerUp}
      onPointerCancel={controller.handlePointerCancel}
      onLostPointerCapture={controller.handleLostPointerCapture}
    >
      <SelectionOverlayContent
        appearance={controller.appearance}
        boxFillColour={controller.boxFillColour}
        boxStrokeColour={controller.boxStrokeColour}
        dragging={controller.dragging}
        interactive={controller.interactive}
        lineStrokeColour={controller.lineStrokeColour}
        liveStrokeWidth={controller.liveStrokeWidth}
        originalHeight={controller.originalHeight}
        overlayRect={controller.overlayRect}
        previewLine={controller.previewLine}
        scale={controller.scale}
        showLivePreview={controller.showLivePreview}
        onBoxBodyMouseDown={controller.handleBoxBodyMouseDown}
        onBoxBodyPointerDown={controller.handleBoxBodyPointerDown}
        onBoxHandleMouseDown={controller.handleBoxHandleMouseDown}
        onBoxHandlePointerDown={controller.handleBoxHandlePointerDown}
        onLineBodyMouseDown={controller.handleLineBodyMouseDown}
        onLineBodyPointerDown={controller.handleLineBodyPointerDown}
        onLineHandleMouseDown={controller.handleLineHandleMouseDown}
        onLineHandlePointerDown={controller.handleLineHandlePointerDown}
      />
    </SelectionOverlayRoot>
  );
}
