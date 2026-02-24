import type { CharBox } from '../../core/types.js';

function isTextPanelTabId(value: string): value is 'characters' | 'extraction' {
  return value === 'characters' || value === 'extraction';
}

function formatCharacterBoundingBox(charBox: CharBox): string {
  return `[${charBox.left.toFixed(1)}, ${charBox.bottom.toFixed(1)}, ${charBox.right.toFixed(1)}, ${charBox.top.toFixed(1)}]`;
}

function parseCoordinateInput(value: string, fallback: number): number {
  if (value.trim() === '') return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export { formatCharacterBoundingBox, isTextPanelTabId, parseCoordinateInput };
