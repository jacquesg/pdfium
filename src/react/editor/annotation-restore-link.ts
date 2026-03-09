import type { SerialisedAnnotation } from '../../context/protocol.js';
import type { WorkerPDFiumPage } from '../../context/worker-client.js';
import { assertMutationSucceeded } from './command-shared.js';

export async function restoreAnnotationLink(
  page: WorkerPDFiumPage,
  annotationIndex: number,
  snapshot: SerialisedAnnotation,
): Promise<void> {
  if (snapshot.link?.action?.uri === undefined) {
    return;
  }

  assertMutationSucceeded(
    'restore annotation URI',
    await page.setAnnotationURI(annotationIndex, snapshot.link.action.uri),
  );
}
