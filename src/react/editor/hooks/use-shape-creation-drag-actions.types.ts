import type { RefObject } from 'react';
import type { Rect } from '../../../core/types.js';
import type { DragState, ShapeCreateDetail } from '../components/shape-creation-overlay.types.js';
import type { EditorTool } from '../types.js';
import type { ShapeCreationBounds } from './shape-creation-drag.types.js';

export interface UseShapeCreationDragActionsOptions extends ShapeCreationBounds {
  readonly containerRef: RefObject<HTMLDivElement | null>;
  readonly dragRef: RefObject<DragState | null>;
  readonly onCreate?: ((rect: Rect, detail?: ShapeCreateDetail) => void) | undefined;
  readonly originalHeight: number;
  readonly publishDrag: (nextDrag: DragState | null) => void;
  readonly scale: number;
  readonly strokeWidth: number;
  readonly tool: EditorTool;
}
