/**
 * FreeText annotation editor overlay.
 *
 * Renders a positioned textarea at the click location for inline
 * text editing. On blur or Enter, creates a FreeText annotation.
 *
 * @module react/editor/components/freetext-editor
 */

import { type ChangeEvent, type KeyboardEvent, type ReactNode, useCallback, useEffect, useRef } from 'react';
import { AnnotationType } from '../../../core/types.js';
import { screenToPdf } from '../../coordinates.js';
import type { FreeTextInputActions } from '../hooks/use-freetext-input.js';

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

const DEFAULT_WIDTH = 200;
const DEFAULT_HEIGHT = 60;

interface EditorSize {
  readonly width: number;
  readonly height: number;
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
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const commitInFlightRef = useRef(false);

  const getEditorSize = useCallback((): EditorSize => {
    const el = textareaRef.current;
    if (!el) {
      return { width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT };
    }
    return {
      width: el.offsetWidth > 0 ? el.offsetWidth : DEFAULT_WIDTH,
      height: el.offsetHeight > 0 ? el.offsetHeight : DEFAULT_HEIGHT,
    };
  }, []);

  const commit = useCallback(async () => {
    if (commitInFlightRef.current) {
      return;
    }
    if (!input.state.position || !input.state.text) {
      input.cancel();
      return;
    }

    commitInFlightRef.current = true;
    const size = getEditorSize();
    const topLeft = screenToPdf({ x: input.state.position.x, y: input.state.position.y }, { scale, originalHeight });
    const bottomRight = screenToPdf(
      { x: input.state.position.x + size.width, y: input.state.position.y + size.height },
      { scale, originalHeight },
    );

    try {
      await input.confirm(AnnotationType.FreeText, {
        left: topLeft.x,
        top: topLeft.y,
        right: bottomRight.x,
        bottom: bottomRight.y,
      });
    } catch (error) {
      commitInFlightRef.current = false;
      throw error;
    }
  }, [getEditorSize, input, scale, originalHeight]);

  // Auto-focus when activated
  useEffect(() => {
    if (input.state.isActive && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [input.state.isActive]);

  useEffect(() => {
    if (!input.state.isActive) {
      commitInFlightRef.current = false;
    }
  }, [input.state.isActive]);

  const handleChange = useCallback(
    (e: ChangeEvent<HTMLTextAreaElement>) => {
      input.setText(e.target.value);
    },
    [input],
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        input.cancel();
        return;
      }

      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        void commit();
      }
    },
    [input, commit],
  );

  const handleBlur = useCallback(() => {
    void commit();
  }, [commit]);

  if (!input.state.isActive || !input.state.position) return null;

  return (
    <textarea
      ref={textareaRef}
      data-testid="freetext-editor"
      value={input.state.text}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      onBlur={handleBlur}
      style={{
        position: 'absolute',
        left: input.state.position.x,
        top: input.state.position.y,
        width: DEFAULT_WIDTH,
        minHeight: DEFAULT_HEIGHT,
        fontSize,
        fontFamily,
        border: '2px solid #2196F3',
        borderRadius: 2,
        padding: 4,
        outline: 'none',
        resize: 'both',
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        zIndex: 10,
      }}
    />
  );
}
