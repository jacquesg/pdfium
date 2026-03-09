import type { MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent, RefObject } from 'react';
import type { EditorTool } from '../types.js';
import type { DragState } from './shape-creation-overlay.types.js';

export interface ShapeCreationOverlaySurfaceProps {
  readonly drag: DragState | null;
  readonly height: number;
  readonly onLostPointerCapture: () => void;
  readonly onMouseDown: (event: ReactMouseEvent) => void;
  readonly onMouseMove: (event: ReactMouseEvent) => void;
  readonly onMouseUp: (event: ReactMouseEvent) => void;
  readonly onPointerCancel: (event: ReactPointerEvent) => void;
  readonly onPointerDown: (event: ReactPointerEvent) => void;
  readonly onPointerMove: (event: ReactPointerEvent) => void;
  readonly onPointerUp: (event: ReactPointerEvent) => void;
  readonly strokeColour: string;
  readonly strokeWidth: number;
  readonly surfaceRef: RefObject<HTMLDivElement | null>;
  readonly tool: EditorTool;
  readonly width: number;
}
