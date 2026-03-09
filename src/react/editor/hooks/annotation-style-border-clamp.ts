export const MAX_BORDER_WIDTH = 96;

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function clampBorderWidth(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return clamp(value, 0, MAX_BORDER_WIDTH);
}
