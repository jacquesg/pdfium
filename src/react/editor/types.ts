/**
 * Editor type definitions.
 *
 * @module react/editor/types
 */

import type { Colour } from '../../core/types.js';

// ────────────────────────────────────────────────────────────
// Tool definitions
// ────────────────────────────────────────────────────────────

/**
 * Available editor tools.
 */
export type EditorTool = 'freetext' | 'ink' | 'rectangle' | 'circle' | 'line' | 'stamp' | 'redact';

/**
 * One-shot text markup actions.
 */
export type TextMarkupActionTool = 'highlight' | 'underline' | 'strikeout';

/**
 * Editor mode.
 *
 * `idle` means neutral annotation-selection mode.
 */
export type EditorMode = 'idle' | EditorTool;

/**
 * All keys that have editable tool configuration.
 */
export type ToolConfigKey = EditorTool | TextMarkupActionTool;

// ────────────────────────────────────────────────────────────
// Selection
// ────────────────────────────────────────────────────────────

/**
 * Identifies a selected annotation on a specific page.
 */
export interface AnnotationSelection {
  readonly pageIndex: number;
  /** PDF annotation index (`SerialisedAnnotation.index`), not array position. */
  readonly annotationIndex: number;
}

// ────────────────────────────────────────────────────────────
// Tool configurations
// ────────────────────────────────────────────────────────────

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

/**
 * Standard stamp annotation types recognised by PDF viewers.
 */
export type StampType =
  | 'Approved'
  | 'AsIs'
  | 'Confidential'
  | 'Departmental'
  | 'Draft'
  | 'Experimental'
  | 'Expired'
  | 'Final'
  | 'ForComment'
  | 'ForPublicRelease'
  | 'NotApproved'
  | 'NotForPublicRelease'
  | 'Sold'
  | 'TopSecret';

/**
 * Configuration for the stamp annotation tool.
 */
export interface StampToolConfig {
  readonly stampType: StampType;
}

/**
 * Configuration for the redaction tool.
 */
export interface RedactToolConfig {
  readonly fillColour: Colour;
  readonly overlayText: string;
}

/**
 * Maps each editor tool to its configuration type.
 */
export interface ToolConfigMap {
  readonly ink: InkToolConfig;
  readonly highlight: TextMarkupToolConfig;
  readonly underline: TextMarkupToolConfig;
  readonly strikeout: TextMarkupToolConfig;
  readonly freetext: FreeTextToolConfig;
  readonly rectangle: ShapeToolConfig;
  readonly circle: ShapeToolConfig;
  readonly line: ShapeToolConfig;
  readonly stamp: StampToolConfig;
  readonly redact: RedactToolConfig;
}

// ────────────────────────────────────────────────────────────
// Default tool configurations
// ────────────────────────────────────────────────────────────

const BLACK: Colour = { r: 0, g: 0, b: 0, a: 255 };
const YELLOW: Colour = { r: 255, g: 255, b: 0, a: 255 };
const RED: Colour = { r: 255, g: 0, b: 0, a: 255 };
const GREEN: Colour = { r: 0, g: 128, b: 0, a: 255 };

/**
 * Sensible default configurations for each editor tool.
 */
export const DEFAULT_TOOL_CONFIGS: ToolConfigMap = {
  ink: { colour: BLACK, strokeWidth: 2 },
  highlight: { colour: YELLOW, opacity: 0.5 },
  underline: { colour: GREEN, opacity: 1 },
  strikeout: { colour: RED, opacity: 1 },
  freetext: { colour: BLACK, fontSize: 12, fontName: 'Helvetica' },
  rectangle: { strokeColour: BLACK, fillColour: null, strokeWidth: 1 },
  circle: { strokeColour: BLACK, fillColour: null, strokeWidth: 1 },
  line: { strokeColour: BLACK, fillColour: null, strokeWidth: 1 },
  stamp: { stampType: 'Draft' },
  redact: { fillColour: BLACK, overlayText: '' },
};
