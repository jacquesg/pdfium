/**
 * Shared geometry constraints for shape creation and resizing.
 *
 * Keeps creation and transform semantics aligned:
 * - rectangle/circle: Shift constrains to 1:1
 * - line: Shift snaps to 45-degree increments
 *
 * @module react/editor/shape-constraints
 */

export { clampScreenPoint } from './shape-constraint-support.js';
export type { BoxResizeHandle, ScreenBounds, ScreenPoint, ScreenRect } from './shape-constraints.types.js';
export { applyConstrainedCreationPoint } from './shape-creation-constraints.js';
export { getBoxHandlePoint, resizeScreenRectFromHandle } from './shape-resize-constraints.js';
