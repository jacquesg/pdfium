import type { SerialisedAnnotation } from '../../context/protocol.js';
import { restoreAnnotationSnapshot } from './annotation-remove-command-support.js';
import { assertMutationSucceeded, type PageAccessor, withPage } from './command-shared.js';

export async function removeAnnotationAtIndex(getPage: PageAccessor, annotationIndex: number): Promise<void> {
  await withPage(getPage, async (page) => {
    assertMutationSucceeded('remove annotation', await page.removeAnnotation(annotationIndex));
    await page.generateContent();
  });
}

export async function restoreRemovedAnnotation(getPage: PageAccessor, snapshot: SerialisedAnnotation): Promise<number> {
  return withPage(getPage, async (page) => {
    const annotationIndex = await restoreAnnotationSnapshot(page, snapshot);
    await page.generateContent();
    return annotationIndex;
  });
}
