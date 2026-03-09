import type { SerialisedAnnotation } from '../../context/protocol.js';
import type { WorkerPDFiumPage } from '../../context/worker-client.js';
import { restoreAnnotationBasicProperties } from './annotation-restore-basic-properties.js';
import { restoreAnnotationLink } from './annotation-restore-link.js';
import { restoreAnnotationPayload } from './annotation-restore-payload.js';

export async function restoreAnnotationSnapshot(
  page: WorkerPDFiumPage,
  snapshot: SerialisedAnnotation,
): Promise<number> {
  const result = await page.createAnnotation(snapshot.type);
  const annotationIndex = result.index;

  await restoreAnnotationBasicProperties(page, annotationIndex, snapshot);
  await restoreAnnotationPayload(page, annotationIndex, snapshot);
  await restoreAnnotationLink(page, annotationIndex, snapshot);

  return annotationIndex;
}
