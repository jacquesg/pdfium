/**
 * Annotation property panel.
 *
 * Displays editable fields for the currently selected annotation:
 * colour pickers, opacity, border info, contents, author, subject,
 * and type-specific details.
 *
 * @module react/editor/components/annotation-property-panel
 */

import type { ReactNode } from 'react';
import { useAnnotationPropertyPanelState } from '../hooks/use-annotation-property-panel-state.js';
import type { AnnotationPropertyPanelProps } from './annotation-property-panel.types.js';
import { AnnotationPropertyPanelView } from './annotation-property-panel-view.js';

/**
 * Panel for editing properties of a selected annotation.
 *
 * Shows type label, colour pickers (stroke + interior), opacity slider,
 * border info, contents, author, and subject fields. Changes are applied
 * immediately via the CRUD hook.
 */
export function AnnotationPropertyPanel({
  annotation,
  crud,
  mutationPending = false,
  onToolConfigChange,
  onPreviewPatch,
  onClearPreviewPatch,
}: AnnotationPropertyPanelProps): ReactNode {
  const { effectiveType, lineEndpoints, styleEditing, textFields } = useAnnotationPropertyPanelState({
    annotation,
    crud,
    ...(onClearPreviewPatch !== undefined ? { onClearPreviewPatch } : {}),
    ...(onPreviewPatch !== undefined ? { onPreviewPatch } : {}),
    ...(onToolConfigChange !== undefined ? { onToolConfigChange } : {}),
  });

  return (
    <AnnotationPropertyPanelView
      annotation={annotation}
      effectiveType={effectiveType}
      lineEndpoints={lineEndpoints}
      mutationPending={mutationPending}
      styleEditing={styleEditing}
      textFields={textFields}
    />
  );
}

export type { AnnotationPropertyPanelProps } from './annotation-property-panel.types.js';
