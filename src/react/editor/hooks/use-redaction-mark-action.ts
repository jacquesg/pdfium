import { useCallback } from 'react';
import { AnnotationType, type Rect } from '../../../core/types.js';
import type { CreateAnnotationOptions } from '../command.js';
import { isUnsupportedAnnotationCreateError } from '../redaction-utils.js';
import { buildFallbackRedactionOptions } from './redaction-mark-support.js';
import type { AnnotationCrudActions } from './use-annotation-crud.js';

export function useRedactionMarkAction(crud: AnnotationCrudActions) {
  return useCallback(
    async (rect: Rect, options?: CreateAnnotationOptions): Promise<number | undefined> => {
      try {
        return await crud.createAnnotation(AnnotationType.Redact, rect, options);
      } catch (error) {
        if (!isUnsupportedAnnotationCreateError(error, 'Redact')) {
          throw error;
        }

        return crud.createAnnotation(AnnotationType.Square, rect, buildFallbackRedactionOptions(options));
      }
    },
    [crud],
  );
}
