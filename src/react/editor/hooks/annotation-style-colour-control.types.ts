import type {
  ChangeEvent,
  Dispatch,
  MutableRefObject,
  FocusEvent as ReactFocusEvent,
  FormEvent as ReactFormEvent,
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent,
  RefObject,
  SetStateAction,
} from 'react';
import type { AnnotationColourType, AnnotationType, Colour } from '../../../core/types.js';
import type { OptimisticAnnotationPatch } from '../internal/annotation-mutation-store.js';

export type InputEvent = ChangeEvent<HTMLInputElement> | ReactFormEvent<HTMLInputElement>;

export interface UseAnnotationStyleColourControlsOptions {
  readonly annotationInteriorColour: Colour | undefined;
  readonly effectiveType: AnnotationType;
  readonly canEditFill: boolean;
  readonly canEditStroke: boolean;
  readonly canToggleFill: boolean;
  readonly fillColourType: AnnotationColourType;
  readonly fillEnabled: boolean;
  readonly liveInteriorColourRef: MutableRefObject<Colour>;
  readonly liveStrokeColourRef: MutableRefObject<Colour>;
  readonly panelRootRef: RefObject<HTMLDivElement | null>;
  readonly primaryColourType: AnnotationColourType;
  readonly queueColourCommit: (colourType: AnnotationColourType, oldColour: Colour, newColour: Colour) => void;
  readonly setFillEnabled: Dispatch<SetStateAction<boolean>>;
  readonly setLocalInteriorColour: Dispatch<SetStateAction<Colour>>;
  readonly setLocalStrokeColour: Dispatch<SetStateAction<Colour>>;
  readonly flushPreviewIfStyleIdle: () => void;
  readonly flushStyleCommits: () => void;
  readonly applyFillPreset: (colour: Colour, enabled: boolean) => void;
  readonly applyOpacityPreset: (opacity: number) => void;
  readonly applyPreviewPatch: (patch: OptimisticAnnotationPatch) => void;
  readonly applyStrokePreset: (colour: Colour) => void;
}

export interface UseAnnotationStyleColourControlsResult {
  readonly handleFillEnabledChange: (event: ChangeEvent<HTMLInputElement>) => void;
  readonly handleInteriorColourChange: (event: InputEvent) => void;
  readonly handleOpacityClick: (event: ReactMouseEvent<HTMLInputElement>) => void;
  readonly handleOpacityInputChange: (event: ChangeEvent<HTMLInputElement>) => void;
  readonly handleOpacityMouseEnd: (event: ReactMouseEvent<HTMLInputElement>) => void;
  readonly handleOpacityPointerEnd: (event: ReactPointerEvent<HTMLInputElement>) => void;
  readonly handleStrokeColourChange: (event: InputEvent) => void;
  readonly handleStyleInputBlur: (event: ReactFocusEvent<HTMLInputElement>) => void;
}
