import { useRef } from 'react';
import { useAnnotationStyleBorderAccessors } from './use-annotation-style-border-accessors.js';

export function useAnnotationStyleEditingBorderState(
  annotationBorder: Parameters<typeof useAnnotationStyleBorderAccessors>[0]['annotationBorder'],
  canEditBorder: boolean,
) {
  const localBorderWidthRef = useRef(annotationBorder?.borderWidth ?? (canEditBorder ? 1 : 0));

  return {
    localBorderWidthRef,
    ...useAnnotationStyleBorderAccessors({
      annotationBorder,
      canEditBorder,
      localBorderWidthRef,
    }),
  };
}
