import type { Rect } from '../../../core/types.js';
import type { DragState, ShapeCreateDetail } from '../components/shape-creation-overlay.types.js';
import type { EditorTool } from '../types.js';

export interface ShapeCreationBounds {
  readonly width: number;
  readonly height: number;
}

export interface ShapeCreationCompletionOptions extends ShapeCreationBounds {
  readonly clientX: number;
  readonly clientY: number;
  readonly currentDrag: DragState;
  readonly originalHeight: number;
  readonly scale: number;
  readonly shiftKey: boolean;
  readonly strokeWidth: number;
  readonly tool: EditorTool;
}

export interface CompletedShapeCreation {
  readonly rect: Rect;
  readonly detail?: ShapeCreateDetail;
}
