import type { WorkerPDFiumDocument } from '../../../context/worker-client.js';
import type { AnnotationBorder, AnnotationColourType, Colour } from '../../../core/types.js';
import type {
  AnnotationStyleBorderMutation,
  AnnotationStyleColourMutation,
  EditorCommand,
  PageAccessor,
} from '../command.js';
import type { OptimisticAnnotationPatch } from '../internal/annotation-mutation-store.js';
import type { AnnotationCrudActions } from './use-annotation-crud.js';

export type StyleMutationActions = Pick<
  AnnotationCrudActions,
  'setAnnotationBorder' | 'setAnnotationColour' | 'setAnnotationString' | 'setAnnotationStyle'
>;

export interface UseAnnotationStyleMutationsOptions {
  readonly document: WorkerPDFiumDocument | null;
  readonly getPage: PageAccessor;
  readonly pushCommand: (command: EditorCommand) => Promise<void>;
  readonly runWithOptimisticMutation: (
    annotationIndex: number,
    patch: OptimisticAnnotationPatch,
    operation: () => Promise<void>,
  ) => Promise<void>;
  readonly warnIfStyleMutationBursts: (kind: 'border' | 'colour', annotationIndex: number) => void;
}

export interface AnnotationColourStringMutationsResult
  extends Pick<StyleMutationActions, 'setAnnotationColour' | 'setAnnotationString'> {}

export interface AnnotationBorderStyleMutationsResult
  extends Pick<StyleMutationActions, 'setAnnotationBorder' | 'setAnnotationStyle'> {}

export type SetAnnotationColourMutation = (
  annotationIndex: number,
  colourType: AnnotationColourType,
  oldColour: Colour,
  newColour: Colour,
  preserveBorder?: AnnotationBorder | null,
) => Promise<void>;

export type SetAnnotationBorderMutation = (
  annotationIndex: number,
  oldBorder: AnnotationBorder,
  newBorder: AnnotationBorder,
) => Promise<void>;

export type SetAnnotationStyleMutation = (
  annotationIndex: number,
  style: {
    stroke?: AnnotationStyleColourMutation;
    interior?: AnnotationStyleColourMutation;
    border?: AnnotationStyleBorderMutation;
  },
) => Promise<void>;
