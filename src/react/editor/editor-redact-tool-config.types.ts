import type { Colour } from '../../core/types.js';

/**
 * Configuration for the redaction tool.
 */
export interface RedactToolConfig {
  readonly fillColour: Colour;
  readonly overlayText: string;
}
