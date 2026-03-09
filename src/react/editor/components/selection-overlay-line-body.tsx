import type { ReactNode } from 'react';
import type { SelectionLineBodyProps } from './selection-overlay-line-body.types.js';
import { resolveSelectionLineLocalPoints } from './selection-overlay-line-body-geometry.js';
import { SelectionOverlayLineHitArea } from './selection-overlay-line-hit-area.js';
import { SelectionOverlayLineLivePreview } from './selection-overlay-line-live-preview.js';

export function SelectionLineBody({
  dragging,
  interactive,
  linePreview,
  lineStrokeColour,
  liveStrokeWidth,
  overlayRect,
  showLivePreview,
  onBodyMouseDown,
  onBodyPointerDown,
}: SelectionLineBodyProps): ReactNode {
  const { lineLocalEnd, lineLocalStart } = resolveSelectionLineLocalPoints(linePreview, overlayRect);

  return (
    <svg
      aria-hidden="true"
      focusable="false"
      style={{
        position: 'absolute',
        inset: 0,
        overflow: 'visible',
      }}
    >
      <SelectionOverlayLineLivePreview
        lineLocalEnd={lineLocalEnd}
        lineLocalStart={lineLocalStart}
        lineStrokeColour={lineStrokeColour}
        liveStrokeWidth={liveStrokeWidth}
        showLivePreview={showLivePreview}
      />
      <SelectionOverlayLineHitArea
        dragging={dragging}
        interactive={interactive}
        lineLocalEnd={lineLocalEnd}
        lineLocalStart={lineLocalStart}
        liveStrokeWidth={liveStrokeWidth}
        onBodyMouseDown={onBodyMouseDown}
        onBodyPointerDown={onBodyPointerDown}
      />
    </svg>
  );
}
