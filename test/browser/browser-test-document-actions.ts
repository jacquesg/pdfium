import type { Page } from '@playwright/test';
import { getFixturePdfBytes } from './browser-test-fixture.js';

export async function loadHarnessDocument(
  page: Page,
  data: number[],
): Promise<{ pageCount: number; documentId: number }> {
  return page.evaluate(async (payload) => {
    const arrayBuffer = new Uint8Array(payload).buffer;
    return window.testHarness.loadDocument(arrayBuffer);
  }, data);
}

export async function closeHarnessDocument(page: Page, documentId: number): Promise<void> {
  await page.evaluate((docId) => window.testHarness.closeDocument(docId), documentId);
}

export async function renderHarnessPage(
  page: Page,
  documentId: number,
  pageIndex: number,
): Promise<{ width: number; height: number; dataUrl: string }> {
  return page.evaluate(async ({ docId, index }) => window.testHarness.renderPage(docId, index), {
    docId: documentId,
    index: pageIndex,
  });
}

export async function readHarnessPageText(page: Page, documentId: number, pageIndex: number): Promise<string> {
  return page.evaluate(async ({ docId, index }) => window.testHarness.getPageText(docId, index), {
    docId: documentId,
    index: pageIndex,
  });
}

export async function withLoadedFixtureDocument<T>(
  page: Page,
  run: (document: { documentId: number; pageCount: number }) => Promise<T>,
): Promise<T> {
  const document = await loadHarnessDocument(page, await getFixturePdfBytes());
  try {
    return await run(document);
  } finally {
    await closeHarnessDocument(page, document.documentId);
  }
}
