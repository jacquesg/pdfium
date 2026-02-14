'use client';

import { useEffect, useRef, useSyncExternalStore } from 'react';
import { PDFiumError, PDFiumErrorCode } from '../../core/errors.js';
import { usePDFiumStores } from './stores-context.js';

interface UseStoreQueryOptions {
  /** Skip fetch when false. */
  enabled?: boolean;
  /** Keep returning the last successful data while a new key is loading. Default: true. */
  keepPreviousData?: boolean;
}

interface UseStoreQueryResult<T> {
  data: T | undefined;
  isLoading: boolean;
  error: Error | null;
  isPlaceholderData: boolean;
}

/**
 * Generic hook for fetching async data through the external query store.
 *
 * The `fetcher` ref is always up-to-date — callers do NOT need to wrap it in
 * `useCallback`. The effect depends only on `key` and `enabled`, so a new
 * fetcher identity alone will not re-trigger fetching.
 */
function useStoreQuery<T>(
  key: string | null,
  fetcher: () => Promise<T>,
  options?: UseStoreQueryOptions,
): UseStoreQueryResult<T> {
  const keepPrevious = options?.keepPreviousData ?? true;
  const enabled = options?.enabled ?? true;
  const { queryStore } = usePDFiumStores();
  const latestKeyRef = useRef(key);
  latestKeyRef.current = key;
  const latestEnabledRef = useRef(enabled);
  latestEnabledRef.current = enabled;

  // Always call the latest fetcher without requiring caller to stabilise it.
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  // Read from external store — concurrent-mode safe
  const entry = useSyncExternalStore(
    queryStore.subscribe,
    () => queryStore.getSnapshot<T>(key),
    () => queryStore.getServerSnapshot(),
  );

  // Track last successful data for keepPreviousData behaviour.
  // This ref persists across key changes so we can show stale data during transitions.
  const previousDataRef = useRef<T | undefined>(undefined);
  if (entry?.status === 'success') {
    previousDataRef.current = entry.data;
  }

  // biome-ignore lint/correctness/useExhaustiveDependencies: entry snapshot is intentionally read inside the effect while key/enabled/queryStore drive fetch lifecycle
  useEffect(() => {
    if (key === null || !enabled) return;
    if (entry?.status === 'success' || entry?.status === 'pending') return; // cache hit / in-flight fetch

    // Defend against races where another subscriber set this key to pending/success
    // after our render snapshot but before this effect executes.
    const existing = queryStore.getSnapshot<T>(key);
    if (existing?.status === 'success' || existing?.status === 'pending') return;

    const controller = new AbortController();
    // Normalize sync throws / non-promise returns into a rejected/resolved promise
    // so query failures flow through the standard error state path.
    const fetchPromise = Promise.resolve().then(() => fetcherRef.current());
    // Void promise intentionally swallows rejections — error handling is
    // performed by the main .then() chain below. This prevents unhandled
    // rejection warnings on the stored promise reference.
    const pendingPromise = fetchPromise.then(
      () => undefined,
      () => undefined,
    );
    queryStore.set(key, {
      status: 'pending',
      promise: pendingPromise,
    });

    fetchPromise.then(
      (data: T) => {
        if (controller.signal.aborted) return;
        queryStore.set(key, { status: 'success', data });
      },
      (error: unknown) => {
        if (controller.signal.aborted) return;
        // Mark DOC_ALREADY_CLOSED / PAGE_ALREADY_CLOSED as errors rather than
        // leaving the entry stuck in 'pending' forever. Cache purge on document
        // swap will clear these entries and new fetches use the new document.
        if (error instanceof PDFiumError) {
          if (error.code === PDFiumErrorCode.DOC_ALREADY_CLOSED || error.code === PDFiumErrorCode.PAGE_ALREADY_CLOSED) {
            queryStore.set(key, { status: 'error', error });
            return;
          }
        }
        queryStore.set(key, {
          status: 'error',
          error: error instanceof Error ? error : new Error(String(error)),
        });
      },
    );

    return () => {
      const transitioned = latestKeyRef.current !== key || latestEnabledRef.current !== enabled;
      if (!transitioned) return;

      controller.abort();

      // If this effect created the current pending entry, remove it so a later
      // revisit of this key can start a fresh fetch instead of staying pending forever.
      const existing = queryStore.getSnapshot<T>(key);
      if (existing?.status === 'pending' && existing.promise === pendingPromise) {
        queryStore.delete(key);
      }
    };
  }, [key, enabled, queryStore]);

  const currentData = entry?.status === 'success' ? entry.data : undefined;
  const shouldLoad = enabled && key !== null;
  const isLoading = shouldLoad && (entry?.status === 'pending' || entry === undefined);
  const isPlaceholder = currentData === undefined && keepPrevious && previousDataRef.current !== undefined && isLoading;

  return {
    data: currentData ?? (isPlaceholder ? previousDataRef.current : undefined),
    isLoading,
    error: entry?.status === 'error' ? entry.error : null,
    isPlaceholderData: isPlaceholder,
  };
}

export { useStoreQuery };
export type { UseStoreQueryOptions, UseStoreQueryResult };
