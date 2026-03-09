import { assertMutationSucceeded, type EditorCommand, type PageAccessor, withPage } from './command-shared.js';

export class SetAnnotationStringCommand implements EditorCommand {
  readonly description: string;
  readonly #getPage: PageAccessor;
  readonly #annotationIndex: number;
  readonly #key: string;
  readonly #oldValue: string;
  readonly #newValue: string;

  constructor(getPage: PageAccessor, annotationIndex: number, key: string, oldValue: string, newValue: string) {
    this.#getPage = getPage;
    this.#annotationIndex = annotationIndex;
    this.#key = key;
    this.#oldValue = oldValue;
    this.#newValue = newValue;
    this.description = `Set annotation ${key}`;
  }

  async execute(): Promise<void> {
    await withPage(this.#getPage, async (page) => {
      assertMutationSucceeded(
        `set annotation ${this.#key}`,
        await page.setAnnotationString(this.#annotationIndex, this.#key, this.#newValue),
      );
      await page.generateContent();
    });
  }

  async undo(): Promise<void> {
    await withPage(this.#getPage, async (page) => {
      assertMutationSucceeded(
        `restore annotation ${this.#key}`,
        await page.setAnnotationString(this.#annotationIndex, this.#key, this.#oldValue),
      );
      await page.generateContent();
    });
  }
}
