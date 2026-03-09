import type { PointerEvent as ReactPointerEvent } from 'react';

export interface UseShapeCreationPointerHandlersResult {
  readonly handleLostPointerCapture: () => void;
  readonly handlePointerCancel: (event: ReactPointerEvent) => void;
  readonly handlePointerDown: (event: ReactPointerEvent) => void;
  readonly handlePointerMove: (event: ReactPointerEvent) => void;
  readonly handlePointerUp: (event: ReactPointerEvent) => void;
}
