export type {
  CompletedShapeCreation,
  ShapeCreationBounds,
  ShapeCreationCompletionOptions,
} from './shape-creation-drag.types.js';
export { completeShapeCreationDrag } from './shape-creation-drag-completion.js';
export {
  createShapeDragAtClientPosition,
  resolveShapeDragFallbackClientPoint,
  toShapeCreationBounds,
  updateShapeDragAtClientPosition,
} from './shape-creation-drag-geometry.js';
export {
  isPenOrTouchPointerType,
  isSecondaryMouseButton,
  MOUSE_DRAG_POINTER_ID,
  releasePointerCaptureIfHeld,
  setPointerCaptureIfSupported,
} from './shape-creation-pointer-capture.js';
