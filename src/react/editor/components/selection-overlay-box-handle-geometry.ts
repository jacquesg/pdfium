import { HALF_HANDLE_VISUAL, HANDLE_HIT_PADDING, type HandlePosition } from './selection-overlay.types.js';

export function getHandleOffset(handle: HandlePosition, width: number, height: number): { x: number; y: number } {
  const xMap: Record<HandlePosition, number> = {
    nw: 0,
    n: width / 2,
    ne: width,
    e: width,
    se: width,
    s: width / 2,
    sw: 0,
    w: 0,
  };
  const yMap: Record<HandlePosition, number> = {
    nw: 0,
    n: 0,
    ne: 0,
    e: height / 2,
    se: height,
    s: height,
    sw: height,
    w: height / 2,
  };
  return {
    x: xMap[handle] - HALF_HANDLE_VISUAL - HANDLE_HIT_PADDING,
    y: yMap[handle] - HALF_HANDLE_VISUAL - HANDLE_HIT_PADDING,
  };
}
