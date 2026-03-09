import type { SerialisedAnnotation } from '../../context/protocol.js';
import type { WorkerPDFiumPage } from '../../context/worker-client.js';
import { assertInkStrokeSucceeded, assertMutationSucceeded } from './command-shared.js';

export async function restoreAnnotationPayload(
  page: WorkerPDFiumPage,
  annotationIndex: number,
  snapshot: SerialisedAnnotation,
): Promise<void> {
  if (snapshot.attachmentPoints !== undefined) {
    for (const quad of snapshot.attachmentPoints) {
      assertMutationSucceeded(
        'restore annotation quad points',
        await page.appendAnnotationAttachmentPoints(annotationIndex, quad),
      );
    }
  }
  if (snapshot.inkPaths !== undefined) {
    for (const path of snapshot.inkPaths) {
      assertInkStrokeSucceeded(await page.addInkStroke(annotationIndex, path));
    }
  }
}
