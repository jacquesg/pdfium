import type { HarnessDocumentStoreState } from './test-harness-document-store.types.js';

export async function closeHarnessDocumentInStore(state: HarnessDocumentStoreState, documentId: number): Promise<void> {
  const pageKeyPrefix = `${documentId}-`;
  for (const [key, page] of state.pages.entries()) {
    if (key.startsWith(pageKeyPrefix)) {
      await page.dispose();
      state.pages.delete(key);
    }
  }

  const document = state.documents.get(documentId);
  if (document) {
    await document.dispose();
    state.documents.delete(documentId);
  }
}

export async function disposeHarnessDocumentStore(state: HarnessDocumentStoreState): Promise<void> {
  for (const page of state.pages.values()) {
    await page.dispose();
  }
  state.pages.clear();

  for (const document of state.documents.values()) {
    await document.dispose();
  }
  state.documents.clear();
}
