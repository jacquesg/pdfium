/**
 * Text markup overlay.
 *
 * Transparent to pointer events so the text layer below remains selectable.
 * On pointer-up, reads the browser text selection, converts the selected
 * text rects to PDF coordinates, and calls `onCreate`.
 *
 * @module react/editor/components/text-markup-overlay
 */

import { type ReactNode, useCallback, useEffect, useRef } from 'react';
import type { Rect } from '../../../core/types.js';
import { screenToPdf } from '../../coordinates.js';

function clearNativeSelection(selection: Selection): void {
  selection.removeAllRanges();

  const clearAgain = () => {
    globalThis.getSelection?.()?.removeAllRanges();
  };

  if (typeof globalThis.requestAnimationFrame === 'function') {
    globalThis.requestAnimationFrame(() => {
      clearAgain();
    });
    return;
  }

  globalThis.setTimeout(clearAgain, 0);
}

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
  const containerRef = useRef<HTMLDivElement>(null);

  // Ref for the latest onCreate callback — the global document listener
  // must always invoke the most recent version without re-registering.
  const onCreateRef = useRef(onCreate);
  onCreateRef.current = onCreate;

  /**
   * Process the current browser text selection, convert to PDF coordinates,
   * and invoke `onCreate`. Returns `true` if a selection was processed.
   */
  const processSelection = useCallback((): boolean => {
    const sel = document.getSelection();
    if (!sel || sel.isCollapsed || sel.rangeCount === 0) return false;

    const container = containerRef.current;
    if (!container) {
      return false;
    }

    const containerRect = container.getBoundingClientRect();
    if (containerRect.width === 0 || containerRect.height === 0) return false;

    const range = sel.getRangeAt(0);
    const clientRects = Array.from(range.getClientRects());

    // Filter rects that overlap with this page container
    const pageRects = clientRects.filter(
      (r) =>
        r.right > containerRect.left &&
        r.left < containerRect.right &&
        r.bottom > containerRect.top &&
        r.top < containerRect.bottom &&
        r.width > 0 &&
        r.height > 0,
    );

    if (pageRects.length === 0) return false;

    // Convert each client rect to PDF coordinates
    const pdfRects: Rect[] = pageRects.map((r) => {
      const topLeft = screenToPdf(
        { x: Math.max(0, r.left - containerRect.left), y: Math.max(0, r.top - containerRect.top) },
        { scale, originalHeight },
      );
      const bottomRight = screenToPdf(
        {
          x: Math.min(width, r.right - containerRect.left),
          y: Math.min(height, r.bottom - containerRect.top),
        },
        { scale, originalHeight },
      );
      return { left: topLeft.x, top: topLeft.y, right: bottomRight.x, bottom: bottomRight.y };
    });

    // Compute bounding rect across all selected text rects
    const boundingRect: Rect = {
      left: Math.min(...pdfRects.map((r) => r.left)),
      top: Math.max(...pdfRects.map((r) => r.top)),
      right: Math.max(...pdfRects.map((r) => r.right)),
      bottom: Math.min(...pdfRects.map((r) => r.bottom)),
    };

    onCreateRef.current?.(pdfRects, boundingRect);
    clearNativeSelection(sel);
    return true;
  }, [scale, originalHeight, width, height]);

  // ── Selection-first flow ───────────────────────────────────
  // When the user selects text first and then clicks a markup tool,
  // the overlay mounts with a pre-existing text selection. Process it
  // after paint so the container element is fully laid out and
  // getBoundingClientRect() returns correct dimensions.
  //
  // `tool` is a stable string — only changes when the user switches
  // markup tools. This avoids re-firing on every render (which would
  // happen if we depended on `onCreate`, whose identity is unstable).
  // biome-ignore lint/correctness/useExhaustiveDependencies: tool is an intentional trigger — re-fires the effect on tool switch
  useEffect(() => {
    const processed = processSelection();
    onProcessResult?.(processed, 'mount');
  }, [processSelection, tool, onProcessResult]);

  // ── Tool-first flow ────────────────────────────────────────
  // When the tool is already active and the user selects text,
  // process on pointerup.
  const handlePointerUp = useCallback(
    (e: PointerEvent) => {
      // Reject pointerup events from interactive controls (toolbar buttons, etc.).
      // When a user drags a text selection and releases on a toolbar button the
      // browser fires pointerup (with the old tool) before click (which switches
      // the tool). Without this guard the annotation would be created with the
      // wrong subtype.
      if (e.target instanceof Element && e.target.closest('button, input, textarea, select, [role="toolbar"]')) {
        return;
      }

      const processed = processSelection();
      onProcessResult?.(processed, 'pointerup');
    },
    [processSelection, onProcessResult],
  );

  useEffect(() => {
    document.addEventListener('pointerup', handlePointerUp);
    return () => {
      document.removeEventListener('pointerup', handlePointerUp);
    };
  }, [handlePointerUp]);

  return (
    <div
      ref={containerRef}
      data-testid="text-markup-overlay"
      style={{
        position: 'absolute',
        inset: 0,
        width,
        height,
        pointerEvents: 'none',
      }}
    />
  );
}
