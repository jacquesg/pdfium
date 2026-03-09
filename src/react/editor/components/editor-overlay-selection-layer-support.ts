import type { SerialisedAnnotation } from '../../../context/protocol.js';
import { AnnotationType } from '../../../core/types.js';
import type { OptimisticAnnotationPatch } from '../internal/annotation-mutation-store.js';
import { getLineLikeEndpoints } from '../line-utils.js';
import { buildSelectionOverlayAppearance, isTransformableAnnotation } from './editor-overlay-helpers.js';

interface EditorOverlaySelectionStateOptions {
  readonly selectedAnnotation: SerialisedAnnotation;
  readonly selectedPreviewPatch?: OptimisticAnnotationPatch | undefined;
}

export function buildEditorOverlaySelectionState({
  selectedAnnotation,
  selectedPreviewPatch,
}: EditorOverlaySelectionStateOptions) {
  const interactiveSelection = isTransformableAnnotation(selectedAnnotation);
  const selectionAppearance = buildSelectionOverlayAppearance(selectedAnnotation);
  const selectedLineEndpoints = getLineLikeEndpoints(selectedAnnotation);
  const useFallbackLineCallbacks =
    selectedAnnotation.type === AnnotationType.Ink &&
    selectedAnnotation.lineFallback === true &&
    selectedLineEndpoints !== undefined;
  const activeTransformPreview =
    interactiveSelection &&
    selectionAppearance.kind !== 'bounds' &&
    selectedPreviewPatch !== undefined &&
    (selectedPreviewPatch.bounds !== undefined ||
      selectedPreviewPatch.line !== undefined ||
      selectedPreviewPatch.inkPaths !== undefined);

  return {
    activeTransformPreview,
    interactiveSelection,
    selectionAppearance,
    useFallbackLineCallbacks,
  };
}
