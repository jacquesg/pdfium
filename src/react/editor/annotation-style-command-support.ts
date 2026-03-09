import type { SetAnnotationStyleCommandOptions } from './annotation-command-types.js';
import { applyAnnotationBorderMutation, applyAnnotationColourMutation } from './annotation-mutation-command-support.js';

interface AnnotationStyleMutationTarget {
  generateContent(): Promise<unknown>;
}

type StyleMutationPage = AnnotationStyleMutationTarget & Parameters<typeof applyAnnotationColourMutation>[0];

export async function applyAnnotationStyleCommandMutation(
  page: StyleMutationPage,
  annotationIndex: number,
  style: SetAnnotationStyleCommandOptions,
  undo = false,
): Promise<void> {
  if (undo) {
    if (style.border !== undefined) {
      await applyAnnotationBorderMutation(page, annotationIndex, style.border.oldBorder, 'restore');
    }
    if (style.interior !== undefined) {
      await applyAnnotationColourMutation(page, annotationIndex, style.interior, true);
    }
    if (style.stroke !== undefined) {
      await applyAnnotationColourMutation(page, annotationIndex, style.stroke, true);
    }
    await page.generateContent();
    return;
  }

  if (style.stroke !== undefined) {
    await applyAnnotationColourMutation(page, annotationIndex, style.stroke, false);
  }
  if (style.interior !== undefined) {
    await applyAnnotationColourMutation(page, annotationIndex, style.interior, false);
  }
  if (style.border !== undefined) {
    await applyAnnotationBorderMutation(page, annotationIndex, style.border.newBorder, 'set');
  }
  await page.generateContent();
}
