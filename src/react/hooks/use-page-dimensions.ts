'use client';

import { useCallback } from 'react';
import type { WorkerPDFiumDocument } from '../../context/worker-client.js';
import { usePDFiumDocument } from '../context.js';
import { buildCacheKey } from '../internal/cache-key.js';
import { useStoreQuery } from '../internal/use-store-query.js';

export interface PageDimension {
  width: number;
  height: number;
}

/** Build the cache key used to store page dimensions. Shared with useRenderPage for fallback. */
export function getPageDimensionsCacheKey(docId: string, revision: number): string {
  return buildCacheKey(docId, 'pageDimensions', revision);
}

export function usePageDimensions(document: WorkerPDFiumDocument | null) {
  const { documentRevision } = usePDFiumDocument();

  const key = document ? buildCacheKey(document.id, 'pageDimensions', documentRevision) : null;

  const fetcher = useCallback(async (): Promise<PageDimension[]> => {
    if (!document) return [];
    return document.getAllPageDimensions();
  }, [document]);

  return useStoreQuery(key, fetcher);
}
