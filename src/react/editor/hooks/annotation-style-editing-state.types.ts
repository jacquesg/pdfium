import type { Dispatch, MutableRefObject, RefObject, SetStateAction } from 'react';
import type { SerialisedAnnotation } from '../../../context/protocol.js';
import type { AnnotationBorder, AnnotationColourType, AnnotationType, Colour } from '../../../core/types.js';
import type { OptimisticAnnotationPatch } from '../internal/annotation-mutation-store.js';
import type { ToolConfigKey, ToolConfigMap } from '../types.js';
import type { AnnotationCrudActions } from './use-annotation-crud.js';

export interface UseAnnotationStyleEditingStateOptions {
  readonly annotation: SerialisedAnnotation;
  readonly effectiveType: AnnotationType;
  readonly crud: AnnotationCrudActions;
  readonly onToolConfigChange?:
    | (<T extends ToolConfigKey>(tool: T, config: Partial<ToolConfigMap[T]>) => void)
    | undefined;
  readonly onPreviewPatch?: ((annotationIndex: number, patch: OptimisticAnnotationPatch) => void) | undefined;
  readonly onClearPreviewPatch?: ((annotationIndex: number) => void) | undefined;
}

export interface AnnotationStyleEditingState {
  readonly applyBorderPreset: (borderWidth: number) => void;
  readonly applyFillPreset: (colour: Colour, enabled: boolean) => void;
  readonly applyOpacityPreset: (opacity: number) => void;
  readonly applyPreviewPatch: (patch: OptimisticAnnotationPatch) => void;
  readonly applyStrokePreset: (colour: Colour) => void;
  readonly borderEditStartRef: MutableRefObject<AnnotationBorder | null>;
  readonly canEditBorder: boolean;
  readonly canEditFill: boolean;
  readonly canEditStroke: boolean;
  readonly canToggleFill: boolean;
  readonly clearPendingBorderCommit: () => void;
  readonly clearStyleCommitTimer: () => void;
  readonly displayedBorder: AnnotationBorder | null;
  readonly fillColourType: AnnotationColourType;
  readonly fillEnabled: boolean;
  readonly flushPreviewIfStyleIdle: () => void;
  readonly flushStyleCommits: () => void;
  readonly getEditableBorderForWidth: (borderWidth: number) => AnnotationBorder | null;
  readonly liveInteriorColourRef: MutableRefObject<Colour>;
  readonly liveStrokeColourRef: MutableRefObject<Colour>;
  readonly localBorderWidth: number;
  readonly localInteriorColour: Colour;
  readonly localStrokeColour: Colour;
  readonly panelRootRef: RefObject<HTMLDivElement | null>;
  readonly pendingBorderCommitRef: MutableRefObject<{
    oldBorder: AnnotationBorder;
    newBorder: AnnotationBorder;
  } | null>;
  readonly pendingColourCommitRef: MutableRefObject<
    Record<AnnotationColourType, { oldColour: Colour; newColour: Colour } | null>
  >;
  readonly persistedBorderForCommitRef: MutableRefObject<AnnotationBorder | null>;
  readonly primaryAlpha: number;
  readonly primaryColourType: AnnotationColourType;
  readonly queueBorderCommit: (nextBorderWidth: number) => void;
  readonly queueColourCommit: (colourType: AnnotationColourType, oldColour: Colour, newColour: Colour) => void;
  readonly setFillEnabled: Dispatch<SetStateAction<boolean>>;
  readonly setLocalBorderWidth: Dispatch<SetStateAction<number>>;
  readonly setLocalInteriorColour: Dispatch<SetStateAction<Colour>>;
  readonly setLocalStrokeColour: Dispatch<SetStateAction<Colour>>;
  readonly skipBorderCommitOnBlurRef: MutableRefObject<boolean>;
}
