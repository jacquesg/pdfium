import type { AnnotationPropertyPanelProps } from '../components/annotation-property-panel.types.js';
import { useAnnotationPropertyPanelMetadata } from './use-annotation-property-panel-metadata.js';
import { useAnnotationPropertyTextFields } from './use-annotation-property-text-fields.js';
import { useAnnotationStyleEditing } from './use-annotation-style-editing.js';

type UseAnnotationPropertyPanelStateOptions = Pick<
  AnnotationPropertyPanelProps,
  'annotation' | 'crud' | 'onClearPreviewPatch' | 'onPreviewPatch' | 'onToolConfigChange'
>;

export function useAnnotationPropertyPanelState({
  annotation,
  crud,
  onClearPreviewPatch,
  onPreviewPatch,
  onToolConfigChange,
}: UseAnnotationPropertyPanelStateOptions) {
  const { effectiveType, lineEndpoints } = useAnnotationPropertyPanelMetadata({ annotation });
  const styleEditing = useAnnotationStyleEditing({
    annotation,
    effectiveType,
    crud,
    onToolConfigChange,
    onPreviewPatch,
    onClearPreviewPatch,
  });
  const textFields = useAnnotationPropertyTextFields({ annotation, crud });

  return {
    effectiveType,
    lineEndpoints,
    styleEditing,
    textFields,
  };
}
