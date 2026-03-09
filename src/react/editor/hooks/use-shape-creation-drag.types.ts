import type { MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent, RefObject } from 'react';
import type { Rect } from '../../../core/types.js';
import type { DragState, ShapeCreateDetail } from '../components/shape-creation-overlay.types.js';
import type { EditorTool } from '../types.js';

export interface UseShapeCreationDragResult {
  readonly containerRef: RefObject<HTMLDivElement | null>;
  readonly drag: DragState | null;
  readonly handleLostPointerCapture: () => void;
  readonly handleMouseDown: (event: ReactMouseEvent) => void;
  readonly handleMouseMove: (event: ReactMouseEvent) => void;
  readonly handleMouseUp: (event: ReactMouseEvent) => void;
  readonly handlePointerCancel: (event: ReactPointerEvent) => void;
  readonly handlePointerDown: (event: ReactPointerEvent) => void;
  readonly handlePointerMove: (event: ReactPointerEvent) => void;
  readonly handlePointerUp: (event: ReactPointerEvent) => void;
}

export interface UseShapeCreationDragOptions {
  readonly height: number;
  readonly onCreate?: ((rect: Rect, detail?: ShapeCreateDetail) => void) | undefined;
  readonly originalHeight: number;
  readonly scale: number;
  readonly strokeWidth: number;
  readonly tool: EditorTool;
  readonly width: number;
}
