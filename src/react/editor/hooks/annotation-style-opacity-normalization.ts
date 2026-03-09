import { clampOpacityAlpha } from './annotation-style-editing-support.js';

export interface NormalizedOpacityValue {
  readonly nextAlpha: number;
  readonly nextOpacity: number;
}

export function normalizeOpacityValue(parsed: number): NormalizedOpacityValue | null {
  if (!Number.isFinite(parsed)) {
    return null;
  }

  const nextAlpha = clampOpacityAlpha(parsed);
  return {
    nextAlpha,
    nextOpacity: nextAlpha / 255,
  };
}
