import type { MouseEvent as ReactMouseEvent, ReactNode } from 'react';

interface EditorToolbarHistoryButtonsProps {
  readonly canRedo: boolean;
  readonly canUndo: boolean;
  readonly onMouseDown: (event: ReactMouseEvent<HTMLButtonElement>) => void;
  readonly onRedo: () => void;
  readonly onUndo: () => void;
}

export function EditorToolbarHistoryButtons({
  canRedo,
  canUndo,
  onMouseDown,
  onRedo,
  onUndo,
}: EditorToolbarHistoryButtonsProps): ReactNode {
  return (
    <>
      <hr aria-orientation="vertical" />
      <button
        type="button"
        data-testid="undo-button"
        disabled={!canUndo}
        onMouseDown={onMouseDown}
        onClick={onUndo}
        aria-label="Undo"
      >
        Undo
      </button>
      <button
        type="button"
        data-testid="redo-button"
        disabled={!canRedo}
        onMouseDown={onMouseDown}
        onClick={onRedo}
        aria-label="Redo"
      >
        Redo
      </button>
    </>
  );
}
