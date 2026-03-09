import type { MutableRefObject } from 'react';
import type { AnnotationBorder, AnnotationColourType, Colour } from '../../../core/types.js';
import type {
  PendingBorderCommit,
  PendingColourCommitMap,
  UseAnnotationStyleCommitQueueOptions,
} from './annotation-style-commit-queue.types.js';

interface AnnotationStyleCommitterSharedOptions {
  readonly annotationIndex: number;
  readonly crud: UseAnnotationStyleCommitQueueOptions['crud'];
  readonly flushPreviewIfStyleIdle: () => void;
  readonly inFlightStyleCommitsRef: MutableRefObject<number>;
  readonly scheduleStyleCommit: () => void;
}

export interface AnnotationStyleColourCommitterOptions extends AnnotationStyleCommitterSharedOptions {
  readonly getPreservedBorderRef: MutableRefObject<() => AnnotationBorder | null>;
  readonly pendingColourCommitRef: MutableRefObject<PendingColourCommitMap>;
}

export interface AnnotationStyleBorderCommitterOptions extends AnnotationStyleCommitterSharedOptions {
  readonly borderEditStartRef: MutableRefObject<AnnotationBorder | null>;
  readonly pendingBorderCommitRef: MutableRefObject<PendingBorderCommit | null>;
  readonly persistedBorderForCommitRef: MutableRefObject<AnnotationBorder | null>;
}

export interface AnnotationStyleQueueCommittersOptions
  extends AnnotationStyleBorderCommitterOptions,
    AnnotationStyleColourCommitterOptions {
  readonly clearPendingBorderCommit: () => void;
  readonly clearPendingColourCommit: (colourType?: AnnotationColourType) => void;
  readonly clearStyleCommitTimer: () => void;
  readonly flushStyleCommitsRef: MutableRefObject<() => void>;
}

export interface AnnotationStyleColourCommittersResult {
  readonly commitPendingColour: (colourType: AnnotationColourType) => void;
  readonly commitPendingColours: () => void;
  readonly queueColourCommit: (colourType: AnnotationColourType, oldColour: Colour, newColour: Colour) => void;
}

export interface AnnotationStyleBorderCommittersResult {
  readonly commitPendingBorder: () => void;
  readonly queueBorderCommit: (nextBorderWidth: number) => void;
}
