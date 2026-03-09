import type { ReactNode, RefObject } from 'react';
import type { SerialisedAnnotation } from '../../../context/protocol.js';
import type { WorkerPDFiumDocument } from '../../../context/worker-client.js';
import type { EditorContextValue } from '../context.js';
import type { EditorOverlayActionsResult } from '../hooks/use-editor-overlay-actions.js';
import type { FreeTextInputActions } from '../hooks/use-freetext-input.js';
import type { InkDrawingActions } from '../hooks/use-ink-drawing.js';
import type { OptimisticAnnotationPatch } from '../internal/annotation-mutation-store.js';
import type { AnnotationSelection, ToolConfigMap } from '../types.js';

export interface EditorOverlayLayersProps {
  readonly actions: EditorOverlayActionsResult;
  readonly activeTool: EditorContextValue['activeTool'];
  readonly containerRef: RefObject<HTMLDivElement | null>;
  readonly document: WorkerPDFiumDocument | null;
  readonly effectiveSelectionEnabled: boolean;
  readonly freetextInput: FreeTextInputActions;
  readonly height: number;
  readonly inkDrawing: InkDrawingActions;
  readonly isNeutralMode: boolean;
  readonly originalHeight: number;
  readonly pageIndex: number;
  readonly pendingMarkupAction: EditorContextValue['pendingMarkupAction'];
  readonly resolvedAnnotations: readonly SerialisedAnnotation[];
  readonly scale: number;
  readonly selectedAnnotation: SerialisedAnnotation | null;
  readonly selectedCommittedAnnotation: SerialisedAnnotation | null;
  readonly selectedPreviewPatch?: OptimisticAnnotationPatch | undefined;
  readonly selection: AnnotationSelection | null;
  readonly toolConfigs: ToolConfigMap;
  readonly width: number;
}

export interface EditorOverlayVisibleLayersProps extends EditorOverlayLayersProps {
  readonly showToolLayers: boolean;
}

export type EditorOverlayLayersNode = ReactNode;
