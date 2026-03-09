import type { Colour } from '../../core/types.js';

/**
 * Configuration for the ink (freehand drawing) tool.
 */
export interface InkToolConfig {
  readonly colour: Colour;
  readonly strokeWidth: number;
}

/**
 * Configuration for text markup tools (highlight, underline, strikeout).
 */
export interface TextMarkupToolConfig {
  readonly colour: Colour;
  readonly opacity: number;
}

/**
 * Configuration for shape tools (rectangle, circle, line).
 */
export interface ShapeToolConfig {
  readonly strokeColour: Colour;
  readonly fillColour: Colour | null;
  readonly strokeWidth: number;
}

/**
 * Configuration for the free text annotation tool.
 */
export interface FreeTextToolConfig {
  readonly colour: Colour;
  readonly fontSize: number;
  readonly fontName: string;
}
