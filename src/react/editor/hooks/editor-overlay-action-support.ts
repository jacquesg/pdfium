import type { PointerEvent as ReactPointerEvent } from 'react';
import { AnnotationType, type Rect } from '../../../core/types.js';
import { screenToPdf } from '../../coordinates.js';
import { getUnknownErrorMessage } from '../redaction-utils.js';

export const TEXT_MARKUP_TYPE_MAP = {
  highlight: AnnotationType.Highlight,
  underline: AnnotationType.Underline,
  strikeout: AnnotationType.Strikeout,
} as const;

export const STAMP_HALF_SIZE = 40;

export type RunMutation = (promise: Promise<unknown>, onSuccess?: () => void) => void;
export type RunCreateAndSelectMutation = (promise: Promise<number | undefined>) => void;

export function isSecondaryMouseButton(event: { button: number; pointerType?: string }): boolean {
  return (event.pointerType ?? 'mouse') === 'mouse' && event.button > 0;
}

export function dispatchEditorMutationError(error: unknown): void {
  const message = getUnknownErrorMessage(error);
  console.error('[PDFium Editor] Annotation mutation failed:', error);
  if (typeof globalThis.dispatchEvent === 'function' && typeof globalThis.CustomEvent === 'function') {
    globalThis.dispatchEvent(
      new CustomEvent('pdfium-editor-error', {
        detail: { message },
      }),
    );
  }
}

export function buildPdfRectFromScreenPoints(
  points: ReadonlyArray<{ x: number; y: number }>,
  scale: number,
  originalHeight: number,
): Rect {
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const maxX = Math.max(...xs);
  const maxY = Math.max(...ys);
  const topLeft = screenToPdf({ x: minX, y: minY }, { scale, originalHeight });
  const bottomRight = screenToPdf({ x: maxX, y: maxY }, { scale, originalHeight });
  return {
    left: topLeft.x,
    top: topLeft.y,
    right: bottomRight.x,
    bottom: bottomRight.y,
  };
}

export function getPointerOffsetWithinCurrentTarget(event: ReactPointerEvent): { x: number; y: number } {
  const container = event.currentTarget.getBoundingClientRect();
  return {
    x: event.clientX - container.left,
    y: event.clientY - container.top,
  };
}
