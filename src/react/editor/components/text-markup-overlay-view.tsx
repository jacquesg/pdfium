import type { ReactNode, RefObject } from 'react';

interface TextMarkupOverlayViewProps {
  readonly containerRef: RefObject<HTMLDivElement | null>;
  readonly height: number;
  readonly width: number;
}

export function TextMarkupOverlayView({ containerRef, height, width }: TextMarkupOverlayViewProps): ReactNode {
  return (
    <div
      ref={containerRef}
      data-testid="text-markup-overlay"
      style={{
        position: 'absolute',
        inset: 0,
        width,
        height,
        pointerEvents: 'none',
      }}
    />
  );
}
