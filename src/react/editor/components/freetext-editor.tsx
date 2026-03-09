/**
 * FreeText annotation editor overlay.
 *
 * Renders a positioned textarea at the click location for inline
 * text editing. On blur or Enter, creates a FreeText annotation.
 *
 * @module react/editor/components/freetext-editor
 */

import type { ReactNode } from 'react';
import { useFreeTextEditorController } from '../hooks/use-freetext-editor-controller.js';
import type { FreeTextInputActions } from '../hooks/use-freetext-input.js';
import { buildFreeTextEditorStyle } from './freetext-editor-support.js';

/**
 * Props for the `FreeTextEditor` component.
 */
export interface FreeTextEditorProps {
  /** FreeText input actions from `useFreeTextInput`. */
  readonly input: FreeTextInputActions;
  /** Scale factor for coordinate conversion. */
  readonly scale: number;
  /** Original page height in PDF points. */
  readonly originalHeight: number;
  /** Default font size in pixels. */
  readonly fontSize?: number;
  /** Default font family. */
  readonly fontFamily?: string;
}

/**
 * Positioned textarea overlay for creating FreeText annotations.
 *
 * Appears at the click position, auto-focuses, and commits on
 * blur or Ctrl+Enter. Escape cancels.
 */
export function FreeTextEditor({
  input,
  scale,
  originalHeight,
  fontSize = 14,
  fontFamily = 'Helvetica, sans-serif',
}: FreeTextEditorProps): ReactNode {
  const { handleBlur, handleChange, handleKeyDown, textareaRef } = useFreeTextEditorController({
    input,
    originalHeight,
    scale,
  });

  if (!input.state.isActive || !input.state.position) return null;

  return (
    <textarea
      ref={textareaRef}
      data-testid="freetext-editor"
      value={input.state.text}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      onBlur={handleBlur}
      style={buildFreeTextEditorStyle({ fontFamily, fontSize, position: input.state.position })}
    />
  );
}
