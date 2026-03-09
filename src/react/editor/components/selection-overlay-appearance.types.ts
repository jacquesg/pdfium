import type { Colour, Point, Rect } from '../../../core/types.js';

export type TextMarkupSelectionKind = 'highlight' | 'underline' | 'strikeout' | 'squiggly';

export interface ScreenLine {
  start: { x: number; y: number };
  end: { x: number; y: number };
}

export interface SelectionMarkupQuad {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  x3: number;
  y3: number;
  x4: number;
  y4: number;
}

export type SelectionOverlayAppearance =
  | {
      kind: 'bounds';
    }
  | {
      kind: 'rectangle';
      strokeColour?: Colour;
      fillColour?: Colour | null;
      strokeWidth?: number;
    }
  | {
      kind: 'ellipse';
      strokeColour?: Colour;
      fillColour?: Colour | null;
      strokeWidth?: number;
    }
  | {
      kind: 'line';
      endpoints: {
        start: Point;
        end: Point;
      };
      strokeColour?: Colour;
      strokeWidth?: number;
    }
  | {
      kind: 'text-markup';
      markupType: TextMarkupSelectionKind;
      quads: readonly SelectionMarkupQuad[];
    };

export type BoxAppearance = Extract<SelectionOverlayAppearance, { kind: 'bounds' | 'rectangle' | 'ellipse' }>;

export interface SelectionOverlayProps {
  readonly rect: Rect;
  readonly scale: number;
  readonly originalHeight: number;
  readonly maxWidth?: number;
  readonly maxHeight?: number;
  readonly appearance?: SelectionOverlayAppearance;
  readonly interactive?: boolean;
  onPreviewRect?(previewRect: Rect): void;
  onPreviewLine?(previewLine: { start: Point; end: Point }): void;
  onPreviewClear?(): void;
  onMove?(newRect: Rect): void;
  onResize?(newRect: Rect): void;
  onMoveLine?(nextLine: { start: Point; end: Point }): void;
  onResizeLine?(nextLine: { start: Point; end: Point }): void;
}
