import { describe, expect, it, vi } from 'vitest';
import { disposeSafely, disposeSafelyAsync } from '../../../../src/react/internal/dispose-safely.js';

describe('disposeSafely', () => {
  it('no-ops for null resources', () => {
    expect(() => disposeSafely(null)).not.toThrow();
    expect(() => disposeSafely(undefined)).not.toThrow();
  });

  it('calls dispose on provided resource', () => {
    const dispose = vi.fn();
    disposeSafely({ dispose });
    expect(dispose).toHaveBeenCalledTimes(1);
  });

  it('reports synchronous disposal failures via callback', () => {
    const error = new Error('sync dispose failed');
    const onError = vi.fn();

    expect(() =>
      disposeSafely(
        {
          dispose: () => {
            throw error;
          },
        },
        { onError },
      ),
    ).not.toThrow();

    expect(onError).toHaveBeenCalledWith(error);
  });

  it('reports asynchronous disposal failures via callback', async () => {
    const error = new Error('async dispose failed');
    const onError = vi.fn();

    disposeSafely(
      {
        dispose: () => Promise.reject(error),
      },
      { onError },
    );
    await Promise.resolve();
    await Promise.resolve();

    expect(onError).toHaveBeenCalledWith(error);
  });
});

describe('disposeSafelyAsync', () => {
  it('no-ops for null resources', async () => {
    await expect(disposeSafelyAsync(null)).resolves.toBeUndefined();
    await expect(disposeSafelyAsync(undefined)).resolves.toBeUndefined();
  });

  it('awaits successful disposal', async () => {
    const dispose = vi.fn().mockResolvedValue(undefined);
    await expect(disposeSafelyAsync({ dispose })).resolves.toBeUndefined();
    expect(dispose).toHaveBeenCalledTimes(1);
  });

  it('suppresses synchronous disposal throws and reports via callback', async () => {
    const error = new Error('sync dispose failed');
    const onError = vi.fn();
    await expect(
      disposeSafelyAsync(
        {
          dispose: () => {
            throw error;
          },
        },
        { onError },
      ),
    ).resolves.toBeUndefined();
    expect(onError).toHaveBeenCalledWith(error);
  });

  it('suppresses asynchronous disposal rejects and reports via callback', async () => {
    const error = new Error('async dispose failed');
    const onError = vi.fn();
    await expect(
      disposeSafelyAsync(
        {
          dispose: () => Promise.reject(error),
        },
        { onError },
      ),
    ).resolves.toBeUndefined();
    expect(onError).toHaveBeenCalledWith(error);
  });
});
