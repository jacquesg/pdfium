import type {
  UseSelectionOverlayDragOptions,
  UseSelectionOverlayDragResult,
} from './use-selection-overlay-drag.types.js';
import { useSelectionOverlayDragRuntime } from './use-selection-overlay-drag-runtime.js';

export function useSelectionOverlayDrag(options: UseSelectionOverlayDragOptions): UseSelectionOverlayDragResult {
  return useSelectionOverlayDragRuntime(options);
}

export type {
  UseSelectionOverlayDragOptions,
  UseSelectionOverlayDragResult,
} from './use-selection-overlay-drag.types.js';
