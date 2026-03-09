import type { MutableRefObject, MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent } from 'react';

export interface UseShapeCreationPointerLifecycleOptions {
  readonly clearDrag: () => void;
  readonly finishDragAtClientPosition: (clientX: number, clientY: number, shiftKey: boolean) => void;
  readonly resolveUnmountFallbackClientPoint: () => { clientX: number; clientY: number } | null;
  readonly startDragAtClientPosition: (clientX: number, clientY: number) => boolean;
  readonly updateDragAtClientPosition: (clientX: number, clientY: number, shiftKey: boolean) => void;
}

export interface ShapeCreationDragSessionActions {
  readonly activePointerIdRef: MutableRefObject<number | null>;
  readonly captureElementRef: MutableRefObject<Element | null>;
  readonly finishActiveDrag: (pointerId: number, clientX: number, clientY: number, shiftKey: boolean) => void;
  readonly resetDragLifecycle: (pointerId?: number) => void;
  readonly startDrag: (pointerId: number, captureElement: Element | null, clientX: number, clientY: number) => void;
  readonly updateActiveDrag: (pointerId: number, clientX: number, clientY: number, shiftKey: boolean) => void;
}

export interface UseShapeCreationPointerLifecycleResult {
  readonly handleLostPointerCapture: () => void;
  readonly handleMouseDown: (event: ReactMouseEvent) => void;
  readonly handleMouseMove: (event: ReactMouseEvent) => void;
  readonly handleMouseUp: (event: ReactMouseEvent) => void;
  readonly handlePointerCancel: (event: ReactPointerEvent) => void;
  readonly handlePointerDown: (event: ReactPointerEvent) => void;
  readonly handlePointerMove: (event: ReactPointerEvent) => void;
  readonly handlePointerUp: (event: ReactPointerEvent) => void;
}
