import type { LineHandlePosition, ScreenLine } from '../components/selection-overlay.types.js';
import { MOUSE_DRAG_POINTER_ID } from '../components/selection-overlay.types.js';
import { createLineMoveSession, createLineResizeSession } from './selection-overlay-line-drag.js';
import { clonePreviewLine } from './selection-overlay-line-preview-snapshot.js';

type CaptureElement = Element | null;

function buildMouseLineSession(
  getPreviewLineSnapshot: () => ScreenLine | null,
  clientX: number,
  clientY: number,
  handle?: LineHandlePosition,
  captureElement: CaptureElement = null,
) {
  const previewLineSnapshot = clonePreviewLine(getPreviewLineSnapshot);
  if (previewLineSnapshot === null) {
    return null;
  }
  if (handle === undefined) {
    return createLineMoveSession(MOUSE_DRAG_POINTER_ID, captureElement, clientX, clientY, previewLineSnapshot);
  }
  return createLineResizeSession(MOUSE_DRAG_POINTER_ID, captureElement, clientX, clientY, previewLineSnapshot, handle);
}

export function buildMouseLineMoveSession(
  getPreviewLineSnapshot: () => ScreenLine | null,
  clientX: number,
  clientY: number,
) {
  return buildMouseLineSession(getPreviewLineSnapshot, clientX, clientY);
}

export function buildMouseLineResizeSession(
  getPreviewLineSnapshot: () => ScreenLine | null,
  clientX: number,
  clientY: number,
  handle: LineHandlePosition,
) {
  return buildMouseLineSession(getPreviewLineSnapshot, clientX, clientY, handle);
}
