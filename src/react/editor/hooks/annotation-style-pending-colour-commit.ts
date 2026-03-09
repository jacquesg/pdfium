import type { MutableRefObject } from 'react';
import type { AnnotationColourType, Colour } from '../../../core/types.js';
import type { PendingColourCommit, PendingColourCommitMap } from './annotation-style-commit-queue.types.js';

export function clearPendingColourCommit(
  pendingColourCommitRef: MutableRefObject<PendingColourCommitMap>,
  colourType?: AnnotationColourType,
): void {
  if (colourType !== undefined) {
    pendingColourCommitRef.current[colourType] = null;
    return;
  }
  pendingColourCommitRef.current.stroke = null;
  pendingColourCommitRef.current.interior = null;
}

export function queuePendingColourCommit(
  pendingColourCommitRef: MutableRefObject<PendingColourCommitMap>,
  colourType: AnnotationColourType,
  oldColour: Colour,
  newColour: Colour,
): void {
  const previousPending = pendingColourCommitRef.current[colourType];
  pendingColourCommitRef.current[colourType] = {
    oldColour: previousPending?.oldColour ?? oldColour,
    newColour,
  };
}

export function takePendingColourCommit(
  pendingColourCommitRef: MutableRefObject<PendingColourCommitMap>,
  colourType: AnnotationColourType,
): PendingColourCommit | null {
  const pending = pendingColourCommitRef.current[colourType];
  pendingColourCommitRef.current[colourType] = null;
  return pending;
}
