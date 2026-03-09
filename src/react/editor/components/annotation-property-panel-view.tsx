import type { ReactNode } from 'react';
import type { SerialisedAnnotation } from '../../../context/protocol.js';
import type { AnnotationType } from '../../../core/types.js';
import type { useAnnotationPropertyPanelState } from '../hooks/use-annotation-property-panel-state.js';
import { AnnotationPropertyPanelInfo } from './annotation-property-panel-info.js';
import { AnnotationPropertyPanelStyleSection } from './annotation-property-panel-style-section.js';
import { AnnotationPropertyPanelTextSection } from './annotation-property-panel-text-section.js';

interface AnnotationPropertyPanelViewProps {
  readonly annotation: SerialisedAnnotation;
  readonly effectiveType: AnnotationType;
  readonly lineEndpoints: ReturnType<typeof useAnnotationPropertyPanelState>['lineEndpoints'];
  readonly mutationPending: boolean;
  readonly styleEditing: ReturnType<typeof useAnnotationPropertyPanelState>['styleEditing'];
  readonly textFields: ReturnType<typeof useAnnotationPropertyPanelState>['textFields'];
}

export function AnnotationPropertyPanelView({
  annotation,
  effectiveType,
  lineEndpoints,
  mutationPending,
  styleEditing,
  textFields,
}: AnnotationPropertyPanelViewProps): ReactNode {
  return (
    <div
      ref={styleEditing.panelRootRef}
      data-testid="annotation-property-panel"
      aria-busy={mutationPending}
      style={{ padding: 8, display: 'flex', flexDirection: 'column', gap: 8 }}
    >
      <div style={{ fontWeight: 600, fontSize: 13 }}>Annotation Properties</div>

      <AnnotationPropertyPanelInfo
        annotation={annotation}
        effectiveType={effectiveType}
        lineEndpoints={lineEndpoints}
      />
      <AnnotationPropertyPanelStyleSection {...styleEditing} />
      <AnnotationPropertyPanelTextSection {...textFields} />
    </div>
  );
}
