import type { WorkerPDFiumPage } from '../../context/worker-client.js';
import type { PageAccessor } from './command-runtime.types.js';

/**
 * Open a page, run an operation, then dispose the page handle.
 */
export async function withPage<T>(getPage: PageAccessor, fn: (page: WorkerPDFiumPage) => Promise<T>): Promise<T> {
  const page = await getPage();
  try {
    return await fn(page);
  } finally {
    await page[Symbol.asyncDispose]();
  }
}
