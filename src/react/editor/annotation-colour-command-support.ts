import type { AnnotationBorder, AnnotationColourType, Colour } from '../../core/types.js';
import { bordersEqual } from './annotation-command-utils.js';
import { applyAnnotationColourMutation } from './annotation-mutation-command-support.js';
import { type PageAccessor, withPage } from './command-shared.js';

export interface AnnotationColourCommandOptions {
  readonly annotationIndex: number;
  readonly colourType: AnnotationColourType;
  readonly oldColour: Colour;
  readonly newColour: Colour;
  readonly preserveBorder: AnnotationBorder | null;
}

export async function runAnnotationColourMutation(
  getPage: PageAccessor,
  options: AnnotationColourCommandOptions,
  undo: boolean,
): Promise<void> {
  await withPage(getPage, async (page) => {
    await applyAnnotationColourMutation(page, options.annotationIndex, options, undo);
    await page.generateContent();
  });
}

export function canCoalesceAnnotationColourCommand(
  getPage: PageAccessor,
  options: AnnotationColourCommandOptions,
  nextGetPage: PageAccessor,
  nextOptions: AnnotationColourCommandOptions,
): boolean {
  return (
    getPage === nextGetPage &&
    options.annotationIndex === nextOptions.annotationIndex &&
    options.colourType === nextOptions.colourType &&
    bordersEqual(options.preserveBorder, nextOptions.preserveBorder)
  );
}
