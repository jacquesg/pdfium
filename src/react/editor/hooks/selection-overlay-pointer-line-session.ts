import type { LineHandlePosition, ScreenLine } from '../components/selection-overlay.types.js';
import { createLineMoveSession, createLineResizeSession } from './selection-overlay-line-drag.js';
import { clonePreviewLine } from './selection-overlay-line-preview-snapshot.js';

export function buildPointerLineMoveSession(
  getPreviewLineSnapshot: () => ScreenLine | null,
  pointerId: number,
  captureElement: Element,
  clientX: number,
  clientY: number,
) {
  const previewLineSnapshot = clonePreviewLine(getPreviewLineSnapshot);
  if (previewLineSnapshot === null) {
    return null;
  }
  return createLineMoveSession(pointerId, captureElement, clientX, clientY, previewLineSnapshot);
}

export function buildPointerLineResizeSession(
  getPreviewLineSnapshot: () => ScreenLine | null,
  pointerId: number,
  captureElement: Element,
  clientX: number,
  clientY: number,
  handle: LineHandlePosition,
) {
  const previewLineSnapshot = clonePreviewLine(getPreviewLineSnapshot);
  if (previewLineSnapshot === null) {
    return null;
  }
  return createLineResizeSession(pointerId, captureElement, clientX, clientY, previewLineSnapshot, handle);
}
