import type { SerialisedAnnotation } from '../../context/protocol.js';
import type { WorkerPDFiumPage } from '../../context/worker-client.js';
import { LINE_FALLBACK_MARKER_KEY, LINE_FALLBACK_MARKER_VALUE } from '../../internal/annotation-markers.js';
import { assertMutationSucceeded } from './command-shared.js';

export async function restoreAnnotationBasicProperties(
  page: WorkerPDFiumPage,
  annotationIndex: number,
  snapshot: SerialisedAnnotation,
): Promise<void> {
  assertMutationSucceeded('restore annotation bounds', await page.setAnnotationRect(annotationIndex, snapshot.bounds));

  if (snapshot.colour.stroke !== undefined) {
    assertMutationSucceeded(
      'restore annotation stroke colour',
      await page.setAnnotationColour(annotationIndex, 'stroke', snapshot.colour.stroke),
    );
  }
  if (snapshot.colour.interior !== undefined) {
    assertMutationSucceeded(
      'restore annotation interior colour',
      await page.setAnnotationColour(annotationIndex, 'interior', snapshot.colour.interior),
    );
  }
  if (snapshot.contents) {
    assertMutationSucceeded(
      'restore annotation contents',
      await page.setAnnotationString(annotationIndex, 'Contents', snapshot.contents),
    );
  }
  if (snapshot.author) {
    assertMutationSucceeded(
      'restore annotation author',
      await page.setAnnotationString(annotationIndex, 'T', snapshot.author),
    );
  }
  if (snapshot.subject) {
    assertMutationSucceeded(
      'restore annotation subject',
      await page.setAnnotationString(annotationIndex, 'Subj', snapshot.subject),
    );
  }
  if (snapshot.flags !== 0) {
    assertMutationSucceeded('restore annotation flags', await page.setAnnotationFlags(annotationIndex, snapshot.flags));
  }
  if (snapshot.border !== null) {
    assertMutationSucceeded(
      'restore annotation border',
      await page.setAnnotationBorder(
        annotationIndex,
        snapshot.border.horizontalRadius,
        snapshot.border.verticalRadius,
        snapshot.border.borderWidth,
      ),
    );
  }
  if (snapshot.lineFallback === true) {
    assertMutationSucceeded(
      'restore line fallback marker',
      await page.setAnnotationString(annotationIndex, LINE_FALLBACK_MARKER_KEY, LINE_FALLBACK_MARKER_VALUE),
    );
  }
}
