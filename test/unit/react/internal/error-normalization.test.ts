import { describe, expect, it } from 'vitest';
import { toError } from '../../../../src/react/internal/error-normalization.js';

describe('toError', () => {
  it('returns the same Error instance when input is already an Error', () => {
    const error = new Error('boom');
    expect(toError(error)).toBe(error);
  });

  it('converts string values to Error', () => {
    const error = toError('failure');
    expect(error).toBeInstanceOf(Error);
    expect(error.message).toBe('failure');
  });

  it('converts unknown objects via String()', () => {
    const error = toError({ code: 500 });
    expect(error).toBeInstanceOf(Error);
    expect(error.message).toBe('[object Object]');
  });
});
