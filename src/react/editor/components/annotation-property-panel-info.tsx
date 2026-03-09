import type { ReactNode } from 'react';
import type { SerialisedAnnotation } from '../../../context/protocol.js';
import { AnnotationType } from '../../../core/types.js';
import type { SerialisedLineEndpoints } from '../line-utils.js';
import { annotationTypeName } from './annotation-property-panel-support.js';

interface AnnotationPropertyPanelInfoProps {
  readonly annotation: SerialisedAnnotation;
  readonly effectiveType: AnnotationType;
  readonly lineEndpoints?: SerialisedLineEndpoints | undefined;
}

export function AnnotationPropertyPanelInfo({
  annotation,
  effectiveType,
  lineEndpoints,
}: AnnotationPropertyPanelInfoProps): ReactNode {
  return (
    <>
      <div data-testid="annotation-type-label" style={{ fontSize: 11, color: '#666' }}>
        Type: {annotationTypeName(effectiveType)}
      </div>

      {effectiveType === AnnotationType.Ink && annotation.inkPaths !== undefined && (
        <div data-testid="ink-info" style={{ fontSize: 11, color: '#666' }}>
          Ink strokes: {annotation.inkPaths.length}
        </div>
      )}

      {effectiveType === AnnotationType.Line && lineEndpoints !== undefined && (
        <div data-testid="line-info" style={{ fontSize: 11, color: '#666' }}>
          Line: ({lineEndpoints.start.x.toFixed(1)}, {lineEndpoints.start.y.toFixed(1)}) to (
          {lineEndpoints.end.x.toFixed(1)}, {lineEndpoints.end.y.toFixed(1)})
        </div>
      )}

      {(effectiveType === AnnotationType.Highlight ||
        effectiveType === AnnotationType.Underline ||
        effectiveType === AnnotationType.Strikeout) &&
        annotation.attachmentPoints !== undefined && (
          <div data-testid="markup-info" style={{ fontSize: 11, color: '#666' }}>
            Quad points: {annotation.attachmentPoints.length}
          </div>
        )}
    </>
  );
}
