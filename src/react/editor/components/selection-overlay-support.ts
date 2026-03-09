import type { CSSProperties } from 'react';
import type { ScreenRect } from '../shape-constraints.js';
import type { ScreenLine, SelectionOverlayAppearance } from './selection-overlay.types.js';
import { resolveSelectionOverlayRect } from './selection-overlay-rect-utils.js';
import {
  buildSelectionOverlayRootStyle,
  resolveSelectionOverlayColours,
  resolveSelectionOverlayLiveStrokeWidth,
} from './selection-overlay-style-support.js';

interface BuildSelectionOverlayViewModelOptions {
  readonly appearance: SelectionOverlayAppearance;
  readonly dragging: boolean;
  readonly interactive: boolean;
  readonly maxHeight: number;
  readonly maxWidth: number;
  readonly previewLine: ScreenLine | null;
  readonly previewRect: ScreenRect;
  readonly scale: number;
}

export interface SelectionOverlayViewModel {
  readonly boxFillColour: string;
  readonly boxStrokeColour: string;
  readonly lineStrokeColour: string;
  readonly liveStrokeWidth: number;
  readonly overlayRect: ScreenRect;
  readonly rootStyle: CSSProperties;
  readonly showLivePreview: boolean;
}

export function buildSelectionOverlayViewModel({
  appearance,
  dragging,
  interactive,
  maxHeight,
  maxWidth,
  previewLine,
  previewRect,
  scale,
}: BuildSelectionOverlayViewModelOptions): SelectionOverlayViewModel {
  const overlayRect = resolveSelectionOverlayRect({
    appearance,
    maxHeight,
    maxWidth,
    previewLine,
    previewRect,
  });
  const liveStrokeWidth = resolveSelectionOverlayLiveStrokeWidth(appearance, scale);
  const showLivePreview = dragging && appearance.kind !== 'bounds';
  const colours = resolveSelectionOverlayColours(appearance);

  return {
    ...colours,
    liveStrokeWidth,
    overlayRect,
    rootStyle: buildSelectionOverlayRootStyle(overlayRect, interactive),
    showLivePreview,
  };
}
