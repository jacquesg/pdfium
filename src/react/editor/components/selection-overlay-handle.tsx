import type { MouseEvent as ReactMouseEvent, ReactNode, PointerEvent as ReactPointerEvent } from 'react';
import {
  DEFAULT_HANDLE_BORDER_COLOUR,
  DEFAULT_HANDLE_FILL_COLOUR,
  HANDLE_HIT_SIZE,
  HANDLE_VISUAL_SIZE,
} from './selection-overlay.types.js';

interface SelectionHandleProps {
  readonly dataTestId: string;
  readonly cursor: string;
  readonly interactive: boolean;
  readonly left: number;
  readonly top: number;
  readonly onPointerDown?: (event: ReactPointerEvent) => void;
  readonly onMouseDown?: (event: ReactMouseEvent) => void;
}

export function SelectionHandle({
  dataTestId,
  cursor,
  interactive,
  left,
  top,
  onPointerDown,
  onMouseDown,
}: SelectionHandleProps): ReactNode {
  if (!interactive) {
    return null;
  }

  const ariaLabel = dataTestId.replaceAll('-', ' ');

  return (
    /* biome-ignore lint/a11y/useSemanticElements: custom drag handles need pointer-driven geometry control rather than native button behavior. */
    <div
      data-testid={dataTestId}
      role="button"
      aria-label={ariaLabel}
      tabIndex={-1}
      style={{
        position: 'absolute',
        left,
        top,
        width: HANDLE_HIT_SIZE,
        height: HANDLE_HIT_SIZE,
        display: 'grid',
        placeItems: 'center',
        cursor,
        touchAction: 'none',
      }}
      onPointerDown={onPointerDown}
      onMouseDown={onMouseDown}
    >
      <div
        style={{
          width: HANDLE_VISUAL_SIZE,
          height: HANDLE_VISUAL_SIZE,
          backgroundColor: DEFAULT_HANDLE_FILL_COLOUR,
          border: `1.5px solid ${DEFAULT_HANDLE_BORDER_COLOUR}`,
          borderRadius: HANDLE_VISUAL_SIZE,
          boxShadow: '0 1px 2px rgba(15, 23, 42, 0.18)',
          pointerEvents: 'none',
        }}
      />
    </div>
  );
}
