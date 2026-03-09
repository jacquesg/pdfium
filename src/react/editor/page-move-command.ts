import type { WorkerPDFiumDocument } from '../../context/worker-client.js';
import type { EditorCommand } from './command-shared.js';

export class MovePageCommand implements EditorCommand {
  readonly description = 'Move pages';
  readonly #document: WorkerPDFiumDocument;
  readonly #pageIndices: number[];
  readonly #destPageIndex: number;

  constructor(document: WorkerPDFiumDocument, pageIndices: number[], destPageIndex: number) {
    if (pageIndices.length > 1) {
      throw new Error('MovePageCommand only supports single-page moves');
    }
    this.#document = document;
    this.#pageIndices = pageIndices;
    this.#destPageIndex = destPageIndex;
  }

  async execute(): Promise<void> {
    await this.#document.movePages(this.#pageIndices, this.#destPageIndex);
  }

  async undo(): Promise<void> {
    const count = this.#pageIndices.length;
    const movedIndices = Array.from({ length: count }, (_, index) => this.#destPageIndex + index);
    const originalFirst = this.#pageIndices[0];
    if (originalFirst !== undefined) {
      await this.#document.movePages(movedIndices, originalFirst);
    }
  }
}
