import type { Colour } from '../../../core/types.js';

export function applyMarkupOpacity(colour: Colour, opacity: number): Colour {
  const clampedOpacity = Math.max(0, Math.min(1, opacity));
  return {
    ...colour,
    a: Math.round(colour.a * clampedOpacity),
  };
}
