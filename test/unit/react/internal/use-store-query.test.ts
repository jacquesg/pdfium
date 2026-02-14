import { act, waitFor } from '@testing-library/react';
import { startTransition } from 'react';
import { describe, expect, test, vi } from 'vitest';
import { PDFiumError, PDFiumErrorCode } from '../../../../src/core/errors.js';
import { queryStore } from '../../../../src/react/internal/query-store.js';
import { useStoreQuery } from '../../../../src/react/internal/use-store-query.js';
import { renderHookWithStores } from '../../../react-setup.js';

describe('useStoreQuery', () => {
  // react-setup.ts already clears stores between tests

  describe('cache hit', () => {
    test('returns data synchronously when cache already has a success entry', () => {
      queryStore.set('hit-key', { status: 'success', data: 'cached-value' });

      const fetcher = vi.fn().mockResolvedValue('should-not-call');
      const { result } = renderHookWithStores(() => useStoreQuery<string>('hit-key', fetcher));

      expect(result.current.data).toBe('cached-value');
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.isPlaceholderData).toBe(false);
      expect(fetcher).not.toHaveBeenCalled();
    });
  });

  describe('cache miss', () => {
    test('accepts synchronous non-promise fetcher return values', async () => {
      const fetcher = vi.fn(() => 'sync-value' as unknown as Promise<string>);
      const { result } = renderHookWithStores(() => useStoreQuery<string>('sync-value-key', fetcher));

      await waitFor(() => {
        expect(result.current.data).toBe('sync-value');
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    test('transitions from loading to success after fetcher resolves', async () => {
      const fetcher = vi.fn().mockResolvedValue('fetched-data');
      const { result } = renderHookWithStores(() => useStoreQuery<string>('miss-key', fetcher));

      // Initially loading
      expect(result.current.isLoading).toBe(true);
      expect(result.current.data).toBeUndefined();

      await waitFor(() => {
        expect(result.current.data).toBe('fetched-data');
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    // Both hooks share the module-level default queryStore (no provider wrapper).
    // This validates real-world deduplication when consumers share a store instance.
    test('deduplicates in-flight fetches for the same key', async () => {
      let resolve!: (value: string) => void;
      const fetcher = vi.fn().mockImplementation(
        () =>
          new Promise<string>((r) => {
            resolve = r;
          }),
      );

      const first = renderHookWithStores(() => useStoreQuery<string>('shared-key', fetcher));
      const second = renderHookWithStores(() => useStoreQuery<string>('shared-key', fetcher));

      await act(async () => {
        await Promise.resolve();
      });

      expect(fetcher).toHaveBeenCalledTimes(1);

      await act(async () => {
        resolve('shared-result');
        await Promise.resolve();
      });

      await waitFor(() => {
        expect(first.result.current.data).toBe('shared-result');
        expect(second.result.current.data).toBe('shared-result');
      });
    });

    test('remaining subscriber recovers if the subscriber that started fetch unmounts mid-flight', async () => {
      let resolveFirst!: (value: string) => void;
      const fetcher = vi
        .fn()
        .mockImplementationOnce(
          () =>
            new Promise<string>((resolve) => {
              resolveFirst = resolve;
            }),
        )
        .mockResolvedValueOnce('should-not-be-called');

      const first = renderHookWithStores(() => useStoreQuery<string>('shared-unmount-key', fetcher));
      const second = renderHookWithStores(() => useStoreQuery<string>('shared-unmount-key', fetcher));

      await act(async () => {
        await Promise.resolve();
      });
      expect(fetcher).toHaveBeenCalledTimes(1);

      first.unmount();

      // Resolve the abandoned first fetch — it should not get stuck in pending.
      await act(async () => {
        resolveFirst('stale-data');
        await Promise.resolve();
      });

      await waitFor(() => {
        expect(second.result.current.data).toBe('stale-data');
      });
      expect(fetcher).toHaveBeenCalledTimes(1);
    });
  });

  describe('error handling', () => {
    test('handles synchronously thrown fetcher errors as query errors', async () => {
      const fetcher = vi.fn(() => {
        throw new Error('sync-fail');
      });

      const { result } = renderHookWithStores(() => useStoreQuery<string>('sync-error-key', fetcher));

      await waitFor(() => {
        expect(result.current.error).toBeTruthy();
      });

      expect(result.current.error?.message).toBe('sync-fail');
      expect(result.current.isLoading).toBe(false);
      expect(result.current.data).toBeUndefined();
    });

    test('sets error state when fetcher rejects', async () => {
      const error = new Error('fetch failed');
      const fetcher = vi.fn().mockRejectedValue(error);
      const { result } = renderHookWithStores(() => useStoreQuery<string>('error-key', fetcher));

      await waitFor(() => {
        expect(result.current.error).toBeTruthy();
      });

      expect(result.current.error?.message).toBe('fetch failed');
      expect(result.current.data).toBeUndefined();
    });

    test('wraps non-Error rejections in an Error', async () => {
      const fetcher = vi.fn().mockRejectedValue('string-error');
      const { result } = renderHookWithStores(() => useStoreQuery<string>('non-error-key', fetcher));

      await waitFor(() => {
        expect(result.current.error).toBeTruthy();
      });

      expect(result.current.error).toBeInstanceOf(Error);
      expect(result.current.error?.message).toBe('string-error');
    });
  });

  describe('disabled state', () => {
    test('does not fetch when enabled is false', async () => {
      const fetcher = vi.fn().mockResolvedValue('should-not-call');
      const { result } = renderHookWithStores(() => useStoreQuery<string>('disabled-key', fetcher, { enabled: false }));

      // Allow microtasks to flush
      await act(async () => {
        await Promise.resolve();
      });

      expect(fetcher).not.toHaveBeenCalled();
      expect(result.current.data).toBeUndefined();
      expect(result.current.isLoading).toBe(false);
    });

    test('exits loading state when a pending query is disabled', async () => {
      const deferred = Promise.withResolvers<string>();
      const fetcher = vi.fn(() => deferred.promise);
      let enabled = true;
      const { result, rerender } = renderHookWithStores(() =>
        useStoreQuery<string>('toggle-disabled-key', fetcher, { enabled }),
      );

      expect(result.current.isLoading).toBe(true);

      enabled = false;
      rerender();

      await act(async () => {
        await Promise.resolve();
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.data).toBeUndefined();
      expect(result.current.error).toBeNull();
    });

    test('does not fetch when key is null', async () => {
      const fetcher = vi.fn().mockResolvedValue('should-not-call');
      const { result } = renderHookWithStores(() => useStoreQuery<string>(null, fetcher));

      await act(async () => {
        await Promise.resolve();
      });

      expect(fetcher).not.toHaveBeenCalled();
      expect(result.current.data).toBeUndefined();
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('keepPreviousData', () => {
    test('shows previous data as placeholder while new key is loading', async () => {
      // Seed the first key with data
      queryStore.set('prev-key', { status: 'success', data: 'old-data' });

      let currentKey = 'prev-key';
      const fetcher = vi
        .fn()
        .mockImplementation(() => new Promise<string>((resolve) => setTimeout(() => resolve('new-data'), 50)));

      const { result, rerender } = renderHookWithStores(() =>
        useStoreQuery<string>(currentKey, fetcher, { keepPreviousData: true }),
      );

      // Initially shows cached data for prev-key
      expect(result.current.data).toBe('old-data');
      expect(result.current.isPlaceholderData).toBe(false);

      // Change key — new key has no cache entry
      currentKey = 'next-key';
      rerender();

      // Should show previous data as placeholder while loading
      await waitFor(() => {
        expect(result.current.isPlaceholderData).toBe(true);
      });
      expect(result.current.data).toBe('old-data');

      // Once the new data resolves, placeholder flag clears
      await waitFor(() => {
        expect(result.current.data).toBe('new-data');
      });
      expect(result.current.isPlaceholderData).toBe(false);
    });

    test('does not show placeholder data when keepPreviousData is false', async () => {
      queryStore.set('no-keep-key', { status: 'success', data: 'initial' });

      let currentKey = 'no-keep-key';
      const fetcher = vi
        .fn()
        .mockImplementation(() => new Promise<string>((resolve) => setTimeout(() => resolve('next'), 50)));

      const { result, rerender } = renderHookWithStores(() =>
        useStoreQuery<string>(currentKey, fetcher, { keepPreviousData: false }),
      );

      expect(result.current.data).toBe('initial');

      currentKey = 'no-keep-new-key';
      rerender();

      // With keepPreviousData=false, data should be undefined while loading
      expect(result.current.data).toBeUndefined();
      expect(result.current.isPlaceholderData).toBe(false);
    });
  });

  describe('disposed document/page errors', () => {
    test('sets error state for DOC_ALREADY_CLOSED (not stuck pending)', async () => {
      const error = new PDFiumError(PDFiumErrorCode.DOC_ALREADY_CLOSED);
      const fetcher = vi.fn().mockRejectedValue(error);
      const { result } = renderHookWithStores(() => useStoreQuery<string>('doc-closed-key', fetcher));

      await waitFor(() => {
        expect(result.current.error).toBeTruthy();
      });

      expect(result.current.error).toBe(error);
      expect(result.current.isLoading).toBe(false);
    });

    test('sets error state for PAGE_ALREADY_CLOSED (not stuck pending)', async () => {
      const error = new PDFiumError(PDFiumErrorCode.PAGE_ALREADY_CLOSED);
      const fetcher = vi.fn().mockRejectedValue(error);
      const { result } = renderHookWithStores(() => useStoreQuery<string>('page-closed-key', fetcher));

      await waitFor(() => {
        expect(result.current.error).toBeTruthy();
      });

      expect(result.current.error).toBe(error);
      expect(result.current.isLoading).toBe(false);
    });

    test('does not silence other PDFiumError codes', async () => {
      const error = new PDFiumError(PDFiumErrorCode.DOC_FORMAT_INVALID);
      const fetcher = vi.fn().mockRejectedValue(error);
      const { result } = renderHookWithStores(() => useStoreQuery<string>('other-error-key', fetcher));

      await waitFor(() => {
        expect(result.current.error).toBeTruthy();
      });

      expect(result.current.error?.message).toBe('The document format is invalid or unsupported');
    });
  });

  describe('generation counter race', () => {
    test('only resolves the latest key when keys change rapidly', async () => {
      let resolveFirst: ((v: string) => void) | undefined;
      let resolveSecond: ((v: string) => void) | undefined;

      const fetcher = vi
        .fn()
        .mockImplementationOnce(
          () =>
            new Promise<string>((r) => {
              resolveFirst = r;
            }),
        )
        .mockImplementationOnce(
          () =>
            new Promise<string>((r) => {
              resolveSecond = r;
            }),
        );

      let currentKey = 'race-key-1';
      const { result, rerender } = renderHookWithStores(() => useStoreQuery<string>(currentKey, fetcher));

      // First key triggers fetch
      expect(result.current.isLoading).toBe(true);

      // Quickly change to second key (aborts first)
      currentKey = 'race-key-2';
      rerender();

      // Resolve the first fetch after key change — should be ignored (aborted)
      await act(async () => {
        resolveFirst?.('stale-data');
        await Promise.resolve();
      });

      // Resolve the second fetch
      await act(async () => {
        resolveSecond?.('fresh-data');
        await Promise.resolve();
      });

      await waitFor(() => {
        expect(result.current.data).toBe('fresh-data');
      });

      // The stale data should NOT appear for race-key-1 because the abort prevented the store write
      expect(queryStore.getSnapshot<string>('race-key-1')?.status).not.toBe('success');
    });

    test('re-fetches a key when revisiting it after an aborted pending request', async () => {
      let resolveFirst: ((v: string) => void) | undefined;
      let resolveSecond: ((v: string) => void) | undefined;

      const fetcher = vi
        .fn()
        .mockImplementationOnce(
          () =>
            new Promise<string>((r) => {
              resolveFirst = r;
            }),
        )
        .mockImplementationOnce(
          () =>
            new Promise<string>((r) => {
              resolveSecond = r;
            }),
        )
        .mockResolvedValueOnce('revisit-data');

      let currentKey = 'revisit-key-1';
      const { result, rerender } = renderHookWithStores(() => useStoreQuery<string>(currentKey, fetcher));

      // Switch away quickly so key-1 request is aborted.
      currentKey = 'revisit-key-2';
      rerender();

      await waitFor(() => {
        expect(fetcher).toHaveBeenCalledTimes(2);
      });

      await act(async () => {
        resolveSecond?.('key-2-data');
        await Promise.resolve();
      });

      await waitFor(() => {
        expect(result.current.data).toBe('key-2-data');
      });

      // Revisit key-1: hook should start a fresh fetch instead of staying stuck in pending.
      currentKey = 'revisit-key-1';
      rerender();

      await waitFor(() => {
        expect(result.current.data).toBe('revisit-data');
      });
      expect(fetcher).toHaveBeenCalledTimes(3);

      // Resolve stale first promise (if still pending) — should be ignored.
      await act(async () => {
        resolveFirst?.('stale-first');
        await Promise.resolve();
      });
    });
  });

  describe('concurrent mode safety', () => {
    test('store update inside startTransition does not throw', async () => {
      queryStore.set('transition-key', { status: 'success', data: 'initial' });
      const fetcher = vi.fn().mockResolvedValue('updated');

      const { result } = renderHookWithStores(() => useStoreQuery<string>('transition-key', fetcher));

      // Verify we can update the store within startTransition without errors
      await act(async () => {
        startTransition(() => {
          queryStore.set('transition-key', { status: 'success', data: 'transitioned' });
        });
        await Promise.resolve();
      });

      await waitFor(() => {
        expect(result.current.data).toBe('transitioned');
      });
    });
  });
});
