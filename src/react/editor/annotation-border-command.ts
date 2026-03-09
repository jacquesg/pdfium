import type { AnnotationBorder } from '../../core/types.js';
import { applyAnnotationBorderMutation } from './annotation-mutation-command-support.js';
import type { EditorCommand, PageAccessor } from './command-shared.js';
import { withPage } from './command-shared.js';

export class SetAnnotationBorderCommand implements EditorCommand {
  readonly description = 'Change annotation border';
  readonly #getPage: PageAccessor;
  readonly #annotationIndex: number;
  readonly #oldBorder: AnnotationBorder;
  readonly #newBorder: AnnotationBorder;

  constructor(
    getPage: PageAccessor,
    annotationIndex: number,
    oldBorder: AnnotationBorder,
    newBorder: AnnotationBorder,
  ) {
    this.#getPage = getPage;
    this.#annotationIndex = annotationIndex;
    this.#oldBorder = oldBorder;
    this.#newBorder = newBorder;
  }

  async execute(): Promise<void> {
    await withPage(this.#getPage, async (page) => {
      await applyAnnotationBorderMutation(page, this.#annotationIndex, this.#newBorder, 'set');
      await page.generateContent();
    });
  }

  async undo(): Promise<void> {
    await withPage(this.#getPage, async (page) => {
      await applyAnnotationBorderMutation(page, this.#annotationIndex, this.#oldBorder, 'restore');
      await page.generateContent();
    });
  }

  coalesce(next: EditorCommand): EditorCommand | null {
    if (!(next instanceof SetAnnotationBorderCommand)) return null;
    if (this.#getPage !== next.#getPage) return null;
    if (this.#annotationIndex !== next.#annotationIndex) return null;
    return new SetAnnotationBorderCommand(this.#getPage, this.#annotationIndex, this.#oldBorder, next.#newBorder);
  }
}
