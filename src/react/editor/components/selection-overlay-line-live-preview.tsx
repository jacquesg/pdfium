import type { ReactNode } from 'react';

interface SelectionOverlayLineLivePreviewProps {
  readonly lineLocalEnd: { x: number; y: number };
  readonly lineLocalStart: { x: number; y: number };
  readonly lineStrokeColour: string;
  readonly liveStrokeWidth: number;
  readonly showLivePreview: boolean;
}

export function SelectionOverlayLineLivePreview({
  lineLocalEnd,
  lineLocalStart,
  lineStrokeColour,
  liveStrokeWidth,
  showLivePreview,
}: SelectionOverlayLineLivePreviewProps): ReactNode {
  if (!showLivePreview) {
    return null;
  }

  return (
    <line
      data-testid="selection-shape-preview"
      x1={lineLocalStart.x}
      y1={lineLocalStart.y}
      x2={lineLocalEnd.x}
      y2={lineLocalEnd.y}
      stroke={lineStrokeColour}
      strokeWidth={liveStrokeWidth}
      strokeLinecap="round"
      pointerEvents="none"
    />
  );
}
