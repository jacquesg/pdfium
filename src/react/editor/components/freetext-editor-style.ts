import type { CSSProperties } from 'react';
import { DEFAULT_FREETEXT_EDITOR_HEIGHT, DEFAULT_FREETEXT_EDITOR_WIDTH } from './freetext-editor.constants.js';

export function buildFreeTextEditorStyle({
  fontFamily,
  fontSize,
  position,
}: {
  readonly fontFamily: string;
  readonly fontSize: number;
  readonly position: { x: number; y: number };
}): CSSProperties {
  return {
    position: 'absolute',
    left: position.x,
    top: position.y,
    width: DEFAULT_FREETEXT_EDITOR_WIDTH,
    minHeight: DEFAULT_FREETEXT_EDITOR_HEIGHT,
    fontSize,
    fontFamily,
    border: '2px solid #2196F3',
    borderRadius: 2,
    padding: 4,
    outline: 'none',
    resize: 'both',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    zIndex: 10,
  };
}
