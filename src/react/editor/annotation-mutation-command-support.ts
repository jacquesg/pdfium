import type { WorkerPDFiumPage } from '../../context/worker-client.js';
import type { AnnotationBorder } from '../../core/types.js';
import type { AnnotationStyleColourMutation } from './annotation-command-types.js';
import { assertMutationSucceeded } from './command-shared.js';

export async function applyAnnotationBorderMutation(
  page: WorkerPDFiumPage,
  annotationIndex: number,
  border: AnnotationBorder,
  action: 'set' | 'restore' | 'preserve',
): Promise<void> {
  const mutationName =
    action === 'set'
      ? 'set annotation border'
      : action === 'restore'
        ? 'restore annotation border'
        : 'preserve annotation border';
  assertMutationSucceeded(
    mutationName,
    await page.setAnnotationBorder(annotationIndex, border.horizontalRadius, border.verticalRadius, border.borderWidth),
  );
}

export async function applyAnnotationColourMutation(
  page: WorkerPDFiumPage,
  annotationIndex: number,
  mutation: AnnotationStyleColourMutation,
  restore: boolean,
): Promise<void> {
  const targetColour = restore ? mutation.oldColour : mutation.newColour;
  assertMutationSucceeded(
    restore ? 'restore annotation colour' : 'set annotation colour',
    await page.setAnnotationColour(annotationIndex, mutation.colourType, targetColour),
  );
  const preserveBorder = mutation.preserveBorder;
  if (preserveBorder === null || preserveBorder === undefined) {
    return;
  }
  await applyAnnotationBorderMutation(page, annotationIndex, preserveBorder, restore ? 'restore' : 'preserve');
}
