import { describe, expect, test } from 'vitest';
import { INTERNAL } from '../../../src/internal/symbols.js';

describe('INTERNAL symbol', () => {
  test('is a symbol', () => {
    expect(typeof INTERNAL).toBe('symbol');
  });

  test('has consistent identity via Symbol.for', () => {
    expect(INTERNAL).toBe(Symbol.for('@scaryterry/pdfium/internal'));
  });

  test('is not equal to a different symbol', () => {
    expect(INTERNAL).not.toBe(Symbol('other'));
  });

  test('description matches', () => {
    expect(INTERNAL.description).toBe('@scaryterry/pdfium/internal');
  });
});
