import type {
  UseAnnotationStyleColourControlsOptions,
  UseAnnotationStyleColourControlsResult,
} from './annotation-style-colour-control.types.js';
import { useAnnotationStyleFillInputHandler } from './use-annotation-style-fill-input-handler.js';
import { useAnnotationStyleStrokeInputHandler } from './use-annotation-style-stroke-input-handler.js';

type ColourInputHandlersResult = Pick<
  UseAnnotationStyleColourControlsResult,
  'handleInteriorColourChange' | 'handleStrokeColourChange'
>;

export function useAnnotationStyleColourInputHandlers({
  canEditFill,
  canEditStroke,
  canToggleFill,
  fillColourType,
  fillEnabled,
  liveInteriorColourRef,
  liveStrokeColourRef,
  queueColourCommit,
  setLocalInteriorColour,
  setLocalStrokeColour,
  applyFillPreset,
  applyPreviewPatch,
  applyStrokePreset,
}: UseAnnotationStyleColourControlsOptions): ColourInputHandlersResult {
  const { handleStrokeColourChange } = useAnnotationStyleStrokeInputHandler({
    applyPreviewPatch,
    applyStrokePreset,
    canEditStroke,
    liveStrokeColourRef,
    queueColourCommit,
    setLocalStrokeColour,
  });
  const { handleInteriorColourChange } = useAnnotationStyleFillInputHandler({
    applyFillPreset,
    applyPreviewPatch,
    canEditFill,
    canToggleFill,
    fillColourType,
    fillEnabled,
    liveInteriorColourRef,
    liveStrokeColourRef,
    queueColourCommit,
    setLocalInteriorColour,
    setLocalStrokeColour,
  });

  return {
    handleInteriorColourChange,
    handleStrokeColourChange,
  };
}
