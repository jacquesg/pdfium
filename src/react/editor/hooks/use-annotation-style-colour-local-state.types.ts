import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import type { AnnotationColourType, AnnotationType, Colour } from '../../../core/types.js';
import type { PendingColourCommitMap } from './annotation-style-commit-queue.types.js';
import type { UseAnnotationStyleLocalStateOptions } from './annotation-style-local-state.types.js';

export type UseAnnotationStyleColourLocalStateOptions = Pick<
  UseAnnotationStyleLocalStateOptions,
  'annotation' | 'effectiveType' | 'fillColourType' | 'inFlightStyleCommitsRef' | 'pendingColourCommitRef'
>;

export interface AnnotationStyleColourLocalState {
  readonly liveInteriorColourRef: MutableRefObject<Colour>;
  readonly liveStrokeColourRef: MutableRefObject<Colour>;
  readonly localInteriorColour: Colour;
  readonly localStrokeColour: Colour;
  readonly setLocalInteriorColour: Dispatch<SetStateAction<Colour>>;
  readonly setLocalStrokeColour: Dispatch<SetStateAction<Colour>>;
}

export interface UseAnnotationStyleColourStateSyncOptions {
  readonly annotation: UseAnnotationStyleColourLocalStateOptions['annotation'];
  readonly effectiveType: AnnotationType;
  readonly fillColourType: AnnotationColourType;
  readonly inFlightStyleCommitsRef: UseAnnotationStyleColourLocalStateOptions['inFlightStyleCommitsRef'];
  readonly liveInteriorColourRef: MutableRefObject<Colour>;
  readonly liveStrokeColourRef: MutableRefObject<Colour>;
  readonly pendingColourCommitRef: MutableRefObject<PendingColourCommitMap>;
  readonly setLocalInteriorColour: Dispatch<SetStateAction<Colour>>;
  readonly setLocalStrokeColour: Dispatch<SetStateAction<Colour>>;
}
