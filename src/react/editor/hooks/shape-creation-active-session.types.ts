import type { MutableRefObject } from 'react';

export interface UseShapeCreationActiveSessionOptions {
  readonly clearDrag: () => void;
  readonly finishDragAtClientPosition: (clientX: number, clientY: number, shiftKey: boolean) => void;
  readonly startDragAtClientPosition: (clientX: number, clientY: number) => boolean;
  readonly updateDragAtClientPosition: (clientX: number, clientY: number, shiftKey: boolean) => void;
}

export interface UseShapeCreationActiveSessionResult {
  readonly activePointerIdRef: MutableRefObject<number | null>;
  readonly captureElementRef: MutableRefObject<Element | null>;
  readonly finishActiveDrag: (pointerId: number, clientX: number, clientY: number, shiftKey: boolean) => void;
  readonly resetDragLifecycle: (pointerId?: number) => void;
  readonly startDrag: (pointerId: number, captureElement: Element | null, clientX: number, clientY: number) => void;
  readonly updateActiveDrag: (pointerId: number, clientX: number, clientY: number, shiftKey: boolean) => void;
}
