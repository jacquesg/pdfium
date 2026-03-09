import type { BoxResizeHandle, ScreenPoint, ScreenRect } from './shape-constraints.types.js';

export function getBoxHandlePoint(rect: ScreenRect, handle: BoxResizeHandle): ScreenPoint {
  const right = rect.x + rect.width;
  const bottom = rect.y + rect.height;
  const centerX = rect.x + rect.width / 2;
  const centerY = rect.y + rect.height / 2;

  const xMap: Record<BoxResizeHandle, number> = {
    nw: rect.x,
    n: centerX,
    ne: right,
    e: right,
    se: right,
    s: centerX,
    sw: rect.x,
    w: rect.x,
  };
  const yMap: Record<BoxResizeHandle, number> = {
    nw: rect.y,
    n: rect.y,
    ne: rect.y,
    e: centerY,
    se: bottom,
    s: bottom,
    sw: bottom,
    w: centerY,
  };

  return {
    x: xMap[handle],
    y: yMap[handle],
  };
}
