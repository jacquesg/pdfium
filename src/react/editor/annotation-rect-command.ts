import type { Rect } from '../../core/types.js';
import { assertMutationSucceeded, type EditorCommand, type PageAccessor, withPage } from './command-shared.js';

export class SetAnnotationRectCommand implements EditorCommand {
  readonly description: string;
  readonly #getPage: PageAccessor;
  readonly #annotationIndex: number;
  readonly #oldRect: Rect;
  readonly #newRect: Rect;

  constructor(
    getPage: PageAccessor,
    annotationIndex: number,
    oldRect: Rect,
    newRect: Rect,
    description = 'Set annotation rect',
  ) {
    this.#getPage = getPage;
    this.#annotationIndex = annotationIndex;
    this.#oldRect = oldRect;
    this.#newRect = newRect;
    this.description = description;
  }

  async execute(): Promise<void> {
    await withPage(this.#getPage, async (page) => {
      assertMutationSucceeded(
        'set annotation rect',
        await page.setAnnotationRect(this.#annotationIndex, this.#newRect),
      );
      await page.generateContent();
    });
  }

  async undo(): Promise<void> {
    await withPage(this.#getPage, async (page) => {
      assertMutationSucceeded(
        'restore annotation rect',
        await page.setAnnotationRect(this.#annotationIndex, this.#oldRect),
      );
      await page.generateContent();
    });
  }
}
