import { type MutableRefObject, useCallback } from 'react';
import type { AnnotationBorder } from '../../../core/types.js';
import {
  getEditableBorder,
  getPersistedEditableBorder,
  getPreservedBorder,
} from './annotation-style-editing-support.js';

interface UseAnnotationStyleBorderAccessorsOptions {
  readonly annotationBorder: AnnotationBorder | null;
  readonly canEditBorder: boolean;
  readonly localBorderWidthRef: MutableRefObject<number>;
}

export function useAnnotationStyleBorderAccessors({
  annotationBorder,
  canEditBorder,
  localBorderWidthRef,
}: UseAnnotationStyleBorderAccessorsOptions) {
  const getEditableBorderForWidth = useCallback(
    (borderWidth: number) => getEditableBorder(annotationBorder, canEditBorder, borderWidth),
    [annotationBorder, canEditBorder],
  );

  const getPersistedEditableBorderForAnnotation = useCallback(
    (): AnnotationBorder | null => getPersistedEditableBorder(annotationBorder, canEditBorder),
    [annotationBorder, canEditBorder],
  );

  const getPreservedBorderForCommit = useCallback(
    () => getPreservedBorder(annotationBorder, canEditBorder, localBorderWidthRef.current),
    [annotationBorder, canEditBorder, localBorderWidthRef],
  );

  return {
    getEditableBorderForWidth,
    getPersistedEditableBorderForAnnotation,
    getPreservedBorderForCommit,
  };
}
