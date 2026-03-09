import type { DragState } from '../components/shape-creation-overlay.types.js';
import { applyConstrainedCreationPoint, clampScreenPoint } from '../shape-constraints.js';
import type { EditorTool } from '../types.js';
import type { ShapeCreationBounds } from './shape-creation-drag.types.js';

export function toShapeCreationBounds(options: ShapeCreationBounds): ShapeCreationBounds {
  return { width: options.width, height: options.height };
}

export function createShapeDragAtClientPosition(
  containerElement: HTMLDivElement | null,
  bounds: ShapeCreationBounds,
  clientPoint: { x: number; y: number },
): DragState | null {
  const rect = containerElement?.getBoundingClientRect();
  if (!rect) return null;
  const start = clampScreenPoint({ x: clientPoint.x - rect.left, y: clientPoint.y - rect.top }, bounds);
  return {
    startX: start.x,
    startY: start.y,
    currentX: start.x,
    currentY: start.y,
  };
}

export function updateShapeDragAtClientPosition(
  containerElement: HTMLDivElement | null,
  currentDrag: DragState,
  options: {
    readonly clientX: number;
    readonly clientY: number;
    readonly shiftKey: boolean;
    readonly tool: EditorTool;
  } & ShapeCreationBounds,
): DragState | null {
  const rect = containerElement?.getBoundingClientRect();
  if (!rect) return null;
  const next = applyConstrainedCreationPoint(
    options.tool,
    { x: currentDrag.startX, y: currentDrag.startY },
    { x: options.clientX - rect.left, y: options.clientY - rect.top },
    options.shiftKey,
    toShapeCreationBounds(options),
  );
  return {
    ...currentDrag,
    currentX: next.x,
    currentY: next.y,
  };
}

export function resolveShapeDragFallbackClientPoint(
  containerElement: HTMLDivElement | null,
  currentDrag: DragState,
): { clientX: number; clientY: number } {
  const rect = containerElement?.getBoundingClientRect();
  if (!rect) {
    return { clientX: currentDrag.currentX, clientY: currentDrag.currentY };
  }
  return {
    clientX: rect.left + currentDrag.currentX,
    clientY: rect.top + currentDrag.currentY,
  };
}
