/**
 * Editor overlay for a PDF page.
 *
 * Delegates to the correct sub-overlay based on the active tool.
 * Intended to be used as the `renderPageOverlay` prop of `PDFPageView`.
 *
 * @module react/editor/components/editor-overlay
 */

import type { ReactNode } from 'react';
import { useEditorOverlayController } from '../hooks/use-editor-overlay-controller.js';
import type { EditorOverlayProps } from './editor-overlay.types.js';
import { EditorOverlayLayers } from './editor-overlay-layers.js';

/**
 * Renders the appropriate editor overlay for the active tool on a page.
 *
 * Supports all editor modes and tools:
 * - `idle` — selection overlay with resize handles
 * - `ink` — freehand drawing canvas
 * - `freetext` — click-to-place text editor
 * - `highlight`, `underline`, `strikeout` — one-shot text markup actions
 * - `rectangle`, `circle`, `line` — shape creation
 * - `redact` — redaction marking with hatched overlay
 * - `stamp` — click-to-place stamp
 *
 * Must be called within an `EditorProvider`.
 */
export function EditorOverlay({
  pageIndex,
  scale,
  originalHeight,
  width,
  height,
  annotations,
  annotationsPending = false,
  document,
  selectionEnabled,
}: EditorOverlayProps): ReactNode {
  const layerProps = useEditorOverlayController({
    annotations,
    annotationsPending,
    document,
    height,
    originalHeight,
    pageIndex,
    scale,
    width,
    ...(selectionEnabled !== undefined ? { selectionEnabled } : {}),
  });

  return <EditorOverlayLayers {...layerProps} />;
}

export type { EditorOverlayProps } from './editor-overlay.types.js';
