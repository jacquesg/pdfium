import type { SerialisedAnnotation } from '../../../context/protocol.js';
import type { EditorContextValue } from '../context.js';
import { isEditorRedactionAnnotation } from '../redaction-utils.js';
import type { AnnotationSelection } from '../types.js';
import { canRenderHitTarget } from './editor-overlay-helpers.js';

export function hasRedactionLayer(annotations: readonly SerialisedAnnotation[]): boolean {
  return annotations.some(isEditorRedactionAnnotation);
}

export function hasSelectionHitTargetLayer(
  annotations: readonly SerialisedAnnotation[],
  effectiveSelectionEnabled: boolean,
  isNeutralMode: boolean,
): boolean {
  return isNeutralMode && effectiveSelectionEnabled && annotations.some(canRenderHitTarget);
}

export function hasSelectionOverlayLayer(
  effectiveSelectionEnabled: boolean,
  isNeutralMode: boolean,
  selectedAnnotation: SerialisedAnnotation | null,
): boolean {
  return isNeutralMode && effectiveSelectionEnabled && selectedAnnotation !== null;
}

export function hasActiveToolLayer(
  activeTool: EditorContextValue['activeTool'],
  effectiveSelectionEnabled: boolean,
  pendingMarkupAction: EditorContextValue['pendingMarkupAction'],
): boolean {
  return (
    effectiveSelectionEnabled &&
    (activeTool === 'ink' ||
      activeTool === 'freetext' ||
      activeTool === 'rectangle' ||
      activeTool === 'circle' ||
      activeTool === 'line' ||
      activeTool === 'redact' ||
      activeTool === 'stamp' ||
      pendingMarkupAction !== null)
  );
}

export function selectedAnnotationIndexForPage(
  selection: AnnotationSelection | null,
  pageIndex: number,
): number | null {
  return selection?.pageIndex === pageIndex ? selection.annotationIndex : null;
}
