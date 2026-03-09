import type { SerialisedQuadPoints } from '../../context/protocol.js';
import type { WorkerPDFiumDocument } from '../../context/worker-client.js';
import type { AnnotationBorder, AnnotationColourType, Colour } from '../../core/types.js';
import type { DocumentOpener } from './command-shared.js';

export interface CreateAnnotationOptions {
  readonly colour?: Colour;
  readonly strokeColour?: Colour;
  readonly interiorColour?: Colour;
  readonly borderWidth?: number;
  readonly isLineFallback?: boolean;
  readonly contents?: string;
  readonly quadPoints?: readonly SerialisedQuadPoints[];
  readonly inkPaths?: ReadonlyArray<ReadonlyArray<{ x: number; y: number }>>;
  readonly stampType?: string;
}

export interface SnapshotRestoreOptions {
  readonly document: WorkerPDFiumDocument;
  readonly openDocument: DocumentOpener;
}

export interface AnnotationStyleColourMutation {
  readonly colourType: AnnotationColourType;
  readonly oldColour: Colour;
  readonly newColour: Colour;
  readonly preserveBorder?: AnnotationBorder | null;
}

export interface AnnotationStyleBorderMutation {
  readonly oldBorder: AnnotationBorder;
  readonly newBorder: AnnotationBorder;
}

export interface SetAnnotationStyleCommandOptions {
  readonly stroke?: AnnotationStyleColourMutation;
  readonly interior?: AnnotationStyleColourMutation;
  readonly border?: AnnotationStyleBorderMutation;
}
