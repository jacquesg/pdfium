import type {
  ChangeEvent,
  Dispatch,
  MutableRefObject,
  KeyboardEvent as ReactKeyboardEvent,
  SetStateAction,
} from 'react';
import type { AnnotationBorder } from '../../../core/types.js';

export interface UseAnnotationStyleBorderControlsOptions {
  readonly annotationBorder: AnnotationBorder | null | undefined;
  readonly canEditBorder: boolean;
  readonly localBorderWidth: number;
  readonly pendingBorderCommitRef: MutableRefObject<{
    oldBorder: AnnotationBorder;
    newBorder: AnnotationBorder;
  } | null>;
  readonly persistedBorderForCommitRef: MutableRefObject<AnnotationBorder | null>;
  readonly skipBorderCommitOnBlurRef: MutableRefObject<boolean>;
  readonly borderEditStartRef: MutableRefObject<AnnotationBorder | null>;
  readonly clearPendingBorderCommit: () => void;
  readonly clearStyleCommitTimer: () => void;
  readonly flushPreviewIfStyleIdle: () => void;
  readonly flushStyleCommits: () => void;
  readonly queueBorderCommit: (nextBorderWidth: number) => void;
  readonly setLocalBorderWidth: Dispatch<SetStateAction<number>>;
  readonly applyBorderPreset: (borderWidth: number) => void;
  readonly applyPreviewPatch: (patch: { border: AnnotationBorder }) => void;
  readonly getEditableBorderForWidth: (borderWidth: number) => AnnotationBorder | null;
}

export interface AnnotationStyleBorderPreviewControlsResult {
  readonly handleBorderWidthChange: (event: ChangeEvent<HTMLInputElement>) => void;
  readonly handleBorderWidthFocus: () => void;
}

export interface AnnotationStyleBorderCommitControlsResult {
  readonly handleBorderWidthCommit: (event?: { currentTarget: { value: string } }) => void;
  readonly handleBorderWidthKeyDown: (event: ReactKeyboardEvent<HTMLInputElement>) => void;
}
