import type { UseSelectionOverlayControllerOptions } from './selection-overlay-controller.types.js';
import { useSelectionOverlayControllerRuntime } from './use-selection-overlay-controller-runtime.js';

export function useSelectionOverlayController(options: UseSelectionOverlayControllerOptions) {
  return useSelectionOverlayControllerRuntime(options);
}

export type SelectionOverlayControllerResult = ReturnType<typeof useSelectionOverlayController>;
