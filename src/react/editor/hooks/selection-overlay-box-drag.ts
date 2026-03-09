import type { BoxAppearance, BoxDragSession } from '../components/selection-overlay.types.js';
import type { ScreenRect } from '../shape-constraints.js';
import { finishBoxDragSession } from './selection-overlay-box-drag-finish.js';
import { applyBoxMoveAtClientPosition, createBoxMoveSession } from './selection-overlay-box-move.js';
import { applyBoxResizeAtClientPosition, createBoxResizeSession } from './selection-overlay-box-resize.js';

export { finishBoxDragSession, createBoxMoveSession, createBoxResizeSession };

export function applyBoxDragAtClientPosition(
  session: BoxDragSession,
  clientX: number,
  clientY: number,
  appearance: BoxAppearance,
  maxWidth: number,
  maxHeight: number,
  shiftKey: boolean,
): ScreenRect {
  if (session.mode === 'move') {
    return applyBoxMoveAtClientPosition(session, clientX, clientY, maxWidth, maxHeight);
  }

  return applyBoxResizeAtClientPosition(session, clientX, clientY, appearance, maxWidth, maxHeight, shiftKey);
}
