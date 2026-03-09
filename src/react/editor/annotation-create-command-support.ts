import type { WorkerPDFiumPage } from '../../context/worker-client.js';
import type { AnnotationType } from '../../core/types.js';
import type { CreateAnnotationOptions } from './annotation-command-types.js';
import { applyCreateAnnotationPayloadOptions } from './annotation-create-payload-options.js';
import { applyCreateAnnotationStyleOptions } from './annotation-create-style-options.js';

export async function applyCreateAnnotationOptions(
  page: WorkerPDFiumPage,
  annotationIndex: number,
  subtype: AnnotationType,
  options: CreateAnnotationOptions,
): Promise<void> {
  await applyCreateAnnotationPayloadOptions(page, annotationIndex, subtype, options);
  await applyCreateAnnotationStyleOptions(page, annotationIndex, subtype, options);
}
