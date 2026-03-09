import type { WorkerPDFiumDocument } from '../../../context/worker-client.js';
import { disposeSafelyAsync } from '../../internal/dispose-safely.js';
import { isEditorRedactionAnnotation } from '../redaction-utils.js';

export async function countMarkedRedactions(document: WorkerPDFiumDocument, pageIndex: number): Promise<number> {
  const page = await document.getPage(pageIndex);
  try {
    const annotations = await page.getAnnotations();
    return annotations.filter(isEditorRedactionAnnotation).length;
  } finally {
    await disposeSafelyAsync(page);
  }
}
