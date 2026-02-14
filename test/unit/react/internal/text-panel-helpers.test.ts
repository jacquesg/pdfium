import { describe, expect, it } from 'vitest';
import {
  formatCharacterBoundingBox,
  isTextPanelTabId,
  parseCoordinateInput,
} from '../../../../src/react/internal/text-panel-helpers.js';

describe('text-panel-helpers', () => {
  it('checks supported text panel tab ids', () => {
    expect(isTextPanelTabId('characters')).toBe(true);
    expect(isTextPanelTabId('extraction')).toBe(true);
    expect(isTextPanelTabId('unknown')).toBe(false);
  });

  it('formats character bounding boxes', () => {
    expect(formatCharacterBoundingBox({ left: 1.25, bottom: 2.5, right: 3.75, top: 4.5 })).toBe('[1.3, 2.5, 3.8, 4.5]');
  });

  it('parses valid coordinate input and falls back for invalid input', () => {
    expect(parseCoordinateInput('42.5', 0)).toBe(42.5);
    expect(parseCoordinateInput('   ', 10)).toBe(10);
    expect(parseCoordinateInput('not-a-number', 7)).toBe(7);
  });
});
