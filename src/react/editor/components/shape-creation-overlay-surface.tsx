import type { ReactNode } from 'react';
import { ShapeCreationOverlayPreview } from './shape-creation-overlay-preview.js';
import type { ShapeCreationOverlaySurfaceProps } from './shape-creation-overlay-surface.types.js';
import { getShapeCreationOverlaySurfaceStyle } from './shape-creation-overlay-surface-style.js';

export function ShapeCreationOverlaySurface({
  drag,
  height,
  onLostPointerCapture,
  onMouseDown,
  onMouseMove,
  onMouseUp,
  onPointerCancel,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  strokeColour,
  strokeWidth,
  tool,
  width,
  surfaceRef,
}: ShapeCreationOverlaySurfaceProps): ReactNode {
  return (
    <div
      ref={surfaceRef}
      data-testid="shape-creation-overlay"
      role="application"
      aria-label="Shape creation overlay"
      tabIndex={-1}
      style={getShapeCreationOverlaySurfaceStyle(width, height)}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      onLostPointerCapture={onLostPointerCapture}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
    >
      <ShapeCreationOverlayPreview
        drag={drag}
        tool={tool}
        width={width}
        height={height}
        strokeColour={strokeColour}
        strokeWidth={strokeWidth}
      />
    </div>
  );
}
