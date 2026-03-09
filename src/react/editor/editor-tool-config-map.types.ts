import type {
  FreeTextToolConfig,
  InkToolConfig,
  ShapeToolConfig,
  TextMarkupToolConfig,
} from './editor-basic-tool-config.types.js';
import type { RedactToolConfig } from './editor-redact-tool-config.types.js';
import type { StampToolConfig } from './editor-stamp-tool-config.types.js';

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
