import { useCallback } from 'react';
import type { AnnotationColourType, Colour } from '../../../core/types.js';
import { queuePendingColourCommit, takePendingColourCommit } from './annotation-style-commit-queue-support.js';
import type {
  AnnotationStyleColourCommitterOptions,
  AnnotationStyleColourCommittersResult,
} from './annotation-style-committers.types.js';
import { colourRgbEqual, coloursEqual } from './annotation-style-editing-support.js';

export function useAnnotationStyleColourCommitters({
  annotationIndex,
  crud,
  flushPreviewIfStyleIdle,
  getPreservedBorderRef,
  inFlightStyleCommitsRef,
  pendingColourCommitRef,
  scheduleStyleCommit,
}: AnnotationStyleColourCommitterOptions): AnnotationStyleColourCommittersResult {
  const commitPendingColour = useCallback(
    (colourType: AnnotationColourType) => {
      const pending = takePendingColourCommit(pendingColourCommitRef, colourType);
      if (!pending) return;

      if (coloursEqual(pending.oldColour, pending.newColour)) {
        flushPreviewIfStyleIdle();
        return;
      }

      inFlightStyleCommitsRef.current += 1;
      const preserveBorder = colourRgbEqual(pending.oldColour, pending.newColour)
        ? null
        : getPreservedBorderRef.current();
      void crud
        .setAnnotationColour(annotationIndex, colourType, pending.oldColour, pending.newColour, preserveBorder)
        .finally(() => {
          inFlightStyleCommitsRef.current = Math.max(0, inFlightStyleCommitsRef.current - 1);
          flushPreviewIfStyleIdle();
        });
    },
    [
      annotationIndex,
      crud,
      flushPreviewIfStyleIdle,
      getPreservedBorderRef,
      inFlightStyleCommitsRef,
      pendingColourCommitRef,
    ],
  );

  const commitPendingColours = useCallback(() => {
    commitPendingColour('stroke');
    commitPendingColour('interior');
  }, [commitPendingColour]);

  const queueColourCommit = useCallback(
    (colourType: AnnotationColourType, oldColour: Colour, newColour: Colour) => {
      queuePendingColourCommit(pendingColourCommitRef, colourType, oldColour, newColour);
      scheduleStyleCommit();
    },
    [pendingColourCommitRef, scheduleStyleCommit],
  );

  return {
    commitPendingColour,
    commitPendingColours,
    queueColourCommit,
  };
}
