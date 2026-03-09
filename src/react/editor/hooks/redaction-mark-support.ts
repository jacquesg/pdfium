import type { CreateAnnotationOptions } from '../command.js';
import { REDACTION_FALLBACK_CONTENTS_MARKER } from '../redaction-utils.js';

const BLACK = { r: 0, g: 0, b: 0, a: 255 } as const;

export function buildFallbackRedactionOptions(options?: CreateAnnotationOptions): CreateAnnotationOptions {
  const fillColour = options?.colour ?? BLACK;
  return {
    contents: REDACTION_FALLBACK_CONTENTS_MARKER,
    strokeColour: fillColour,
    interiorColour: fillColour,
  };
}
