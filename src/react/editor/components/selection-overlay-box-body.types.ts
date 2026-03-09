import type { ReactNode } from 'react';
import type { SelectionBoxOverlayProps } from './selection-overlay-box-renderer.types.js';

export type SelectionBoxBodyProps = Pick<
  SelectionBoxOverlayProps,
  | 'appearance'
  | 'boxFillColour'
  | 'boxStrokeColour'
  | 'dragging'
  | 'interactive'
  | 'liveStrokeWidth'
  | 'overlayRect'
  | 'showLivePreview'
  | 'onBodyMouseDown'
  | 'onBodyPointerDown'
>;

export interface SelectionBoxBodySurfaceProps {
  readonly children?: ReactNode;
  readonly cursor: string;
  readonly fillColour: string;
  readonly interactive: boolean;
  readonly onBodyMouseDown: SelectionBoxBodyProps['onBodyMouseDown'];
  readonly onBodyPointerDown: SelectionBoxBodyProps['onBodyPointerDown'];
  readonly outline: string;
}
