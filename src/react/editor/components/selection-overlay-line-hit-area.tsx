import type { MouseEvent as ReactMouseEvent, ReactNode, PointerEvent as ReactPointerEvent } from 'react';
import { HANDLE_HIT_SIZE } from './selection-overlay.types.js';

interface SelectionOverlayLineHitAreaProps {
  readonly dragging: boolean;
  readonly interactive: boolean;
  readonly lineLocalEnd: { x: number; y: number };
  readonly lineLocalStart: { x: number; y: number };
  readonly liveStrokeWidth: number;
  readonly onBodyMouseDown: (event: ReactMouseEvent) => void;
  readonly onBodyPointerDown: (event: ReactPointerEvent) => void;
}

export function SelectionOverlayLineHitArea({
  dragging,
  interactive,
  lineLocalEnd,
  lineLocalStart,
  liveStrokeWidth,
  onBodyMouseDown,
  onBodyPointerDown,
}: SelectionOverlayLineHitAreaProps): ReactNode {
  return (
    <>
      {/* biome-ignore lint/a11y/useSemanticElements: SVG line body is a custom drag surface; there is no semantic SVG equivalent to a button here. */}
      <line
        data-testid="selection-body"
        role="button"
        aria-label="Move line annotation"
        tabIndex={-1}
        x1={lineLocalStart.x}
        y1={lineLocalStart.y}
        x2={lineLocalEnd.x}
        y2={lineLocalEnd.y}
        stroke="transparent"
        strokeWidth={Math.max(HANDLE_HIT_SIZE, liveStrokeWidth + 10)}
        strokeLinecap="round"
        pointerEvents={interactive ? 'stroke' : 'none'}
        style={{
          cursor: interactive ? (dragging ? 'grabbing' : 'grab') : 'default',
        }}
        onPointerDown={interactive ? onBodyPointerDown : undefined}
        onMouseDown={interactive ? onBodyMouseDown : undefined}
      />
    </>
  );
}
