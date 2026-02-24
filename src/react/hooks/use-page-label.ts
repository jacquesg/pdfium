import { useCallback } from 'react';
import type { WorkerPDFiumDocument } from '../../context/worker-client.js';
import { usePDFiumDocument } from '../context.js';
import { buildCacheKey } from '../internal/cache-key.js';
import { useStoreQuery } from '../internal/use-store-query.js';

export function usePageLabel(document: WorkerPDFiumDocument | null, pageIndex: number) {
  const { documentRevision } = usePDFiumDocument();
  const key = document ? buildCacheKey(document.id, 'pageLabel', documentRevision, pageIndex) : null;
  const fetcher = useCallback(async (): Promise<string | null> => {
    if (!document) return null;
    return await document.getPageLabel(pageIndex);
  }, [document, pageIndex]);
  return useStoreQuery(key, fetcher);
}
