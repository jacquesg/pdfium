import type { Dispatch, MutableRefObject, RefObject, SetStateAction } from 'react';
import type { SerialisedAnnotation } from '../../../context/protocol.js';
import type { AnnotationBorder, AnnotationColourType, AnnotationType, Colour } from '../../../core/types.js';
import type { PendingBorderCommit, PendingColourCommitMap } from './annotation-style-commit-queue.types.js';

export interface UseAnnotationStyleLocalStateOptions {
  readonly annotation: SerialisedAnnotation;
  readonly canEditBorder: boolean;
  readonly effectiveType: AnnotationType;
  readonly fillColourType: AnnotationColourType;
  readonly getPersistedEditableBorderForAnnotation: () => AnnotationBorder | null;
  readonly inFlightStyleCommitsRef: MutableRefObject<number>;
  readonly pendingBorderCommitRef: MutableRefObject<PendingBorderCommit | null>;
  readonly pendingColourCommitRef: MutableRefObject<PendingColourCommitMap>;
  readonly persistedBorderForCommitRef: MutableRefObject<AnnotationBorder | null>;
}

export interface AnnotationStyleLocalState {
  readonly fillEnabled: boolean;
  readonly liveInteriorColourRef: MutableRefObject<Colour>;
  readonly liveStrokeColourRef: MutableRefObject<Colour>;
  readonly localBorderWidth: number;
  readonly localInteriorColour: Colour;
  readonly localStrokeColour: Colour;
  readonly panelRootRef: RefObject<HTMLDivElement | null>;
  readonly setFillEnabled: Dispatch<SetStateAction<boolean>>;
  readonly setLocalBorderWidth: Dispatch<SetStateAction<number>>;
  readonly setLocalInteriorColour: Dispatch<SetStateAction<Colour>>;
  readonly setLocalStrokeColour: Dispatch<SetStateAction<Colour>>;
}
