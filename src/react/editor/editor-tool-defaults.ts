import type { Colour } from '../../core/types.js';
import type { ToolConfigMap } from './editor-tool-config.types.js';

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
