import type { LineDragSession, ScreenLine } from '../components/selection-overlay.types.js';
import { setScreenLineEndpoint, translateScreenLine } from '../components/selection-overlay-geometry.js';
import { applyConstrainedCreationPoint } from '../shape-constraints.js';

export function applyLineDragAtClientPosition(
  session: LineDragSession,
  clientX: number,
  clientY: number,
  maxWidth: number,
  maxHeight: number,
  shiftKey: boolean,
): ScreenLine {
  const dx = clientX - session.x;
  const dy = clientY - session.y;

  if (session.mode === 'line-move') {
    return translateScreenLine(session.screenLine, dx, dy, maxWidth, maxHeight);
  }

  const nextPoint = {
    x: session.handle === 'start' ? session.screenLine.start.x + dx : session.screenLine.end.x + dx,
    y: session.handle === 'start' ? session.screenLine.start.y + dy : session.screenLine.end.y + dy,
  };
  const anchorPoint = session.handle === 'start' ? session.screenLine.end : session.screenLine.start;
  const constrainedPoint = applyConstrainedCreationPoint('line', anchorPoint, nextPoint, shiftKey, {
    width: maxWidth,
    height: maxHeight,
  });
  return setScreenLineEndpoint(session.screenLine, session.handle, constrainedPoint, maxWidth, maxHeight);
}
