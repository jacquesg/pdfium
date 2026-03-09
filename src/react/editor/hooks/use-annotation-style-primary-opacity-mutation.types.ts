import type { UseAnnotationStyleColourControlsOptions } from './annotation-style-colour-control.types.js';

export type UseAnnotationStylePrimaryOpacityMutationOptions = Pick<
  UseAnnotationStyleColourControlsOptions,
  | 'applyFillPreset'
  | 'applyOpacityPreset'
  | 'applyPreviewPatch'
  | 'applyStrokePreset'
  | 'canToggleFill'
  | 'fillEnabled'
  | 'liveInteriorColourRef'
  | 'liveStrokeColourRef'
  | 'primaryColourType'
  | 'queueColourCommit'
  | 'setLocalInteriorColour'
  | 'setLocalStrokeColour'
>;
