import { describe, expect, test } from 'vitest';
import { buildSpreadRows, getSpreadPartnerIndex } from '../../../../src/react/internal/spread-layout.js';

describe('getSpreadPartnerIndex', () => {
  test('returns null in none mode', () => {
    expect(getSpreadPartnerIndex(0, 'none', 10)).toBeNull();
    expect(getSpreadPartnerIndex(5, 'none', 10)).toBeNull();
  });

  test('handles odd spread mode cover and pairs', () => {
    expect(getSpreadPartnerIndex(0, 'odd', 6)).toBeNull();
    expect(getSpreadPartnerIndex(1, 'odd', 6)).toBe(2);
    expect(getSpreadPartnerIndex(2, 'odd', 6)).toBe(1);
    expect(getSpreadPartnerIndex(3, 'odd', 6)).toBe(4);
    expect(getSpreadPartnerIndex(4, 'odd', 6)).toBe(3);
    expect(getSpreadPartnerIndex(5, 'odd', 6)).toBeNull();
  });

  test('handles even spread mode pairs', () => {
    expect(getSpreadPartnerIndex(0, 'even', 6)).toBe(1);
    expect(getSpreadPartnerIndex(1, 'even', 6)).toBe(0);
    expect(getSpreadPartnerIndex(2, 'even', 6)).toBe(3);
    expect(getSpreadPartnerIndex(3, 'even', 6)).toBe(2);
    expect(getSpreadPartnerIndex(4, 'even', 6)).toBe(5);
    expect(getSpreadPartnerIndex(5, 'even', 6)).toBe(4);
  });

  test('returns null for out-of-range indices', () => {
    expect(getSpreadPartnerIndex(-1, 'odd', 4)).toBeNull();
    expect(getSpreadPartnerIndex(4, 'odd', 4)).toBeNull();
    expect(getSpreadPartnerIndex(10, 'even', 4)).toBeNull();
  });
});

describe('buildSpreadRows', () => {
  test('returns one row per page in none mode', () => {
    expect(buildSpreadRows(4, 'none')).toEqual([[0], [1], [2], [3]]);
  });

  test('builds odd spread rows with solo cover', () => {
    expect(buildSpreadRows(5, 'odd')).toEqual([[0], [1, 2], [3, 4]]);
    expect(buildSpreadRows(6, 'odd')).toEqual([[0], [1, 2], [3, 4], [5]]);
  });

  test('builds even spread rows in pairs', () => {
    expect(buildSpreadRows(5, 'even')).toEqual([[0, 1], [2, 3], [4]]);
    expect(buildSpreadRows(6, 'even')).toEqual([
      [0, 1],
      [2, 3],
      [4, 5],
    ]);
  });

  test('returns empty rows for empty documents', () => {
    expect(buildSpreadRows(0, 'none')).toEqual([]);
    expect(buildSpreadRows(0, 'odd')).toEqual([]);
    expect(buildSpreadRows(0, 'even')).toEqual([]);
  });
});
