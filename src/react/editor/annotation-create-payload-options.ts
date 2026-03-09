import type { WorkerPDFiumPage } from '../../context/worker-client.js';
import type { AnnotationType } from '../../core/types.js';
import { LINE_FALLBACK_MARKER_KEY, LINE_FALLBACK_MARKER_VALUE } from '../../internal/annotation-markers.js';
import type { CreateAnnotationOptions } from './annotation-command-types.js';
import { assertInkStrokeSucceeded, assertMutationSucceeded } from './command-shared.js';

export async function applyCreateAnnotationPayloadOptions(
  page: WorkerPDFiumPage,
  annotationIndex: number,
  subtype: AnnotationType,
  options: CreateAnnotationOptions,
): Promise<void> {
  if (options.contents !== undefined) {
    assertMutationSucceeded(
      `set ${subtype} annotation contents`,
      await page.setAnnotationString(annotationIndex, 'Contents', options.contents),
    );
  }

  if (options.quadPoints !== undefined) {
    for (const quad of options.quadPoints) {
      assertMutationSucceeded(
        `append ${subtype} annotation quad points`,
        await page.appendAnnotationAttachmentPoints(annotationIndex, quad),
      );
    }
  }

  if (options.inkPaths !== undefined) {
    for (const path of options.inkPaths) {
      assertInkStrokeSucceeded(await page.addInkStroke(annotationIndex, [...path]));
    }
  }

  if (options.stampType !== undefined) {
    assertMutationSucceeded(
      `set ${subtype} stamp name`,
      await page.setAnnotationString(annotationIndex, 'Name', options.stampType),
    );
  }

  if (options.isLineFallback) {
    assertMutationSucceeded(
      'mark line fallback annotation',
      await page.setAnnotationString(annotationIndex, LINE_FALLBACK_MARKER_KEY, LINE_FALLBACK_MARKER_VALUE),
    );
  }
}
