import type { SetAnnotationStyleCommandOptions } from './annotation-command-types.js';
import { applyAnnotationStyleCommandMutation } from './annotation-style-command-support.js';
import { type EditorCommand, type PageAccessor, withPage } from './command-shared.js';

export class SetAnnotationStyleCommand implements EditorCommand {
  readonly description = 'Change annotation style';
  readonly #getPage: PageAccessor;
  readonly #annotationIndex: number;
  readonly #style: SetAnnotationStyleCommandOptions;

  constructor(getPage: PageAccessor, annotationIndex: number, style: SetAnnotationStyleCommandOptions) {
    this.#getPage = getPage;
    this.#annotationIndex = annotationIndex;
    this.#style = style;
  }

  async execute(): Promise<void> {
    await withPage(this.#getPage, async (page) => {
      await applyAnnotationStyleCommandMutation(page, this.#annotationIndex, this.#style, false);
    });
  }

  async undo(): Promise<void> {
    await withPage(this.#getPage, async (page) => {
      await applyAnnotationStyleCommandMutation(page, this.#annotationIndex, this.#style, true);
    });
  }
}
