import { useCallback, useEffect, useLayoutEffect, useReducer, useRef, useSyncExternalStore } from 'react';
import type { WorkerPDFiumDocument } from '../context/worker-client.js';
import type { RenderOptions, RenderResult } from '../core/types.js';
import { usePDFiumDocument } from './context.js';
import type { PageDimension } from './hooks/use-page-dimensions.js';
import { getPageDimensionsCacheKey } from './hooks/use-page-dimensions.js';
import { buildCacheKey } from './internal/cache-key.js';
import { usePDFiumStores } from './internal/stores-context.js';

function useRenderPage(
  document: WorkerPDFiumDocument | null,
  pageIndex: number,
  options?: RenderOptions,
): {
  renderKey: string | null;
  width: number | null;
  height: number | null;
  originalWidth: number | null;
  originalHeight: number | null;
  isLoading: boolean;
  /** True when originalWidth/originalHeight are known (from render or dimension cache). */
  hasDimensions: boolean;
  isPlaceholderData: boolean;
  error: Error | null;
  /** Clear the error for the current cache key and re-trigger rendering. */
  retry: () => void;
} {
  const { documentRevision, pageRevisionVersion, getPageRevision } = usePDFiumDocument();
  void pageRevisionVersion;
  const pageRevision = getPageRevision(pageIndex);
  const { renderStore, queryStore } = usePDFiumStores();
  const renderErrorsByKeyRef = useRef<Map<string, Error>>(new Map());
  const prevResultRef = useRef<{
    key: string;
    result: RenderResult;
    document: WorkerPDFiumDocument;
  } | null>(null);

  // Clear error map when document identity changes to prevent leaks.
  const prevDocumentRef = useRef<WorkerPDFiumDocument | null | undefined>(undefined);
  useEffect(() => {
    if (prevDocumentRef.current !== undefined && prevDocumentRef.current !== document) {
      renderErrorsByKeyRef.current.clear();
      prevResultRef.current = null;
    }
    prevDocumentRef.current = document;
  }, [document]);

  const cacheKey = document
    ? buildCacheKey(
        document.id,
        'renderPage',
        documentRevision,
        pageRevision,
        pageIndex,
        options?.scale ?? 1,
        options?.rotation ?? 'none',
        options?.width,
        options?.height,
        options?.renderAnnotations ?? true,
        options?.renderFormFields ?? false,
        options?.backgroundColour,
        options?.clipRect?.left,
        options?.clipRect?.top,
        options?.clipRect?.right,
        options?.clipRect?.bottom,
      )
    : null;

  const result = useSyncExternalStore(
    renderStore.subscribe,
    () => renderStore.getSnapshot(cacheKey),
    () => renderStore.getServerSnapshot(),
  );

  // Subscribe to queryStore for dimension cache fallback
  const dimCacheKey = document ? getPageDimensionsCacheKey(document.id, documentRevision) : null;
  const dimEntry = useSyncExternalStore(
    queryStore.subscribe,
    () => queryStore.getSnapshot<PageDimension[]>(dimCacheKey),
    () => queryStore.getServerSnapshot(),
  );
  const cachedDim =
    dimEntry?.status === 'success' && pageIndex < dimEntry.data.length ? dimEntry.data[pageIndex] : undefined;

  useLayoutEffect(() => {
    if (result && cacheKey && document) {
      prevResultRef.current = { key: cacheKey, result, document };
      renderStore.touch(cacheKey);
    }
  }, [cacheKey, document, result, renderStore]);

  const currentError = cacheKey ? (renderErrorsByKeyRef.current.get(cacheKey) ?? null) : null;

  // Retry generation counter — bumping this forces a re-render and re-runs the render effect.
  const [retryGeneration, forceRetry] = useReducer((c: number) => c + 1, 0);

  // biome-ignore lint/correctness/useExhaustiveDependencies: options is intentionally excluded — cacheKey captures all option values; retryGeneration forces re-run after retry()
  useEffect(() => {
    if (!cacheKey || !document || result || currentError) return;
    let cancelled = false;

    const renderOpts: RenderOptions = { scale: options?.scale ?? 1 };
    if (options?.width !== undefined) renderOpts.width = options.width;
    if (options?.height !== undefined) renderOpts.height = options.height;
    if (options?.rotation !== undefined) renderOpts.rotation = options.rotation;
    if (options?.renderFormFields !== undefined) renderOpts.renderFormFields = options.renderFormFields;
    if (options?.backgroundColour !== undefined) renderOpts.backgroundColour = options.backgroundColour;
    if (options?.clipRect !== undefined) renderOpts.clipRect = options.clipRect;

    let renderPromise: Promise<RenderResult>;
    try {
      renderPromise = Promise.resolve(document.renderPage(pageIndex, renderOpts));
    } catch (err) {
      renderErrorsByKeyRef.current.set(cacheKey, err instanceof Error ? err : new Error(String(err)));
      renderStore.notify();
      return;
    }

    renderPromise.then(
      (renderResult) => {
        if (cancelled) return;
        renderErrorsByKeyRef.current.delete(cacheKey);
        renderStore.set(cacheKey, renderResult);
      },
      (err: unknown) => {
        if (cancelled) return;
        renderErrorsByKeyRef.current.set(cacheKey, err instanceof Error ? err : new Error(String(err)));
        renderStore.notify();
      },
    );

    return () => {
      cancelled = true;
    };
  }, [cacheKey, currentError, document, pageIndex, result, renderStore, retryGeneration]);

  // Retry callback clears the error for the current key and forces re-render.
  const retry = useCallback(() => {
    if (cacheKey) {
      renderErrorsByKeyRef.current.delete(cacheKey);
      forceRetry();
    }
  }, [cacheKey]);

  const prev = prevResultRef.current;
  const sameDocument = prev?.document === document;
  const effectiveResult = result ?? (sameDocument ? prev?.result : undefined);
  const isPlaceholder = !result && !!prev && sameDocument;

  // Dimension fallback chain: render bitmap > previous render > cached page dimensions > null
  const scale = options?.scale ?? 1;
  const origW = effectiveResult?.originalWidth ?? cachedDim?.width ?? null;
  const origH = effectiveResult?.originalHeight ?? cachedDim?.height ?? null;
  const w = effectiveResult?.width ?? (origW !== null ? Math.round(origW * scale) : null);
  const h = effectiveResult?.height ?? (origH !== null ? Math.round(origH * scale) : null);

  return {
    renderKey: result ? cacheKey : isPlaceholder ? (prev?.key ?? null) : null,
    width: w,
    height: h,
    originalWidth: origW,
    originalHeight: origH,
    isLoading: !result && cacheKey !== null && currentError === null,
    hasDimensions: origW !== null && origH !== null,
    isPlaceholderData: isPlaceholder,
    error: currentError,
    retry,
  };
}

export { useRenderPage };
