import type { WorkerPDFiumDocument } from '../../context/worker-client.js';
import type { Colour } from '../../core/types.js';
import { type DocumentOpener, type EditorCommand, restoreDocumentFromSnapshot } from './command-shared.js';

export interface ApplyRedactionsCommandOptions {
  readonly fillColour?: Colour;
  readonly removeIntersectingAnnotations?: boolean;
}

/**
 * Apply pending redactions on a page.
 *
 * Undo/redo are lossless via full-document snapshots because page-level
 * redaction application is destructive and cannot be reconstructed reliably
 * from annotation primitives.
 */
export class ApplyRedactionsCommand implements EditorCommand {
  readonly description: string;
  readonly #document: WorkerPDFiumDocument;
  readonly #openDocument: DocumentOpener;
  readonly #pageIndex: number;
  readonly #options: ApplyRedactionsCommandOptions;
  #beforeDocumentBytes: Uint8Array | undefined;
  #afterDocumentBytes: Uint8Array | undefined;

  constructor(
    document: WorkerPDFiumDocument,
    openDocument: DocumentOpener,
    pageIndex: number,
    options: ApplyRedactionsCommandOptions = {},
  ) {
    this.#document = document;
    this.#openDocument = openDocument;
    this.#pageIndex = pageIndex;
    this.#options = options;
    this.description = `Apply redactions on page ${String(pageIndex + 1)}`;
  }

  async execute(): Promise<void> {
    if (this.#beforeDocumentBytes !== undefined && this.#afterDocumentBytes !== undefined) {
      await restoreDocumentFromSnapshot(this.#document, this.#afterDocumentBytes, this.#openDocument);
      return;
    }

    this.#beforeDocumentBytes = await this.#document.save();
    const page = await this.#document.getPage(this.#pageIndex);
    try {
      await page.applyRedactions(this.#options.fillColour, this.#options.removeIntersectingAnnotations);
    } finally {
      await page[Symbol.asyncDispose]();
    }
    this.#afterDocumentBytes = await this.#document.save();
  }

  async undo(): Promise<void> {
    if (this.#beforeDocumentBytes === undefined || this.#afterDocumentBytes === undefined) {
      return;
    }
    await restoreDocumentFromSnapshot(this.#document, this.#beforeDocumentBytes, this.#openDocument);
  }
}
