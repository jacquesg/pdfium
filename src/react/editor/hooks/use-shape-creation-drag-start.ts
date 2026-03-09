import { useCallback } from 'react';
import { createShapeDragAtClientPosition } from './shape-creation-drag-support.js';
import type { UseShapeCreationDragActionsOptions } from './use-shape-creation-drag-actions.types.js';

type UseShapeCreationDragStartOptions = Pick<
  UseShapeCreationDragActionsOptions,
  'containerRef' | 'height' | 'publishDrag' | 'width'
>;

export function useShapeCreationDragStart({
  containerRef,
  height,
  publishDrag,
  width,
}: UseShapeCreationDragStartOptions) {
  return useCallback(
    (clientX: number, clientY: number): boolean => {
      const nextDrag = createShapeDragAtClientPosition(
        containerRef.current,
        { width, height },
        { x: clientX, y: clientY },
      );
      if (nextDrag === null) {
        return false;
      }
      publishDrag(nextDrag);
      return true;
    },
    [containerRef, height, publishDrag, width],
  );
}
