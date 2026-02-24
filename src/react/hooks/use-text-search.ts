import { useCallback } from 'react';
import type { WorkerPDFiumDocument } from '../../context/worker-client.js';
import type { TextSearchResult } from '../../core/types.js';
import { usePDFiumDocument } from '../context.js';
import { buildCacheKey } from '../internal/cache-key.js';
import { disposeSafelyAsync } from '../internal/dispose-safely.js';
import { useStoreQuery } from '../internal/use-store-query.js';

export function useTextSearch(document: WorkerPDFiumDocument | null, pageIndex: number, query: string, flags?: number) {
  const { documentRevision } = usePDFiumDocument();
  const key = document ? buildCacheKey(document.id, 'textSearch', documentRevision, pageIndex, query, flags) : null;
  const fetcher = useCallback(async (): Promise<TextSearchResult[]> => {
    if (!document) return [];
    const page = await document.getPage(pageIndex);
    try {
      return await page.findText(query, flags);
    } finally {
      await disposeSafelyAsync(page);
    }
  }, [document, pageIndex, query, flags]);
  return useStoreQuery(key, fetcher);
}
