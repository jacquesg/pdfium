/**
 * Wrapper for a newly created PDF attachment with mutation methods.
 *
 * @module document/attachment-writer
 */

import { AttachmentValueType } from '../core/types.js';
import { attachmentValueTypeMap, fromNative } from '../internal/enum-maps.js';
import type { AttachmentHandle, DocumentHandle } from '../internal/handles.js';
import { INTERNAL } from '../internal/symbols.js';
import type { PDFiumWASM } from '../wasm/bindings/index.js';
import { encodeUTF16LE, NULL_PTR, type WASMMemoryManager } from '../wasm/memory.js';
import { getWasmStringUTF16LE } from '../wasm/utils.js';

/**
 * A writer for a newly created PDF attachment.
 *
 * Obtained from {@link PDFiumDocument.addAttachment}. Provides methods
 * for setting file contents and metadata on the attachment.
 *
 * Lifecycle is managed by the parent document — do not dispose manually.
 */
/** @internal */
export interface AttachmentWriterContext {
  readonly module: PDFiumWASM;
  readonly memory: WASMMemoryManager;
  readonly handle: AttachmentHandle;
  readonly documentHandle: DocumentHandle;
  readonly ensureDocumentValid: () => void;
}

export class PDFiumAttachmentWriter {
  readonly #module: PDFiumWASM;
  readonly #memory: WASMMemoryManager;
  readonly #handle: AttachmentHandle;
  readonly #documentHandle: DocumentHandle;
  readonly #ensureDocumentValid: () => void;

  /** @internal */
  constructor(ctx: AttachmentWriterContext) {
    this.#module = ctx.module;
    this.#memory = ctx.memory;
    this.#handle = ctx.handle;
    this.#documentHandle = ctx.documentHandle;
    this.#ensureDocumentValid = ctx.ensureDocumentValid;
  }

  /**
   * Set the file contents of this attachment.
   *
   * @param contents - The file contents
   * @returns True if successful
   */
  setFile(contents: Uint8Array): boolean {
    this.#ensureDocumentValid();
    if (contents.length === 0) {
      return this.#module._FPDFAttachment_SetFile(this.#handle, this.#documentHandle, NULL_PTR, 0) !== 0;
    }

    using contentBuffer = this.#memory.alloc(contents.length);
    this.#memory.heapU8.set(contents, contentBuffer.ptr);
    return (
      this.#module._FPDFAttachment_SetFile(this.#handle, this.#documentHandle, contentBuffer.ptr, contents.length) !== 0
    );
  }

  /**
   * Check if this attachment has a specific key.
   *
   * @param key - The key to check
   * @returns True if the key exists
   */
  hasKey(key: string): boolean {
    this.#ensureDocumentValid();
    using keyBuffer = this.#memory.allocString(key);
    return this.#module._FPDFAttachment_HasKey(this.#handle, keyBuffer.ptr) !== 0;
  }

  /**
   * Get the value type of a key on this attachment.
   *
   * @param key - The key to check
   * @returns The value type
   */
  getValueType(key: string): AttachmentValueType {
    this.#ensureDocumentValid();
    using keyBuffer = this.#memory.allocString(key);
    return fromNative(
      attachmentValueTypeMap.fromNative,
      this.#module._FPDFAttachment_GetValueType(this.#handle, keyBuffer.ptr),
      AttachmentValueType.Unknown,
    );
  }

  /**
   * Get a string value from this attachment.
   *
   * @param key - The key to get
   * @returns The string value or undefined if not found
   */
  getStringValue(key: string): string | undefined {
    this.#ensureDocumentValid();
    using keyBuffer = this.#memory.allocString(key);
    return getWasmStringUTF16LE(this.#memory, (buf, len) =>
      this.#module._FPDFAttachment_GetStringValue(this.#handle, keyBuffer.ptr, buf, len),
    );
  }

  /**
   * Set a string value on this attachment.
   *
   * @param key - The key to set
   * @param value - The string value
   * @returns True if successful
   */
  setStringValue(key: string, value: string): boolean {
    this.#ensureDocumentValid();
    using keyBuffer = this.#memory.allocString(key);
    const valueBytes = encodeUTF16LE(value);
    using valueBuffer = this.#memory.allocFrom(valueBytes);
    return this.#module._FPDFAttachment_SetStringValue(this.#handle, keyBuffer.ptr, valueBuffer.ptr) !== 0;
  }

  /** @internal */
  get [INTERNAL](): { handle: AttachmentHandle } {
    return { handle: this.#handle };
  }
}
