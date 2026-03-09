import type { AnnotationBorder, AnnotationColourType, Colour } from '../../core/types.js';
import {
  type AnnotationColourCommandOptions,
  canCoalesceAnnotationColourCommand,
  runAnnotationColourMutation,
} from './annotation-colour-command-support.js';
import type { EditorCommand, PageAccessor } from './command-shared.js';

export class SetAnnotationColourCommand implements EditorCommand {
  readonly description = 'Change annotation colour';
  readonly #getPage: PageAccessor;
  readonly #annotationIndex: number;
  readonly #colourType: AnnotationColourType;
  readonly #oldColour: Colour;
  readonly #newColour: Colour;
  readonly #preserveBorder: AnnotationBorder | null;

  constructor(
    getPage: PageAccessor,
    annotationIndex: number,
    colourType: AnnotationColourType,
    oldColour: Colour,
    newColour: Colour,
    preserveBorder: AnnotationBorder | null = null,
  ) {
    this.#getPage = getPage;
    this.#annotationIndex = annotationIndex;
    this.#colourType = colourType;
    this.#oldColour = oldColour;
    this.#newColour = newColour;
    this.#preserveBorder = preserveBorder;
  }

  async execute(): Promise<void> {
    await runAnnotationColourMutation(this.#getPage, this.#toOptions(), false);
  }

  async undo(): Promise<void> {
    await runAnnotationColourMutation(this.#getPage, this.#toOptions(), true);
  }

  coalesce(next: EditorCommand): EditorCommand | null {
    if (!(next instanceof SetAnnotationColourCommand)) return null;
    if (!canCoalesceAnnotationColourCommand(this.#getPage, this.#toOptions(), next.#getPage, next.#toOptions())) {
      return null;
    }
    return new SetAnnotationColourCommand(
      this.#getPage,
      this.#annotationIndex,
      this.#colourType,
      this.#oldColour,
      next.#newColour,
      this.#preserveBorder,
    );
  }

  #toOptions(): AnnotationColourCommandOptions {
    return {
      annotationIndex: this.#annotationIndex,
      colourType: this.#colourType,
      oldColour: this.#oldColour,
      newColour: this.#newColour,
      preserveBorder: this.#preserveBorder,
    };
  }
}
