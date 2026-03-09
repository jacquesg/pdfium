import { clampScreenPoint } from './shape-constraint-support.js';
import type { ScreenBounds, ScreenPoint } from './shape-constraints.types.js';
import { snapLineEndpoint } from './shape-creation-snapped-line-endpoint.js';
import { constrainSquareFromDynamicQuadrant } from './shape-creation-square-point.js';
import type { EditorTool } from './types.js';

export function applyConstrainedCreationPoint(
  tool: EditorTool,
  start: ScreenPoint,
  current: ScreenPoint,
  shiftKey: boolean,
  bounds: ScreenBounds,
): ScreenPoint {
  if (!shiftKey) {
    return clampScreenPoint(current, bounds);
  }

  if (tool === 'rectangle' || tool === 'circle') {
    return constrainSquareFromDynamicQuadrant(start, current, bounds);
  }

  if (tool === 'line') {
    return snapLineEndpoint(start, current, bounds);
  }

  return clampScreenPoint(current, bounds);
}
