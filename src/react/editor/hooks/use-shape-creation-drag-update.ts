import { useCallback } from 'react';
import { updateShapeDragAtClientPosition } from './shape-creation-drag-support.js';
import type { UseShapeCreationDragActionsOptions } from './use-shape-creation-drag-actions.types.js';

type UseShapeCreationDragUpdateOptions = Pick<
  UseShapeCreationDragActionsOptions,
  'containerRef' | 'dragRef' | 'height' | 'publishDrag' | 'tool' | 'width'
>;

export function useShapeCreationDragUpdate({
  containerRef,
  dragRef,
  height,
  publishDrag,
  tool,
  width,
}: UseShapeCreationDragUpdateOptions) {
  return useCallback(
    (clientX: number, clientY: number, shiftKey: boolean) => {
      const currentDrag = dragRef.current;
      if (currentDrag === null) {
        return;
      }
      const nextDrag = updateShapeDragAtClientPosition(containerRef.current, currentDrag, {
        clientX,
        clientY,
        height,
        shiftKey,
        tool,
        width,
      });
      if (nextDrag === null) {
        return;
      }
      publishDrag(nextDrag);
    },
    [containerRef, dragRef, height, publishDrag, tool, width],
  );
}
