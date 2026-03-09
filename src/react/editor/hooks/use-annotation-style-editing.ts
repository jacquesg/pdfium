import type { SerialisedAnnotation } from '../../../context/protocol.js';
import type { AnnotationType } from '../../../core/types.js';
import type { OptimisticAnnotationPatch } from '../internal/annotation-mutation-store.js';
import type { ToolConfigKey, ToolConfigMap } from '../types.js';
import type { AnnotationCrudActions } from './use-annotation-crud.js';
import { useAnnotationStyleEditingControls } from './use-annotation-style-editing-controls.js';
import { useAnnotationStyleEditingState } from './use-annotation-style-editing-state.js';

export { MAX_BORDER_WIDTH } from './annotation-style-editing-support.js';

interface UseAnnotationStyleEditingOptions {
  readonly annotation: SerialisedAnnotation;
  readonly effectiveType: AnnotationType;
  readonly crud: AnnotationCrudActions;
  readonly onToolConfigChange?:
    | (<T extends ToolConfigKey>(tool: T, config: Partial<ToolConfigMap[T]>) => void)
    | undefined;
  readonly onPreviewPatch?: ((annotationIndex: number, patch: OptimisticAnnotationPatch) => void) | undefined;
  readonly onClearPreviewPatch?: ((annotationIndex: number) => void) | undefined;
}

export function useAnnotationStyleEditing({
  annotation,
  effectiveType,
  crud,
  onToolConfigChange,
  onPreviewPatch,
  onClearPreviewPatch,
}: UseAnnotationStyleEditingOptions) {
  const state = useAnnotationStyleEditingState({
    annotation,
    effectiveType,
    crud,
    onClearPreviewPatch,
    onPreviewPatch,
    onToolConfigChange,
  });
  const controls = useAnnotationStyleEditingControls({
    annotation,
    effectiveType,
    state,
  });

  return {
    canEditBorder: state.canEditBorder,
    canEditFill: state.canEditFill,
    canEditStroke: state.canEditStroke,
    canToggleFill: state.canToggleFill,
    displayedBorder: state.displayedBorder,
    fillEnabled: state.fillEnabled,
    ...controls,
    localBorderWidth: state.localBorderWidth,
    localInteriorColour: state.localInteriorColour,
    localStrokeColour: state.localStrokeColour,
    panelRootRef: state.panelRootRef,
    primaryAlpha: state.primaryAlpha,
  };
}
