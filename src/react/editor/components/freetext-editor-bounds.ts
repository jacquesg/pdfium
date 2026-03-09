import { screenToPdf } from '../../coordinates.js';
import {
  DEFAULT_FREETEXT_EDITOR_HEIGHT,
  DEFAULT_FREETEXT_EDITOR_WIDTH,
  type EditorSize,
} from './freetext-editor.constants.js';

export function getFreeTextEditorSize(textarea: HTMLTextAreaElement | null): EditorSize {
  if (!textarea) {
    return { width: DEFAULT_FREETEXT_EDITOR_WIDTH, height: DEFAULT_FREETEXT_EDITOR_HEIGHT };
  }

  return {
    width: textarea.offsetWidth > 0 ? textarea.offsetWidth : DEFAULT_FREETEXT_EDITOR_WIDTH,
    height: textarea.offsetHeight > 0 ? textarea.offsetHeight : DEFAULT_FREETEXT_EDITOR_HEIGHT,
  };
}

export function buildFreeTextBounds({
  height,
  originalHeight,
  position,
  scale,
  width,
}: {
  readonly height: number;
  readonly originalHeight: number;
  readonly position: { x: number; y: number };
  readonly scale: number;
  readonly width: number;
}) {
  const topLeft = screenToPdf({ x: position.x, y: position.y }, { scale, originalHeight });
  const bottomRight = screenToPdf({ x: position.x + width, y: position.y + height }, { scale, originalHeight });

  return {
    left: topLeft.x,
    top: topLeft.y,
    right: bottomRight.x,
    bottom: bottomRight.y,
  };
}
