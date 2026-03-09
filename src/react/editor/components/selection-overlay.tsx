/**
 * Selection overlay for a selected annotation.
 *
 * Uses box semantics for generic annotations and endpoint semantics for
 * line-like annotations. During active transforms it renders live vector
 * previews so the user sees the actual geometry change, not just a bounds box.
 *
 * @module react/editor/components/selection-overlay
 */

import type { ReactNode } from 'react';
import { useSelectionOverlayController } from '../hooks/use-selection-overlay-controller.js';
import type { SelectionOverlayProps } from './selection-overlay.types.js';
import { SelectionOverlayView } from './selection-overlay-view.js';

/**
 * Component
 */
export function SelectionOverlay({
  rect,
  scale,
  originalHeight,
  maxWidth,
  maxHeight,
  appearance,
  interactive,
  onPreviewRect,
  onPreviewLine,
  onPreviewClear,
  onMove,
  onResize,
  onMoveLine,
  onResizeLine,
}: SelectionOverlayProps): ReactNode {
  const controller = useSelectionOverlayController({
    rect,
    scale,
    originalHeight,
    maxWidth,
    maxHeight,
    appearance,
    interactive,
    onPreviewRect,
    onPreviewLine,
    onPreviewClear,
    onMove,
    onResize,
    onMoveLine,
    onResizeLine,
  });

  return <SelectionOverlayView controller={controller} />;
}

export type { SelectionOverlayAppearance, SelectionOverlayProps } from './selection-overlay.types.js';
