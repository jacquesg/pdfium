import { AnnotationType, type Colour } from '../core/types.js';

const AP_STROKE_COLOUR_RE =
  /(-?(?:\d+(?:\.\d+)?|\.\d+))\s+(-?(?:\d+(?:\.\d+)?|\.\d+))\s+(-?(?:\d+(?:\.\d+)?|\.\d+))\s+RG\b/g;
const AP_INTERIOR_COLOUR_RE =
  /(-?(?:\d+(?:\.\d+)?|\.\d+))\s+(-?(?:\d+(?:\.\d+)?|\.\d+))\s+(-?(?:\d+(?:\.\d+)?|\.\d+))\s+rg\b/g;
const AP_STROKE_WIDTH_RE = /(-?(?:\d+(?:\.\d+)?|\.\d+))\s+w\b/g;
const AP_PAINTS_FILL_RE = /(?:^|[\s/])(?:f\*?|B\*?|b\*?)(?=[\s\r\n]|$)/m;

export const BORDER_FALLBACK_ANNOTATION_TYPES = new Set<AnnotationType>([
  AnnotationType.Square,
  AnnotationType.Circle,
  AnnotationType.Ink,
  AnnotationType.Line,
]);

function normalisedComponentToByte(value: number): number {
  const clamped = Math.max(0, Math.min(1, value));
  return Math.round(clamped * 255);
}

export function opacityToAlpha(opacity: number | undefined): number {
  if (opacity === undefined || !Number.isFinite(opacity)) {
    return 255;
  }
  const clamped = Math.max(0, Math.min(1, opacity));
  return Math.round(clamped * 255);
}

function parseLastAppearanceColour(appearance: string, regex: RegExp): Colour | undefined {
  regex.lastIndex = 0;
  let match: RegExpExecArray | null = regex.exec(appearance);
  let lastMatch: RegExpExecArray | null = null;
  while (match !== null) {
    lastMatch = match;
    match = regex.exec(appearance);
  }
  if (lastMatch === null) {
    return undefined;
  }

  const r = Number.parseFloat(lastMatch[1] ?? '');
  const g = Number.parseFloat(lastMatch[2] ?? '');
  const b = Number.parseFloat(lastMatch[3] ?? '');
  if (!Number.isFinite(r) || !Number.isFinite(g) || !Number.isFinite(b)) {
    return undefined;
  }

  return {
    r: normalisedComponentToByte(r),
    g: normalisedComponentToByte(g),
    b: normalisedComponentToByte(b),
    a: 255,
  };
}

export function parseAppearanceStrokeColour(appearance: string, opacity?: number): Colour | undefined {
  const parsed = parseLastAppearanceColour(appearance, AP_STROKE_COLOUR_RE);
  return parsed === undefined ? undefined : { ...parsed, a: opacityToAlpha(opacity) };
}

function appearancePaintsFill(appearance: string): boolean {
  return AP_PAINTS_FILL_RE.test(appearance);
}

export function parseAppearanceInteriorColour(appearance: string, opacity?: number): Colour | undefined {
  if (!appearancePaintsFill(appearance)) {
    return undefined;
  }
  const parsed = parseLastAppearanceColour(appearance, AP_INTERIOR_COLOUR_RE);
  return parsed === undefined ? undefined : { ...parsed, a: opacityToAlpha(opacity) };
}

export function resolveFallbackAppearanceColours(
  appearance: string | null | undefined,
  colours: {
    stroke: Colour | null;
    interior: Colour | null;
  },
  opacity: {
    stroke: number | undefined;
    interior: number | undefined;
  } = { stroke: undefined, interior: undefined },
): { stroke: Colour | null; interior: Colour | null } {
  if (appearance === null || appearance === undefined) {
    return colours;
  }

  return {
    stroke: colours.stroke ?? parseAppearanceStrokeColour(appearance, opacity.stroke) ?? null,
    interior: colours.interior ?? parseAppearanceInteriorColour(appearance, opacity.interior) ?? null,
  };
}

export function parseLastAppearanceStrokeWidth(appearance: string): number | undefined {
  AP_STROKE_WIDTH_RE.lastIndex = 0;
  let match: RegExpExecArray | null = AP_STROKE_WIDTH_RE.exec(appearance);
  let lastMatch: RegExpExecArray | null = null;
  while (match !== null) {
    lastMatch = match;
    match = AP_STROKE_WIDTH_RE.exec(appearance);
  }
  if (lastMatch === null) {
    return undefined;
  }

  const width = Number.parseFloat(lastMatch[1] ?? '');
  if (!Number.isFinite(width) || width < 0) {
    return undefined;
  }
  return width;
}
