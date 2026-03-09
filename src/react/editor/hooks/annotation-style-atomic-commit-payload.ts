import type { MutableRefObject } from 'react';
import type { AnnotationBorder, AnnotationColourType } from '../../../core/types.js';
import type {
  AtomicStyleCommitPayload,
  PendingBorderCommit,
  PendingColourCommit,
  PendingColourCommitMap,
} from './annotation-style-commit-queue.types.js';
import { colourRgbEqual, coloursEqual } from './annotation-style-editing-support.js';

export function takeAtomicStyleCommitPayload({
  borderEditStartRef,
  getPreservedBorder,
  pendingBorderCommitRef,
  pendingColourCommitRef,
}: {
  readonly borderEditStartRef: MutableRefObject<AnnotationBorder | null>;
  readonly getPreservedBorder: () => AnnotationBorder | null;
  readonly pendingBorderCommitRef: MutableRefObject<PendingBorderCommit | null>;
  readonly pendingColourCommitRef: MutableRefObject<PendingColourCommitMap>;
}): AtomicStyleCommitPayload | null {
  const pendingStroke = pendingColourCommitRef.current.stroke;
  const pendingInterior = pendingColourCommitRef.current.interior;
  const pendingBorder = pendingBorderCommitRef.current;

  pendingColourCommitRef.current.stroke = null;
  pendingColourCommitRef.current.interior = null;
  pendingBorderCommitRef.current = null;
  borderEditStartRef.current = null;

  const stylePreserveBorder = pendingBorder?.newBorder ?? getPreservedBorder();
  const stroke = buildAtomicColourMutation('stroke', pendingStroke, stylePreserveBorder);
  const interior = buildAtomicColourMutation('interior', pendingInterior, stylePreserveBorder);
  const border =
    pendingBorder && Math.abs(pendingBorder.oldBorder.borderWidth - pendingBorder.newBorder.borderWidth) >= 0.001
      ? pendingBorder
      : undefined;

  if (stroke === undefined && interior === undefined && border === undefined) {
    return null;
  }

  return {
    ...(stroke !== undefined ? { stroke } : {}),
    ...(interior !== undefined ? { interior } : {}),
    ...(border !== undefined ? { border } : {}),
  };
}

function buildAtomicColourMutation(
  colourType: AnnotationColourType,
  pending: PendingColourCommit | null,
  preserveBorder: AnnotationBorder | null,
) {
  if (!pending || coloursEqual(pending.oldColour, pending.newColour)) {
    return undefined;
  }

  return {
    colourType,
    oldColour: pending.oldColour,
    newColour: pending.newColour,
    preserveBorder: colourRgbEqual(pending.oldColour, pending.newColour) ? null : preserveBorder,
  };
}
