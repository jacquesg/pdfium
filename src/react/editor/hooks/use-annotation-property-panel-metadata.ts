import { AnnotationType } from '../../../core/types.js';
import type { AnnotationPropertyPanelProps } from '../components/annotation-property-panel.types.js';
import { getLineLikeEndpoints, isLineLikeAnnotation } from '../line-utils.js';

type UseAnnotationPropertyPanelMetadataOptions = Pick<AnnotationPropertyPanelProps, 'annotation'>;

export function useAnnotationPropertyPanelMetadata({ annotation }: UseAnnotationPropertyPanelMetadataOptions) {
  const isLineLike = isLineLikeAnnotation(annotation);

  return {
    effectiveType: isLineLike ? AnnotationType.Line : annotation.type,
    lineEndpoints: isLineLike ? getLineLikeEndpoints(annotation) : undefined,
  };
}
