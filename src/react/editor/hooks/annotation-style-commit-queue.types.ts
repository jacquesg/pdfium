import type { MutableRefObject } from 'react';
import type { AnnotationBorder, AnnotationColourType, Colour } from '../../../core/types.js';
import type { AnnotationCrudActions } from './use-annotation-crud.js';

export interface PendingColourCommit {
  readonly oldColour: Colour;
  readonly newColour: Colour;
}

export interface PendingBorderCommit {
  readonly oldBorder: AnnotationBorder;
  readonly newBorder: AnnotationBorder;
}

export type PendingColourCommitMap = Record<AnnotationColourType, PendingColourCommit | null>;

export interface PendingStyleCommitRefs {
  readonly borderEditStartRef: MutableRefObject<AnnotationBorder | null>;
  readonly pendingBorderCommitRef: MutableRefObject<PendingBorderCommit | null>;
  readonly pendingColourCommitRef: MutableRefObject<PendingColourCommitMap>;
}

export type AtomicStyleCommitPayload = Parameters<NonNullable<AnnotationCrudActions['setAnnotationStyle']>>[1];

export interface UseAnnotationStyleCommitQueueOptions {
  readonly annotationIndex: number;
  readonly clearPreviewPatch: () => void;
  readonly crud: AnnotationCrudActions;
  readonly getPreservedBorder: () => AnnotationBorder | null;
  readonly initialPersistedBorder: AnnotationBorder | null;
}
