/**
 * Text markup overlay.
 *
 * Transparent to pointer events so the text layer below remains selectable.
 * On pointer-up, reads the browser text selection, converts the selected
 * text rects to PDF coordinates, and calls `onCreate`.
 *
 * @module react/editor/components/text-markup-overlay
 */

import type { ReactNode } from 'react';
import type { Rect } from '../../../core/types.js';
import { TextMarkupOverlayView } from './text-markup-overlay-view.js';
import { useTextMarkupOverlayRuntime } from './use-text-markup-overlay-runtime.js';

/**
 * Props for the `TextMarkupOverlay` component.
 */
export interface TextMarkupOverlayProps {
  /** Container width in pixels. */
  readonly width: number;
  /** Container height in pixels. */
  readonly height: number;
  /** Scale factor for coordinate conversion. */
  readonly scale: number;
  /** Original page height in PDF points. */
  readonly originalHeight: number;
  /** The active markup tool — used to re-trigger the selection-first flow on tool switch. */
  readonly tool: 'highlight' | 'underline' | 'strikeout';
  /** Called when text is selected with individual line rects and the bounding rect. */
  onCreate?(rects: readonly Rect[], boundingRect: Rect): void;
  /** Notifies whether a selection was processed from mount or pointer-up. */
  onProcessResult?(processed: boolean, source: 'mount' | 'pointerup'): void;
}

/**
 * Overlay for text markup tools (highlight, underline, strikeout).
 *
 * Supports two interaction flows:
 * 1. **Tool-first**: select a markup tool, then drag to select text.
 * 2. **Selection-first**: select text (in any tool mode), then click a
 *    markup tool — the annotation is created immediately on mount.
 *
 * Renders with `pointerEvents: 'none'` so the underlying text layer
 * remains interactive. On `pointerup`, inspects `document.getSelection()`
 * and converts the selected text rects into PDF coordinates.
 */
export function TextMarkupOverlay({
  width,
  height,
  scale,
  originalHeight,
  tool,
  onCreate,
  onProcessResult,
}: TextMarkupOverlayProps): ReactNode {
  const { containerRef } = useTextMarkupOverlayRuntime({
    height,
    originalHeight,
    scale,
    tool,
    width,
    ...(onCreate !== undefined ? { onCreate } : {}),
    ...(onProcessResult !== undefined ? { onProcessResult } : {}),
  });

  return <TextMarkupOverlayView containerRef={containerRef} height={height} width={width} />;
}
