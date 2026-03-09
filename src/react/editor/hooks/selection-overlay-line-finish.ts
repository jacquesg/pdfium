import type { LineDragSession, ScreenLine } from '../components/selection-overlay.types.js';
import { isSamePoint, screenLineToPdfRect, screenPointToPdfPoint } from '../components/selection-overlay-geometry.js';

export interface FinishLineDragSessionOptions {
  readonly previewLine: ScreenLine | null;
  readonly scale: number;
  readonly originalHeight: number;
  readonly onMove?: ((newRect: { left: number; top: number; right: number; bottom: number }) => void) | undefined;
  readonly onResize?: ((newRect: { left: number; top: number; right: number; bottom: number }) => void) | undefined;
  readonly onMoveLine?:
    | ((nextLine: { start: { x: number; y: number }; end: { x: number; y: number } }) => void)
    | undefined;
  readonly onResizeLine?:
    | ((nextLine: { start: { x: number; y: number }; end: { x: number; y: number } }) => void)
    | undefined;
}

export function finishLineDragSession(
  session: LineDragSession,
  { previewLine, scale, originalHeight, onMove, onResize, onMoveLine, onResizeLine }: FinishLineDragSessionOptions,
): void {
  if (previewLine === null) {
    return;
  }

  const oldLine = {
    start: screenPointToPdfPoint(session.screenLine.start, scale, originalHeight),
    end: screenPointToPdfPoint(session.screenLine.end, scale, originalHeight),
  };
  const newLine = {
    start: screenPointToPdfPoint(previewLine.start, scale, originalHeight),
    end: screenPointToPdfPoint(previewLine.end, scale, originalHeight),
  };
  const lineChanged = !isSamePoint(oldLine.start, newLine.start) || !isSamePoint(oldLine.end, newLine.end);
  if (!lineChanged) {
    return;
  }

  if (session.mode === 'line-move') {
    if (onMoveLine) {
      onMoveLine(newLine);
      return;
    }
    onMove?.(screenLineToPdfRect(previewLine, scale, originalHeight));
    return;
  }

  if (onResizeLine) {
    onResizeLine(newLine);
    return;
  }
  onResize?.(screenLineToPdfRect(previewLine, scale, originalHeight));
}
