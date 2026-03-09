import type { MouseEvent as ReactMouseEvent, ReactNode } from 'react';
import type { EditorToolbarToolDefinition } from '../toolbar-config.js';

interface EditorToolbarToolButtonProps {
  readonly active: boolean;
  readonly entry: EditorToolbarToolDefinition;
  readonly onClick: (tool: EditorToolbarToolDefinition['tool']) => void;
  readonly onMouseDown: (event: ReactMouseEvent<HTMLButtonElement>) => void;
}

export function EditorToolbarToolButton({
  active,
  entry,
  onClick,
  onMouseDown,
}: EditorToolbarToolButtonProps): ReactNode {
  return (
    <button
      type="button"
      data-testid={`tool-${entry.tool}`}
      data-tool={entry.tool}
      data-active={active}
      aria-pressed={active}
      onMouseDown={onMouseDown}
      onClick={() => onClick(entry.tool)}
    >
      {entry.label}
    </button>
  );
}
