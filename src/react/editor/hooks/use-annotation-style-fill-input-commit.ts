import {
  applyLocalFillColourChange,
  buildFillPreviewPatch,
  resolveFillInputColourChange,
} from './annotation-style-fill-input-support.js';
import type { UseAnnotationStyleFillInputHandlerOptions } from './use-annotation-style-fill-input-handler.js';

type UseAnnotationStyleFillInputCommitOptions = Pick<
  UseAnnotationStyleFillInputHandlerOptions,
  | 'applyFillPreset'
  | 'applyPreviewPatch'
  | 'canToggleFill'
  | 'fillColourType'
  | 'fillEnabled'
  | 'liveInteriorColourRef'
  | 'liveStrokeColourRef'
  | 'queueColourCommit'
  | 'setLocalInteriorColour'
  | 'setLocalStrokeColour'
>;

export function useAnnotationStyleFillInputCommit({
  applyFillPreset,
  applyPreviewPatch,
  canToggleFill,
  fillColourType,
  fillEnabled,
  liveInteriorColourRef,
  liveStrokeColourRef,
  queueColourCommit,
  setLocalInteriorColour,
  setLocalStrokeColour,
}: UseAnnotationStyleFillInputCommitOptions) {
  return (value: string) => {
    const oldColour = fillColourType === 'stroke' ? liveStrokeColourRef.current : liveInteriorColourRef.current;
    const newColour = resolveFillInputColourChange(value, oldColour);
    if (newColour === null) {
      return false;
    }

    applyLocalFillColourChange({
      fillColourType,
      liveInteriorColourRef,
      liveStrokeColourRef,
      newColour,
      setLocalInteriorColour,
      setLocalStrokeColour,
    });
    applyPreviewPatch(buildFillPreviewPatch(fillColourType, newColour));
    applyFillPreset(newColour, !canToggleFill || fillEnabled);
    queueColourCommit(fillColourType, oldColour, newColour);
    return true;
  };
}
