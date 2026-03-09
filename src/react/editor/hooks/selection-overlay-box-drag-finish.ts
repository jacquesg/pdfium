import type { BoxDragSession } from '../components/selection-overlay.types.js';
import { isSameRect, screenRectToPdfRect } from '../components/selection-overlay-geometry.js';
import type { ScreenRect } from '../shape-constraints.js';

interface FinishBoxDragSessionOptions {
  readonly previewRect: ScreenRect;
  readonly scale: number;
  readonly originalHeight: number;
  readonly onMove?: ((newRect: { left: number; top: number; right: number; bottom: number }) => void) | undefined;
  readonly onResize?: ((newRect: { left: number; top: number; right: number; bottom: number }) => void) | undefined;
}

export function finishBoxDragSession(
  session: BoxDragSession,
  { previewRect, scale, originalHeight, onMove, onResize }: FinishBoxDragSessionOptions,
): void {
  const oldRect = screenRectToPdfRect(session.screenRect, scale, originalHeight);
  const newRect = screenRectToPdfRect(previewRect, scale, originalHeight);
  if (isSameRect(oldRect, newRect)) {
    return;
  }
  if (session.mode === 'move') {
    onMove?.(newRect);
    return;
  }
  onResize?.(newRect);
}
