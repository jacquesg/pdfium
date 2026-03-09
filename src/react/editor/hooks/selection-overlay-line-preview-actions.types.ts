import type { LineDragSession, ScreenLine } from '../components/selection-overlay.types.js';

export interface UseSelectionOverlayLinePreviewActionsOptions {
  readonly getPreviewLineSnapshot: () => ScreenLine | null;
  readonly maxHeight: number;
  readonly maxWidth: number;
  readonly onMove?: ((newRect: { left: number; top: number; right: number; bottom: number }) => void) | undefined;
  readonly onMoveLine?:
    | ((nextLine: { start: { x: number; y: number }; end: { x: number; y: number } }) => void)
    | undefined;
  readonly onPreviewLine?:
    | ((previewLine: { start: { x: number; y: number }; end: { x: number; y: number } }) => void)
    | undefined;
  readonly onResize?: ((newRect: { left: number; top: number; right: number; bottom: number }) => void) | undefined;
  readonly onResizeLine?:
    | ((nextLine: { start: { x: number; y: number }; end: { x: number; y: number } }) => void)
    | undefined;
  readonly originalHeight: number;
  readonly scale: number;
  readonly setPreviewLineValue: (screenLine: ScreenLine | null) => void;
}

export interface SelectionOverlayLinePreviewActionsResult {
  readonly applyLineDragPreview: (
    session: LineDragSession,
    clientX: number,
    clientY: number,
    modifiers?: { shiftKey?: boolean },
  ) => void;
  readonly finishLinePreviewSession: (session: LineDragSession) => void;
}
