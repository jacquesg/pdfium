import type { DragSession, ScreenLine, SelectionOverlayAppearance } from '../components/selection-overlay.types.js';
import type { ScreenRect } from '../shape-constraints.js';

export interface UseSelectionOverlayPreviewStateOptions {
  readonly appearance: SelectionOverlayAppearance;
  readonly maxHeight: number;
  readonly maxWidth: number;
  readonly onMove?: ((newRect: { left: number; top: number; right: number; bottom: number }) => void) | undefined;
  readonly onMoveLine?:
    | ((nextLine: { start: { x: number; y: number }; end: { x: number; y: number } }) => void)
    | undefined;
  readonly onPreviewClear?: (() => void) | undefined;
  readonly onPreviewLine?:
    | ((previewLine: { start: { x: number; y: number }; end: { x: number; y: number } }) => void)
    | undefined;
  readonly onPreviewRect?:
    | ((previewRect: { left: number; top: number; right: number; bottom: number }) => void)
    | undefined;
  readonly onResize?: ((newRect: { left: number; top: number; right: number; bottom: number }) => void) | undefined;
  readonly onResizeLine?:
    | ((nextLine: { start: { x: number; y: number }; end: { x: number; y: number } }) => void)
    | undefined;
  readonly originalHeight: number;
  readonly rect: { left: number; top: number; right: number; bottom: number };
  readonly scale: number;
}

export interface UseSelectionOverlayPreviewStateResult {
  readonly applyDragAtClientPosition: (
    session: DragSession,
    clientX: number,
    clientY: number,
    modifiers?: { shiftKey?: boolean },
  ) => void;
  readonly cancelDragSession: (session: DragSession | null) => void;
  readonly finishDragSession: (session: DragSession) => void;
  readonly getPreviewLineSnapshot: () => ScreenLine | null;
  readonly getPreviewRectSnapshot: () => ScreenRect;
  readonly previewLine: ScreenLine | null;
  readonly previewRect: ScreenRect;
  readonly syncPreviewFromInputs: () => void;
}
