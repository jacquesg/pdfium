import type { WorkerPDFiumPage } from '../../context/worker-client.js';
import type { AnnotationType } from '../../core/types.js';
import type { CreateAnnotationOptions } from './annotation-command-types.js';
import { defaultColourTypeForSubtype } from './annotation-command-utils.js';
import { assertMutationSucceeded } from './command-shared.js';

export async function applyCreateAnnotationStyleOptions(
  page: WorkerPDFiumPage,
  annotationIndex: number,
  subtype: AnnotationType,
  options: CreateAnnotationOptions,
): Promise<void> {
  const defaultColourType = defaultColourTypeForSubtype(subtype);

  if (options.colour !== undefined) {
    assertMutationSucceeded(
      `set ${subtype} annotation colour`,
      await page.setAnnotationColour(annotationIndex, defaultColourType, options.colour),
    );
  }
  if (options.strokeColour !== undefined) {
    assertMutationSucceeded(
      `set ${subtype} annotation stroke colour`,
      await page.setAnnotationColour(annotationIndex, 'stroke', options.strokeColour),
    );
  }
  if (options.interiorColour !== undefined) {
    assertMutationSucceeded(
      `set ${subtype} annotation interior colour`,
      await page.setAnnotationColour(annotationIndex, 'interior', options.interiorColour),
    );
  }
  if (options.borderWidth !== undefined) {
    assertMutationSucceeded(
      `set ${subtype} annotation border`,
      await page.setAnnotationBorder(annotationIndex, 0, 0, options.borderWidth),
    );
    await reapplyAlphaChannelsAfterBorderMutation(page, annotationIndex, subtype, options, defaultColourType);
  }
}

async function reapplyAlphaChannelsAfterBorderMutation(
  page: WorkerPDFiumPage,
  annotationIndex: number,
  subtype: AnnotationType,
  options: CreateAnnotationOptions,
  defaultColourType: 'stroke' | 'interior',
): Promise<void> {
  if (options.colour !== undefined && options.colour.a < 255) {
    assertMutationSucceeded(
      `reapply ${subtype} annotation ${defaultColourType} alpha`,
      await page.setAnnotationColour(annotationIndex, defaultColourType, options.colour),
    );
  }
  if (options.strokeColour !== undefined && options.strokeColour.a < 255) {
    assertMutationSucceeded(
      `reapply ${subtype} annotation stroke alpha`,
      await page.setAnnotationColour(annotationIndex, 'stroke', options.strokeColour),
    );
  }
  if (options.interiorColour !== undefined && options.interiorColour.a < 255) {
    assertMutationSucceeded(
      `reapply ${subtype} annotation interior alpha`,
      await page.setAnnotationColour(annotationIndex, 'interior', options.interiorColour),
    );
  }
}
