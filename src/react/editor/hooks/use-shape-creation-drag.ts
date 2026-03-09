import type { UseShapeCreationDragOptions, UseShapeCreationDragResult } from './use-shape-creation-drag.types.js';
import { useShapeCreationDragRuntime } from './use-shape-creation-drag-runtime.js';

export function useShapeCreationDrag(options: UseShapeCreationDragOptions): UseShapeCreationDragResult {
  return useShapeCreationDragRuntime(options);
}

export type { UseShapeCreationDragOptions, UseShapeCreationDragResult } from './use-shape-creation-drag.types.js';
