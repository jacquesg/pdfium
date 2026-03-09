import type { MutableRefObject } from 'react';
import type { AnnotationBorder } from '../../../core/types.js';
import type {
  AnnotationStyleEditingState,
  UseAnnotationStyleEditingStateOptions,
} from './annotation-style-editing-state.types.js';

export interface UseAnnotationStyleEditingMutationStateOptions
  extends Pick<UseAnnotationStyleEditingStateOptions, 'annotation' | 'crud' | 'effectiveType' | 'onToolConfigChange'>,
    Pick<AnnotationStyleEditingState, 'canEditBorder' | 'fillColourType'> {
  readonly clearPreviewPatch: () => void;
  readonly getPersistedEditableBorderForAnnotation: () => AnnotationBorder | null;
  readonly getPreservedBorderForCommit: () => AnnotationBorder | null;
  readonly localBorderWidthRef: MutableRefObject<number>;
}

export type AnnotationStyleEditingMutationState = Pick<
  AnnotationStyleEditingState,
  | 'applyBorderPreset'
  | 'applyFillPreset'
  | 'applyOpacityPreset'
  | 'applyStrokePreset'
  | 'borderEditStartRef'
  | 'clearPendingBorderCommit'
  | 'clearStyleCommitTimer'
  | 'fillEnabled'
  | 'flushPreviewIfStyleIdle'
  | 'flushStyleCommits'
  | 'liveInteriorColourRef'
  | 'liveStrokeColourRef'
  | 'localBorderWidth'
  | 'localInteriorColour'
  | 'localStrokeColour'
  | 'panelRootRef'
  | 'pendingBorderCommitRef'
  | 'pendingColourCommitRef'
  | 'persistedBorderForCommitRef'
  | 'queueBorderCommit'
  | 'queueColourCommit'
  | 'setFillEnabled'
  | 'setLocalBorderWidth'
  | 'setLocalInteriorColour'
  | 'setLocalStrokeColour'
  | 'skipBorderCommitOnBlurRef'
>;
