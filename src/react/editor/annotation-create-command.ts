import type { AnnotationType, Rect } from '../../core/types.js';
import type { CreateAnnotationOptions } from './annotation-command-types.js';
import { applyCreateAnnotationOptions } from './annotation-create-command-support.js';
import { assertMutationSucceeded, type EditorCommand, type PageAccessor, withPage } from './command-shared.js';

export class CreateAnnotationCommand implements EditorCommand {
  readonly description: string;
  readonly #getPage: PageAccessor;
  readonly #subtype: AnnotationType;
  readonly #rect: Rect;
  readonly #options: CreateAnnotationOptions;
  #createdIndex: number | undefined;

  constructor(getPage: PageAccessor, subtype: AnnotationType, rect: Rect, options: CreateAnnotationOptions = {}) {
    this.#getPage = getPage;
    this.#subtype = subtype;
    this.#rect = rect;
    this.#options = options;
    this.description = `Create ${subtype} annotation`;
  }

  get createdIndex(): number | undefined {
    return this.#createdIndex;
  }

  async execute(): Promise<void> {
    await withPage(this.#getPage, async (page) => {
      const result = await page.createAnnotation(this.#subtype);
      this.#createdIndex = result.index;
      assertMutationSucceeded(
        `set ${this.#subtype} annotation rect`,
        await page.setAnnotationRect(result.index, this.#rect),
      );
      await applyCreateAnnotationOptions(page, result.index, this.#subtype, this.#options);
      await page.generateContent();
    });
  }

  async undo(): Promise<void> {
    const index = this.#createdIndex;
    if (index === undefined) return;
    await withPage(this.#getPage, async (page) => {
      assertMutationSucceeded('remove created annotation', await page.removeAnnotation(index));
      await page.generateContent();
    });
    this.#createdIndex = undefined;
  }
}
