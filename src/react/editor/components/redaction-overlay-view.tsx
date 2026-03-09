import type { ReactNode } from 'react';
import type { RedactionOverlayRect } from './redaction-overlay-support.js';

interface RedactionOverlayViewProps {
  readonly height: number;
  readonly rects: readonly RedactionOverlayRect[];
  readonly width: number;
}

const PATTERN_ID = 'redaction-hatch';

export function RedactionOverlayView({ height, rects, width }: RedactionOverlayViewProps): ReactNode {
  return (
    <svg
      data-testid="redaction-overlay"
      role="img"
      aria-label="Pending redactions"
      style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
      width={width}
      height={height}
    >
      <title>Pending redactions</title>
      <defs>
        <pattern id={PATTERN_ID} patternUnits="userSpaceOnUse" width={8} height={8}>
          <path d="M-1,1 l2,-2 M0,8 l8,-8 M7,9 l2,-2" stroke="#cc0000" strokeWidth={1.5} />
        </pattern>
      </defs>
      {rects.map((rect) => (
        <rect
          key={rect.index}
          data-testid={`redaction-rect-${rect.index}`}
          x={rect.x}
          y={rect.y}
          width={rect.width}
          height={rect.height}
          fill={`url(#${PATTERN_ID})`}
          stroke="#cc0000"
          strokeWidth={1}
          opacity={0.6}
        />
      ))}
    </svg>
  );
}
