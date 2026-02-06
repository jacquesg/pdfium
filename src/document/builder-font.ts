/**
 * Wrapper for a standard PDF font loaded via the builder API.
 *
 * @module document/builder-font
 */

import type { FontHandle } from '../internal/handles.js';
import { INTERNAL } from '../internal/symbols.js';

/**
 * A standard PDF font loaded via {@link PDFiumDocumentBuilder.loadStandardFont}.
 *
 * Font lifecycle is managed by the parent builder — do not dispose manually.
 */
export class PDFiumBuilderFont {
  readonly #handle: FontHandle;
  readonly #name: string;

  /** @internal */
  constructor(handle: FontHandle, name: string) {
    this.#handle = handle;
    this.#name = name;
  }

  /** The font name (e.g. "Helvetica", "Times-Roman"). */
  get name(): string {
    return this.#name;
  }

  /** @internal */
  get [INTERNAL](): { handle: FontHandle } {
    return { handle: this.#handle };
  }
}
