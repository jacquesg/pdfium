import type { WorkerPDFiumDocument } from '../../context/worker-client.js';
import type { DocumentOpener } from './command-runtime.types.js';

/**
 * Replace all pages in `targetDocument` with pages from `snapshotBytes`.
 *
 * This is intentionally document-level to preserve unsupported or lossy
 * annotation fields (appearance streams, link destinations, etc.) when
 * command-level reconstruction is insufficient.
 */
export async function restoreDocumentFromSnapshot(
  targetDocument: WorkerPDFiumDocument,
  snapshotBytes: Uint8Array,
  openDocument: DocumentOpener,
): Promise<void> {
  const snapshotDocument = await openDocument(snapshotBytes);
  try {
    const existingPageCount = (await targetDocument.getAllPageDimensions()).length;
    await targetDocument.importPages(snapshotDocument, { insertIndex: existingPageCount });
    for (let index = existingPageCount - 1; index >= 0; index--) {
      await targetDocument.deletePage(index);
    }
  } finally {
    await snapshotDocument[Symbol.asyncDispose]();
  }
}
