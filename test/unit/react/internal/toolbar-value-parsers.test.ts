import { describe, expect, it } from 'vitest';
import {
  clampPageNumber,
  clampZoomPercentage,
  parseToolbarScrollMode,
  parseToolbarSpreadMode,
} from '../../../../src/react/internal/toolbar-value-parsers.js';

describe('toolbar-value-parsers', () => {
  it('parses supported scroll mode values', () => {
    expect(parseToolbarScrollMode('continuous')).toBe('continuous');
    expect(parseToolbarScrollMode('single')).toBe('single');
    expect(parseToolbarScrollMode('horizontal')).toBe('horizontal');
    expect(parseToolbarScrollMode('invalid')).toBeNull();
  });

  it('parses supported spread mode values', () => {
    expect(parseToolbarSpreadMode('none')).toBe('none');
    expect(parseToolbarSpreadMode('odd')).toBe('odd');
    expect(parseToolbarSpreadMode('even')).toBe('even');
    expect(parseToolbarSpreadMode('invalid')).toBeNull();
  });

  it('clamps page number to document bounds', () => {
    expect(clampPageNumber(3, 10)).toBe(3);
    expect(clampPageNumber(0, 10)).toBe(1);
    expect(clampPageNumber(999, 10)).toBe(10);
    expect(clampPageNumber(Number.NaN, 10)).toBeNull();
    expect(clampPageNumber(Number.POSITIVE_INFINITY, 10)).toBeNull();
    expect(clampPageNumber(1, 0)).toBeNull();
  });

  it('clamps zoom percentage to supported range', () => {
    expect(clampZoomPercentage(5)).toBe(10);
    expect(clampZoomPercentage(125)).toBe(125);
    expect(clampZoomPercentage(900)).toBe(500);
  });
});
