import type {
  UseAnnotationStyleColourControlsOptions,
  UseAnnotationStyleColourControlsResult,
} from './annotation-style-colour-control.types.js';
import { useAnnotationStyleColourInputHandlers } from './use-annotation-style-colour-input-handlers.js';
import { useAnnotationStyleOpacityFillControls } from './use-annotation-style-opacity-fill-controls.js';

export function useAnnotationStyleColourControls({
  ...options
}: UseAnnotationStyleColourControlsOptions): UseAnnotationStyleColourControlsResult {
  const inputHandlers = useAnnotationStyleColourInputHandlers(options);
  const opacityFillHandlers = useAnnotationStyleOpacityFillControls(options);
  return {
    ...inputHandlers,
    ...opacityFillHandlers,
  };
}
