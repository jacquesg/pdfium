import type { WorkerPDFiumDocument } from '../../context/worker-client.js';
import type { EditorCommand } from './command-shared.js';

export class DeletePageCommand implements EditorCommand {
  readonly description: string;
  readonly #document: WorkerPDFiumDocument;
  readonly #pageIndex: number;
  readonly #width: number;
  readonly #height: number;

  constructor(document: WorkerPDFiumDocument, pageIndex: number, width: number, height: number) {
    this.#document = document;
    this.#pageIndex = pageIndex;
    this.#width = width;
    this.#height = height;
    this.description = `Delete page ${String(pageIndex + 1)}`;
  }

  async execute(): Promise<void> {
    await this.#document.deletePage(this.#pageIndex);
  }

  async undo(): Promise<void> {
    await this.#document.insertBlankPage(this.#pageIndex, this.#width, this.#height);
  }
}

export class InsertBlankPageCommand implements EditorCommand {
  readonly description: string;
  readonly #document: WorkerPDFiumDocument;
  readonly #pageIndex: number;
  readonly #width: number;
  readonly #height: number;

  constructor(document: WorkerPDFiumDocument, pageIndex: number, width = 612, height = 792) {
    this.#document = document;
    this.#pageIndex = pageIndex;
    this.#width = width;
    this.#height = height;
    this.description = `Insert blank page at ${String(pageIndex + 1)}`;
  }

  async execute(): Promise<void> {
    await this.#document.insertBlankPage(this.#pageIndex, this.#width, this.#height);
  }

  async undo(): Promise<void> {
    await this.#document.deletePage(this.#pageIndex);
  }
}
