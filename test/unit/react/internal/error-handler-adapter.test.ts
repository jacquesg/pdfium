import { describe, expect, it, vi } from 'vitest';
import { createErrorStateHandler } from '../../../../src/react/internal/error-handler-adapter.js';

describe('createErrorStateHandler', () => {
  it('passes through the same error instance to the setter', () => {
    const setError = vi.fn();
    const handleError = createErrorStateHandler(setError);
    const error = new Error('boom');

    handleError(error);

    expect(setError).toHaveBeenCalledTimes(1);
    expect(setError).toHaveBeenCalledWith(error);
  });

  it('forwards each error call independently', () => {
    const setError = vi.fn();
    const handleError = createErrorStateHandler(setError);
    const first = new Error('first');
    const second = new Error('second');

    handleError(first);
    handleError(second);

    expect(setError).toHaveBeenNthCalledWith(1, first);
    expect(setError).toHaveBeenNthCalledWith(2, second);
  });
});
