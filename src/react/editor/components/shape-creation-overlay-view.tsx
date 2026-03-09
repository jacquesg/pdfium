import type { ReactNode } from 'react';
import type { ShapeCreationOverlayControllerResult } from '../hooks/use-shape-creation-overlay-controller.js';
import { ShapeCreationOverlaySurface } from './shape-creation-overlay-surface.js';

interface ShapeCreationOverlayViewProps {
  readonly controller: ShapeCreationOverlayControllerResult;
}

export function ShapeCreationOverlayView({ controller }: ShapeCreationOverlayViewProps): ReactNode {
  return (
    <ShapeCreationOverlaySurface
      drag={controller.drag}
      height={controller.height}
      onLostPointerCapture={controller.handleLostPointerCapture}
      onMouseDown={controller.handleMouseDown}
      onMouseMove={controller.handleMouseMove}
      onMouseUp={controller.handleMouseUp}
      onPointerCancel={controller.handlePointerCancel}
      onPointerDown={controller.handlePointerDown}
      onPointerMove={controller.handlePointerMove}
      onPointerUp={controller.handlePointerUp}
      strokeColour={controller.strokeColour}
      strokeWidth={controller.strokeWidth}
      surfaceRef={controller.containerRef}
      tool={controller.tool}
      width={controller.width}
    />
  );
}
