import type { ScreenRect } from '../shape-constraints.js';
import {
  HALF_HANDLE_VISUAL,
  HANDLE_HIT_PADDING,
  LINE_INTERACTION_PADDING,
  type ScreenLine,
} from './selection-overlay.types.js';

export function getLineBounds(line: ScreenLine): ScreenRect {
  return {
    x: Math.min(line.start.x, line.end.x),
    y: Math.min(line.start.y, line.end.y),
    width: Math.max(0, Math.abs(line.end.x - line.start.x)),
    height: Math.max(0, Math.abs(line.end.y - line.start.y)),
  };
}

export function getLineOverlayRect(line: ScreenLine, maxWidth: number, maxHeight: number): ScreenRect {
  const bounds = getLineBounds(line);
  const left = Number.isFinite(maxWidth)
    ? clamp(bounds.x - LINE_INTERACTION_PADDING, 0, maxWidth)
    : bounds.x - LINE_INTERACTION_PADDING;
  const top = Number.isFinite(maxHeight)
    ? clamp(bounds.y - LINE_INTERACTION_PADDING, 0, maxHeight)
    : bounds.y - LINE_INTERACTION_PADDING;
  const right = Number.isFinite(maxWidth)
    ? clamp(bounds.x + bounds.width + LINE_INTERACTION_PADDING, left, maxWidth)
    : bounds.x + bounds.width + LINE_INTERACTION_PADDING;
  const bottom = Number.isFinite(maxHeight)
    ? clamp(bounds.y + bounds.height + LINE_INTERACTION_PADDING, top, maxHeight)
    : bounds.y + bounds.height + LINE_INTERACTION_PADDING;

  return {
    x: left,
    y: top,
    width: Math.max(1, right - left),
    height: Math.max(1, bottom - top),
  };
}

export function getLineHandleOffset(
  point: { x: number; y: number },
  overlayRect: ScreenRect,
): { x: number; y: number } {
  return {
    x: point.x - overlayRect.x - HALF_HANDLE_VISUAL - HANDLE_HIT_PADDING,
    y: point.y - overlayRect.y - HALF_HANDLE_VISUAL - HANDLE_HIT_PADDING,
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
