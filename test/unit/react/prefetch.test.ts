import { beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryStore } from '../../../src/react/internal/query-store.js';
import { LRURenderStore } from '../../../src/react/internal/render-store.js';
import { prefetchPageData } from '../../../src/react/prefetch.js';
import { createMockDocument, createMockPage } from '../../react-setup.js';

function createTestStores() {
  return { queryStore: new QueryStore(), renderStore: new LRURenderStore() };
}

describe('prefetchPageData', () => {
  let stores: ReturnType<typeof createTestStores>;

  beforeEach(() => {
    stores = createTestStores();
  });

  it('prefetches default targets (pageInfo, textContent)', async () => {
    const mockPage = createMockPage();
    const mockDoc = createMockDocument({ getPage: vi.fn().mockResolvedValue(mockPage) });

    await prefetchPageData(mockDoc as never, 0, 0, { stores });

    expect(mockPage.getPageInfo).toHaveBeenCalledOnce();
    expect(mockPage.getTextLayout).toHaveBeenCalledOnce();
    expect(mockPage.getAnnotations).not.toHaveBeenCalled();
    expect(mockPage.getLinks).not.toHaveBeenCalled();
    expect(mockPage.getWebLinks).not.toHaveBeenCalled();
    expect(mockPage.dispose).toHaveBeenCalledOnce();
  });

  it('populates the query store with fetched data', async () => {
    const pageInfo = { rotation: 0, hasTransparency: false, boundingBox: {}, charCount: 50, pageBoxes: {} };
    const mockPage = createMockPage({ getPageInfo: vi.fn().mockResolvedValue(pageInfo) });
    const mockDoc = createMockDocument({
      id: 'doc-1',
      getPage: vi.fn().mockResolvedValue(mockPage),
    });

    await prefetchPageData(mockDoc as never, 0, 0, { stores });

    // The cache key format is: docId\0hookName\0revision\0pageIndex
    const entry = stores.queryStore.getSnapshot('doc-1\0pageInfo\x000\x000');
    expect(entry).toBeDefined();
    expect(entry?.status).toBe('success');
  });

  it('selectively prefetches only requested targets', async () => {
    const mockPage = createMockPage();
    const mockDoc = createMockDocument({ getPage: vi.fn().mockResolvedValue(mockPage) });

    await prefetchPageData(mockDoc as never, 0, 0, { include: ['annotations', 'links'], stores });

    expect(mockPage.getAnnotations).toHaveBeenCalledOnce();
    expect(mockPage.getLinks).toHaveBeenCalledOnce();
    expect(mockPage.getPageInfo).not.toHaveBeenCalled();
    expect(mockPage.getTextLayout).not.toHaveBeenCalled();
    expect(mockPage.getWebLinks).not.toHaveBeenCalled();
  });

  it('skips already-cached entries', async () => {
    const mockPage = createMockPage();
    const mockDoc = createMockDocument({
      id: 'doc-2',
      getPage: vi.fn().mockResolvedValue(mockPage),
    });

    // Pre-populate the cache for pageInfo
    const cacheKey = 'doc-2\0pageInfo\x000\x000';
    stores.queryStore.set(cacheKey, { status: 'success', data: { cached: true } });

    await prefetchPageData(mockDoc as never, 0, 0, { stores });

    // pageInfo should be skipped, textContent should still be fetched
    expect(mockPage.getPageInfo).not.toHaveBeenCalled();
    expect(mockPage.getTextLayout).toHaveBeenCalledOnce();
  });

  it('silently ignores individual fetch failures', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const mockPage = createMockPage({
      getPageInfo: vi.fn().mockRejectedValue(new Error('network error')),
    });
    const mockDoc = createMockDocument({ getPage: vi.fn().mockResolvedValue(mockPage) });

    // Should not throw
    await expect(prefetchPageData(mockDoc as never, 0, 0, { stores })).resolves.toBeUndefined();

    // textContent should still have been attempted
    expect(mockPage.getTextLayout).toHaveBeenCalledOnce();
    expect(warnSpy).toHaveBeenCalledOnce();
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Prefetch failed for pageInfo on page 0'),
      expect.any(Error),
    );
  });

  it('silently ignores synchronous target throws', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const syncError = new Error('sync failure');
    const mockPage = createMockPage({
      getPageInfo: vi.fn(() => {
        throw syncError;
      }),
    });
    const mockDoc = createMockDocument({ getPage: vi.fn().mockResolvedValue(mockPage) });

    await expect(prefetchPageData(mockDoc as never, 0, 0, { stores })).resolves.toBeUndefined();

    expect(mockPage.getTextLayout).toHaveBeenCalledOnce();
    expect(mockPage.dispose).toHaveBeenCalledOnce();
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Prefetch failed for pageInfo on page 0'), syncError);
    warnSpy.mockRestore();
  });

  it('disposes the page even when all fetches fail', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const mockPage = createMockPage({
      getPageInfo: vi.fn().mockRejectedValue(new Error('fail 1')),
      getTextLayout: vi.fn().mockRejectedValue(new Error('fail 2')),
    });
    const mockDoc = createMockDocument({ getPage: vi.fn().mockResolvedValue(mockPage) });

    await prefetchPageData(mockDoc as never, 0, 0, { stores });

    expect(mockPage.dispose).toHaveBeenCalledOnce();
    expect(warnSpy).toHaveBeenCalledTimes(2);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Prefetch failed for pageInfo on page 0'),
      expect.any(Error),
    );
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Prefetch failed for textContent on page 0'),
      expect.any(Error),
    );
  });

  it('prefetches all five targets when requested', async () => {
    const mockPage = createMockPage();
    const mockDoc = createMockDocument({ getPage: vi.fn().mockResolvedValue(mockPage) });

    await prefetchPageData(mockDoc as never, 0, 0, {
      include: ['pageInfo', 'textContent', 'annotations', 'links', 'webLinks'],
      stores,
    });

    expect(mockPage.getPageInfo).toHaveBeenCalledOnce();
    expect(mockPage.getTextLayout).toHaveBeenCalledOnce();
    expect(mockPage.getAnnotations).toHaveBeenCalledOnce();
    expect(mockPage.getLinks).toHaveBeenCalledOnce();
    expect(mockPage.getWebLinks).toHaveBeenCalledOnce();
  });

  it('uses the correct page index in getPage call', async () => {
    const mockPage = createMockPage();
    const mockDoc = createMockDocument({ getPage: vi.fn().mockResolvedValue(mockPage) });

    await prefetchPageData(mockDoc as never, 3, 0, { stores });

    expect(mockDoc.getPage).toHaveBeenCalledWith(3);
  });

  it('prefetches formWidgets, pageObjects, and structureTree targets', async () => {
    const mockPage = createMockPage();
    const mockDoc = createMockDocument({ getPage: vi.fn().mockResolvedValue(mockPage) });

    await prefetchPageData(mockDoc as never, 1, 2, {
      include: ['formWidgets', 'pageObjects', 'structureTree'],
      stores,
    });

    expect(mockPage.getFormWidgets).toHaveBeenCalledOnce();
    expect(mockPage.getPageObjects).toHaveBeenCalledOnce();
    expect(mockPage.getStructureTree).toHaveBeenCalledOnce();
  });

  it('warns and skips unknown prefetch targets', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const mockPage = createMockPage();
    const mockDoc = createMockDocument({ getPage: vi.fn().mockResolvedValue(mockPage) });

    await expect(
      prefetchPageData(mockDoc as never, 0, 0, {
        include: ['pageInfo', 'unknown-target' as never],
        stores,
      }),
    ).resolves.toBeUndefined();

    expect(mockPage.getPageInfo).toHaveBeenCalledOnce();
    expect(warnSpy).toHaveBeenCalledWith('[PDFium] Unknown prefetch target: unknown-target');
    warnSpy.mockRestore();
  });
});
