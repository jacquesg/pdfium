import type { MutableRefObject } from 'react';
import type { AnnotationBorder } from '../../../core/types.js';
import type { AnnotationStyleEditingState } from './annotation-style-editing-state.types.js';

export type AnnotationStyleEditingCapabilityState = Pick<
  AnnotationStyleEditingState,
  | 'applyPreviewPatch'
  | 'canEditBorder'
  | 'canEditFill'
  | 'canEditStroke'
  | 'canToggleFill'
  | 'fillColourType'
  | 'getEditableBorderForWidth'
  | 'primaryColourType'
> & {
  readonly clearPreviewPatch: () => void;
  readonly getPersistedEditableBorderForAnnotation: () => AnnotationBorder | null;
  readonly getPreservedBorderForCommit: () => AnnotationBorder | null;
  readonly localBorderWidthRef: MutableRefObject<number>;
};
