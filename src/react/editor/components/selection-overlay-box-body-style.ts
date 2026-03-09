import {
  DEFAULT_BOUNDS_BORDER_COLOUR,
  DEFAULT_DISABLED_BOUNDS_BACKGROUND,
  DEFAULT_DISABLED_BOUNDS_BORDER_COLOUR,
} from './selection-overlay.types.js';
import type { SelectionBoxBodyProps, SelectionBoxBodySurfaceProps } from './selection-overlay-box-body.types.js';

export function buildSelectionBoxBodySurfaceProps({
  appearance,
  dragging,
  interactive,
  onBodyMouseDown,
  onBodyPointerDown,
  showLivePreview,
}: SelectionBoxBodyProps): SelectionBoxBodySurfaceProps {
  if (appearance.kind === 'bounds' || showLivePreview) {
    return {
      children: undefined,
      cursor: interactive ? (dragging ? 'grabbing' : 'move') : 'default',
      fillColour: appearance.kind === 'bounds' && !interactive ? DEFAULT_DISABLED_BOUNDS_BACKGROUND : 'transparent',
      interactive,
      onBodyMouseDown,
      onBodyPointerDown,
      outline:
        appearance.kind === 'bounds'
          ? interactive
            ? `1px solid ${DEFAULT_BOUNDS_BORDER_COLOUR}`
            : `1px dashed ${DEFAULT_DISABLED_BOUNDS_BORDER_COLOUR}`
          : 'none',
    };
  }

  return {
    children: undefined,
    cursor: interactive ? 'move' : 'default',
    fillColour: 'transparent',
    interactive,
    onBodyMouseDown,
    onBodyPointerDown,
    outline: 'none',
  };
}
