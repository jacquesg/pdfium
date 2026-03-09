import type { HarnessDocumentStore } from './test-harness-document-store.js';
import { resetHarnessState } from './test-harness-runtime.js';
import type { TestHarness } from './test-harness-types.js';

export async function disposeHarnessRuntime(harness: TestHarness, documentStore: HarnessDocumentStore): Promise<void> {
  await documentStore.dispose();

  if (harness.pdfium) {
    await harness.pdfium.dispose();
    harness.pdfium = null;
  }

  resetHarnessState(harness);
}
