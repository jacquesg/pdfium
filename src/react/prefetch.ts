import type { WorkerPDFiumDocument } from '../context/worker-client.js';
import { buildCacheKey } from './internal/cache-key.js';
import type { PDFiumStores } from './internal/stores-context.js';

type PrefetchTarget =
  | 'pageInfo'
  | 'textContent'
  | 'annotations'
  | 'links'
  | 'webLinks'
  | 'formWidgets'
  | 'pageObjects'
  | 'structureTree';

async function prefetchPageData(
  document: WorkerPDFiumDocument,
  pageIndex: number,
  documentRevision: number,
  options: { include?: PrefetchTarget[]; stores: PDFiumStores },
): Promise<void> {
  const queryStore = options.stores.queryStore;
  const targets = options?.include ?? ['pageInfo', 'textContent'];
  const docId = document.id;

  const page = await document.getPage(pageIndex);
  try {
    const promises: Promise<void>[] = [];

    for (const target of targets) {
      const key = buildCacheKey(docId, target, documentRevision, pageIndex);
      // Skip if already cached
      if (queryStore.getSnapshot(key)?.status === 'success') continue;

      const doFetch = (): Promise<void> => {
        switch (target) {
          case 'pageInfo':
            return page.getPageInfo().then((data) => {
              queryStore.set(key, { status: 'success', data });
            });
          case 'textContent':
            return page.getTextLayout().then((data) => {
              queryStore.set(key, { status: 'success', data });
            });
          case 'annotations':
            return page.getAnnotations().then((data) => {
              queryStore.set(key, { status: 'success', data });
            });
          case 'links':
            return page.getLinks().then((data) => {
              queryStore.set(key, { status: 'success', data });
            });
          case 'webLinks':
            return page.getWebLinks().then((data) => {
              queryStore.set(key, { status: 'success', data });
            });
          case 'formWidgets':
            return page.getFormWidgets().then((data) => {
              queryStore.set(key, { status: 'success', data });
            });
          case 'pageObjects':
            return page.getPageObjects().then((data) => {
              queryStore.set(key, { status: 'success', data });
            });
          case 'structureTree':
            return page.getStructureTree().then((data) => {
              queryStore.set(key, { status: 'success', data });
            });
          default: {
            const _exhaustive: never = target;
            if (__DEV__) console.warn(`[PDFium] Unknown prefetch target: ${String(_exhaustive)}`);
            return Promise.resolve();
          }
        }
      };

      promises.push(
        Promise.resolve()
          .then(doFetch)
          .catch((err: unknown) => {
            if (__DEV__) console.warn(`[PDFium] Prefetch failed for ${target} on page ${pageIndex}:`, err);
          }),
      );
    }

    await Promise.all(promises);
  } finally {
    await page.dispose();
  }
}

export { prefetchPageData };
export type { PrefetchTarget };
