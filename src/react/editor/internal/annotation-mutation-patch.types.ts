import type { SerialisedAnnotation } from '../../../context/protocol.js';
import type { AnnotationBorder, Colour, Rect } from '../../../core/types.js';

export const FLOAT_TOLERANCE = 1e-3;
export const STALE_SETTLED_PATCH_GRACE_MS = 1_500;

export interface OptimisticAnnotationPatch {
  readonly bounds?: Rect;
  readonly border?: AnnotationBorder | null;
  readonly colour?: {
    readonly stroke?: Colour;
    readonly interior?: Colour;
  };
  readonly line?: SerialisedAnnotation['line'];
  readonly inkPaths?: SerialisedAnnotation['inkPaths'];
  readonly contents?: string;
  readonly author?: string;
  readonly subject?: string;
}

export interface ResolvedEditorAnnotationsOptions {
  /** Include transient preview patches in the resolved annotation list. Default: true. */
  readonly includePreview?: boolean;
}

export interface OptimisticAnnotationEntry {
  readonly pendingCount: number;
  readonly patch: OptimisticAnnotationPatch;
  readonly settledAtMs: number | null;
}
