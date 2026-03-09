import type { SerialisedAnnotation } from '../../../context/protocol.js';
import type { WorkerPDFiumDocument } from '../../../context/worker-client.js';
import { useAnnotationMutationStore, useResolvedEditorAnnotations } from '../internal/annotation-mutation-store.js';
import { useAnnotationCrud } from './use-annotation-crud.js';
import { useEditorOverlayModeState } from './use-editor-overlay-mode-state.js';
import { useFreeTextInput } from './use-freetext-input.js';
import { useInkDrawing } from './use-ink-drawing.js';
import { useRedaction } from './use-redaction.js';
import { useTextMarkup } from './use-text-markup.js';

interface UseEditorOverlayServicesOptions {
  readonly annotations: readonly SerialisedAnnotation[];
  readonly document: WorkerPDFiumDocument | null;
  readonly pageIndex: number;
  readonly selectionEnabled?: boolean | undefined;
}

export type ReturnTypeUseEditorOverlayServices = ReturnType<typeof useEditorOverlayServices>;

export function useEditorOverlayServices({
  annotations,
  document,
  pageIndex,
  selectionEnabled,
}: UseEditorOverlayServicesOptions) {
  const modeState = useEditorOverlayModeState(selectionEnabled);
  const crud = useAnnotationCrud(document, pageIndex);
  const mutationStore = useAnnotationMutationStore();
  const committedAnnotations = useResolvedEditorAnnotations(pageIndex, annotations, { includePreview: false });
  const resolvedAnnotations = useResolvedEditorAnnotations(pageIndex, annotations);
  const inkDrawing = useInkDrawing();
  const freetextInput = useFreeTextInput(crud);
  const textMarkup = useTextMarkup(crud);
  const redaction = useRedaction(crud, document);

  return {
    ...modeState,
    committedAnnotations,
    crud,
    freetextInput,
    inkDrawing,
    mutationStore,
    redaction,
    resolvedAnnotations,
    textMarkup,
  };
}
