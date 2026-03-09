import type { SerialisedAnnotation } from '../../../context/protocol.js';
import type { WorkerPDFiumDocument } from '../../../context/worker-client.js';
import type { AnnotationType, Colour, Rect } from '../../../core/types.js';
import type { CreateAnnotationOptions, EditorCommand, PageAccessor } from '../command.js';
import type { AnnotationMutationStore, OptimisticAnnotationPatch } from '../internal/annotation-mutation-store.js';
import type { AnnotationCrudActions } from './use-annotation-crud.js';

export type GeometryMutationActions = Pick<
  AnnotationCrudActions,
  'createAnnotation' | 'moveAnnotation' | 'removeAnnotation' | 'replaceLineFallback' | 'resizeAnnotation'
>;

export interface UseAnnotationGeometryMutationsOptions {
  readonly document: WorkerPDFiumDocument | null;
  readonly getPage: PageAccessor;
  readonly mutationStore: AnnotationMutationStore;
  readonly pageIndex: number;
  readonly pushCommand: (command: EditorCommand) => Promise<void>;
  readonly runWithOptimisticMutation: (
    annotationIndex: number,
    patch: OptimisticAnnotationPatch,
    operation: () => Promise<void>,
  ) => Promise<void>;
}

export interface AnnotationCreateRemoveMutationsResult
  extends Pick<GeometryMutationActions, 'createAnnotation' | 'removeAnnotation'> {}

export interface AnnotationRectMutationsResult
  extends Pick<GeometryMutationActions, 'moveAnnotation' | 'resizeAnnotation'> {}

export interface AnnotationLineFallbackMutationsResult extends Pick<GeometryMutationActions, 'replaceLineFallback'> {}

export type CreateAnnotationMutation = (
  subtype: AnnotationType,
  rect: Rect,
  options?: CreateAnnotationOptions,
) => Promise<number | undefined>;

export type RemoveAnnotationMutation = (annotationIndex: number, snapshot: SerialisedAnnotation) => Promise<void>;

export type RectMutation = (annotationIndex: number, oldRect: Rect, newRect: Rect) => Promise<void>;

export type ReplaceLineFallbackMutation = (
  snapshot: SerialisedAnnotation,
  rect: Rect,
  start: { x: number; y: number },
  end: { x: number; y: number },
  strokeColour: Colour,
  strokeWidth: number,
) => Promise<number | undefined>;
