import { useCallback } from 'react';
import type { WorkerPDFiumDocument } from '../../context/worker-client.js';
import { usePDFiumDocument } from '../context.js';
import { buildCacheKey } from './cache-key.js';
import { disposeSafelyAsync } from './dispose-safely.js';
import { type UseStoreQueryResult, useStoreQuery } from './use-store-query.js';

type WorkerPage = Awaited<ReturnType<WorkerPDFiumDocument['getPage']>>;

/**
 * Factory for document-level data hooks (no pageIndex parameter).
 * Eliminates boilerplate: each hook becomes a single factory call.
 */
function createDocumentDataHook<T>(
  hookName: string,
  fetchFn: (doc: WorkerPDFiumDocument) => Promise<T>,
): (document: WorkerPDFiumDocument | null) => UseStoreQueryResult<T | undefined> {
  return function useDocumentData(document: WorkerPDFiumDocument | null): UseStoreQueryResult<T | undefined> {
    const { documentRevision } = usePDFiumDocument();
    const key = document ? buildCacheKey(document.id, hookName, documentRevision) : null;
    const fetcher = useCallback(async (): Promise<T | undefined> => {
      if (!document) return undefined;
      return fetchFn(document);
    }, [document]);
    return useStoreQuery(key, fetcher);
  };
}

/**
 * Factory for page-level data hooks (with pageIndex parameter).
 * Handles page acquisition and disposal automatically.
 */
function createPageDataHook<T>(
  hookName: string,
  fetchFn: (page: WorkerPage) => Promise<T>,
): (document: WorkerPDFiumDocument | null, pageIndex: number) => UseStoreQueryResult<T | undefined> {
  return function usePageData(
    document: WorkerPDFiumDocument | null,
    pageIndex: number,
  ): UseStoreQueryResult<T | undefined> {
    const { documentRevision } = usePDFiumDocument();
    const key = document ? buildCacheKey(document.id, hookName, documentRevision, pageIndex) : null;
    const fetcher = useCallback(async (): Promise<T | undefined> => {
      if (!document) return undefined;
      const page = await document.getPage(pageIndex);
      try {
        return await fetchFn(page);
      } finally {
        await disposeSafelyAsync(page);
      }
    }, [document, pageIndex]);
    return useStoreQuery(key, fetcher);
  };
}

export { createDocumentDataHook, createPageDataHook };
export type { WorkerPage };
