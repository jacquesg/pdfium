import type { UseEditorOverlaySelectionActionsOptions } from './editor-overlay-selection-actions.types.js';

export type UseEditorOverlaySelectionCommitActionsOptions = Pick<
  UseEditorOverlaySelectionActionsOptions,
  | 'crud'
  | 'runCreateAndSelectMutation'
  | 'runMutation'
  | 'scale'
  | 'selectedCommittedAnnotation'
  | 'selection'
  | 'toolConfigs'
>;

export interface EditorOverlaySelectionCommitActionsResult {
  readonly handleMove: (newRect: import('../../../core/types.js').Rect) => void;
  readonly handleMoveLine: (nextLine: {
    start: import('../../../core/types.js').Point;
    end: import('../../../core/types.js').Point;
  }) => void;
  readonly handleResize: (newRect: import('../../../core/types.js').Rect) => void;
  readonly handleResizeLine: (nextLine: {
    start: import('../../../core/types.js').Point;
    end: import('../../../core/types.js').Point;
  }) => void;
}
