/**
 * High-level native PDFium instance.
 *
 * Provides document loading backed by the native PDFium addon,
 * analogous to the PDFium class for the WASM backend.
 *
 * @module document/native-instance
 */

import { NativeBackend } from '../backend/native.js';
import { Disposable } from '../core/disposable.js';
import { DocumentError, InitialisationError, PDFiumErrorCode } from '../core/errors.js';
import { DEFAULT_LIMITS, type OpenDocumentOptions, type PDFiumLimits } from '../core/types.js';
import type { NativePdfium } from '../native/types.js';
import { NativePDFiumDocument } from './native-document.js';

/** PDFium native error codes returned by FPDF_GetLastError(). */
const NativeErrorCode = {
  FILE: 2,
  FORMAT: 3,
  PASSWORD: 4,
  SECURITY: 5,
  PAGE: 6,
} as const;

/**
 * A PDFium instance backed by the native addon.
 *
 * Use `PDFium.initNative()` to create an instance. Provides core document
 * operations (page count, page access, text extraction, rendering) without
 * requiring the WASM module.
 *
 * @example
 * ```typescript
 * const pdfium = await PDFium.initNative();
 * if (pdfium) {
 *   using doc = pdfium.openDocument(pdfBytes);
 *   console.log(`Document has ${doc.pageCount} pages`);
 * }
 * ```
 */
export class NativePDFiumInstance extends Disposable {
  readonly #backend: NativeBackend;
  readonly #limits: Readonly<Required<PDFiumLimits>>;
  readonly #documents = new Set<NativePDFiumDocument>();

  /** @internal */
  constructor(backend: NativeBackend, limits?: PDFiumLimits) {
    super('NativePDFiumInstance');

    if (limits !== undefined) {
      if (
        limits.maxDocumentSize !== undefined &&
        (!Number.isSafeInteger(limits.maxDocumentSize) || limits.maxDocumentSize <= 0)
      ) {
        throw new InitialisationError(
          PDFiumErrorCode.INIT_INVALID_OPTIONS,
          'maxDocumentSize must be a positive integer',
        );
      }
      if (
        limits.maxRenderDimension !== undefined &&
        (!Number.isSafeInteger(limits.maxRenderDimension) || limits.maxRenderDimension <= 0)
      ) {
        throw new InitialisationError(
          PDFiumErrorCode.INIT_INVALID_OPTIONS,
          'maxRenderDimension must be a positive integer',
        );
      }
      if (
        limits.maxTextCharCount !== undefined &&
        (!Number.isSafeInteger(limits.maxTextCharCount) || limits.maxTextCharCount <= 0)
      ) {
        throw new InitialisationError(
          PDFiumErrorCode.INIT_INVALID_OPTIONS,
          'maxTextCharCount must be a positive integer',
        );
      }
    }

    this.#backend = backend;
    this.#limits = {
      maxDocumentSize: limits?.maxDocumentSize ?? DEFAULT_LIMITS.maxDocumentSize,
      maxRenderDimension: limits?.maxRenderDimension ?? DEFAULT_LIMITS.maxRenderDimension,
      maxTextCharCount: limits?.maxTextCharCount ?? DEFAULT_LIMITS.maxTextCharCount,
    };

    this.setFinalizerCleanup(() => {
      for (const doc of this.#documents) {
        doc.dispose();
      }
      this.#documents.clear();
      this.#backend.destroyLibrary();
    });
  }

  /**
   * Create a NativePDFiumInstance from a loaded native binding.
   *
   * @internal
   */
  static fromBinding(binding: NativePdfium, limits?: PDFiumLimits): NativePDFiumInstance {
    const backend = new NativeBackend(binding);
    backend.initLibrary();
    return new NativePDFiumInstance(backend, limits);
  }

  /**
   * Open a PDF document from binary data.
   *
   * @param data - PDF file data
   * @param options - Document options (e.g., password)
   * @returns The loaded document
   * @throws {DocumentError} If the document cannot be opened
   */
  openDocument(data: Uint8Array | ArrayBuffer, options: OpenDocumentOptions = {}): NativePDFiumDocument {
    this.ensureNotDisposed();

    const bytes = data instanceof ArrayBuffer ? new Uint8Array(data) : data;

    if (bytes.length > this.#limits.maxDocumentSize) {
      throw new DocumentError(
        PDFiumErrorCode.DOC_FORMAT_INVALID,
        `Document size ${bytes.length} exceeds maximum allowed size of ${this.#limits.maxDocumentSize} bytes`,
        { documentSize: bytes.length, maxDocumentSize: this.#limits.maxDocumentSize },
      );
    }

    const docHandle = this.#backend.loadDocument(bytes, options.password);
    if (docHandle === 0) {
      throw this.#getDocumentError();
    }

    const doc = new NativePDFiumDocument(this.#backend, docHandle, this.#limits, (d) => this.#documents.delete(d));
    this.#documents.add(doc);
    return doc;
  }

  /** Get the configured resource limits. */
  get limits(): Readonly<Required<PDFiumLimits>> {
    return this.#limits;
  }

  #getDocumentError(): DocumentError {
    const errorCode = this.#backend.getLastError();

    switch (errorCode) {
      case NativeErrorCode.FILE:
        return new DocumentError(PDFiumErrorCode.DOC_FILE_NOT_FOUND);
      case NativeErrorCode.FORMAT:
        return new DocumentError(PDFiumErrorCode.DOC_FORMAT_INVALID);
      case NativeErrorCode.PASSWORD:
        return new DocumentError(PDFiumErrorCode.DOC_PASSWORD_REQUIRED);
      case NativeErrorCode.SECURITY:
        return new DocumentError(PDFiumErrorCode.DOC_SECURITY_UNSUPPORTED);
      case NativeErrorCode.PAGE:
        return new DocumentError(PDFiumErrorCode.DOC_FORMAT_INVALID, 'Invalid page');
      default:
        return new DocumentError(PDFiumErrorCode.DOC_LOAD_UNKNOWN, `Unknown error code: ${errorCode}`);
    }
  }

  protected disposeInternal(): void {
    for (const doc of this.#documents) {
      doc.dispose();
    }
    this.#documents.clear();
    this.#backend.destroyLibrary();
  }
}
