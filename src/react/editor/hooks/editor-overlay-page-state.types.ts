import type { RefObject } from 'react';
import type { SerialisedAnnotation } from '../../../context/protocol.js';
import type { WorkerPDFiumDocument } from '../../../context/worker-client.js';
import type { EditorContextValue } from '../context.js';
import type { OptimisticAnnotationPatch } from '../internal/annotation-mutation-store.js';
import type { AnnotationSelection } from '../types.js';
import type { EditorOverlayActionsResult } from './use-editor-overlay-actions.js';
import type { FreeTextInputActions } from './use-freetext-input.js';
import type { InkDrawingActions } from './use-ink-drawing.js';

export interface UseEditorOverlayPageStateOptions {
  readonly annotations: readonly SerialisedAnnotation[];
  readonly annotationsPending: boolean;
  readonly document: WorkerPDFiumDocument | null;
  readonly originalHeight: number;
  readonly pageIndex: number;
  readonly scale: number;
  readonly selectionEnabled?: boolean | undefined;
}

export interface EditorOverlayPageState {
  readonly actions: EditorOverlayActionsResult;
  readonly activeTool: EditorContextValue['activeTool'];
  readonly containerRef: RefObject<HTMLDivElement | null>;
  readonly effectiveSelectionEnabled: boolean;
  readonly freetextInput: FreeTextInputActions;
  readonly inkDrawing: InkDrawingActions;
  readonly isNeutralMode: boolean;
  readonly pendingMarkupAction: EditorContextValue['pendingMarkupAction'];
  readonly resolvedAnnotations: readonly SerialisedAnnotation[];
  readonly selectedAnnotation: SerialisedAnnotation | null;
  readonly selectedCommittedAnnotation: SerialisedAnnotation | null;
  readonly selectedPreviewPatch?: OptimisticAnnotationPatch | undefined;
  readonly selection: AnnotationSelection | null;
  readonly toolConfigs: EditorContextValue['toolConfigs'];
}
