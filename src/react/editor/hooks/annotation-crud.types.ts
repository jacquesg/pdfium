import type { SerialisedAnnotation } from '../../../context/protocol.js';
import type { AnnotationBorder, AnnotationColourType, AnnotationType, Colour, Rect } from '../../../core/types.js';
import type {
  AnnotationStyleBorderMutation,
  AnnotationStyleColourMutation,
  CreateAnnotationOptions,
} from '../command.js';

export interface AnnotationCrudActions {
  createAnnotation(subtype: AnnotationType, rect: Rect, options?: CreateAnnotationOptions): Promise<number | undefined>;
  removeAnnotation(annotationIndex: number, snapshot: SerialisedAnnotation): Promise<void>;
  moveAnnotation(annotationIndex: number, oldRect: Rect, newRect: Rect): Promise<void>;
  resizeAnnotation(annotationIndex: number, oldRect: Rect, newRect: Rect): Promise<void>;
  setAnnotationColour(
    annotationIndex: number,
    colourType: AnnotationColourType,
    oldColour: Colour,
    newColour: Colour,
    preserveBorder?: AnnotationBorder | null,
  ): Promise<void>;
  setAnnotationBorder(annotationIndex: number, oldBorder: AnnotationBorder, newBorder: AnnotationBorder): Promise<void>;
  setAnnotationStyle?(
    annotationIndex: number,
    style: {
      stroke?: AnnotationStyleColourMutation;
      interior?: AnnotationStyleColourMutation;
      border?: AnnotationStyleBorderMutation;
    },
  ): Promise<void>;
  setAnnotationString(annotationIndex: number, key: string, oldValue: string, newValue: string): Promise<void>;
  replaceLineFallback(
    snapshot: SerialisedAnnotation,
    rect: Rect,
    start: { x: number; y: number },
    end: { x: number; y: number },
    strokeColour: Colour,
    strokeWidth: number,
  ): Promise<number | undefined>;
}
