/**
 * Shared save utilities for PDF document serialisation.
 *
 * @module document/save-utils
 */

import { DocumentError, PDFiumErrorCode } from '../core/errors.js';
import { getLogger } from '../core/logger.js';
import { SaveFlags, type SaveOptions } from '../core/types.js';
import { saveFlagsMap, toNative } from '../internal/enum-maps.js';
import type { DocumentHandle, WASMPointer } from '../internal/handles.js';
import type { WASMAllocation } from '../wasm/allocation.js';
import type { PDFiumWASM } from '../wasm/bindings/index.js';
import { ptrOffset, type WASMMemoryManager } from '../wasm/memory.js';

/** Size of FPDF_FILEWRITE struct: version (4 bytes) + WriteBlock callback pointer (4 bytes). */
const FPDF_FILEWRITE_SIZE = 8;
/** Byte offset of the WriteBlock callback pointer in FPDF_FILEWRITE. */
const FPDF_FILEWRITE_CALLBACK_OFFSET = 4;

/**
 * Type for the WriteBlock callback passed to PDFium's save functions.
 *
 * @param pThis - Pointer to the FPDF_FILEWRITE struct (unused).
 * @param pData - Pointer to the data buffer to write.
 * @param size - Number of bytes to write.
 * @returns 1 on success, 0 on failure.
 */
type WriteBlockCallback = (pThis: number, pData: number, size: number) => number;

/**
 * Save a PDF document to a byte array using PDFium's FPDF_FILEWRITE mechanism.
 *
 * This function is shared between {@link PDFiumDocument.save} and
 * {@link PDFiumDocumentBuilder.save} to eliminate code duplication.
 *
 * @param module - The PDFium WASM module.
 * @param memory - The WASM memory manager.
 * @param docHandle - The document handle to save.
 * @param options - Save options (flags, version).
 * @returns The serialised PDF bytes.
 * @throws {DocumentError} If the save operation fails.
 * @internal
 */
export function saveDocument(
  module: PDFiumWASM,
  memory: WASMMemoryManager,
  docHandle: DocumentHandle,
  options: SaveOptions = {},
): Uint8Array {
  if (
    options.version !== undefined &&
    (!Number.isSafeInteger(options.version) || options.version < 10 || options.version > 21)
  ) {
    throw new DocumentError(
      PDFiumErrorCode.DOC_SAVE_FAILED,
      `Save version must be an integer between 10 (PDF 1.0) and 21 (PDF 2.1), got ${options.version}`,
    );
  }

  const nativeFlags = toNative(saveFlagsMap.toNative, options.flags ?? SaveFlags.None);
  const chunks: Uint8Array[] = [];
  let totalSize = 0;

  const writeBlock: WriteBlockCallback = (_pThis, pData, size) => {
    try {
      if (size > 0 && pData > 0) {
        const chunk = module.HEAPU8.slice(pData, pData + size);
        chunks.push(chunk);
        totalSize += size;
      }
      return 1;
    } catch (error) {
      if (__DEV__) {
        getLogger().warn('WriteBlock callback error:', error);
      }
      return 0;
    }
  };

  using fileWrite = new FSFileWrite(memory, module, writeBlock);

  const success =
    options.version !== undefined
      ? module._FPDF_SaveWithVersion(docHandle, fileWrite.ptr, nativeFlags, options.version)
      : module._FPDF_SaveAsCopy(docHandle, fileWrite.ptr, nativeFlags);

  if (!success) {
    throw new DocumentError(PDFiumErrorCode.DOC_SAVE_FAILED, 'Failed to save document');
  }

  const result = new Uint8Array(totalSize);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  return result;
}

/**
 * RAII wrapper for FPDF_FILEWRITE struct.
 * Handles allocation and callback registration.
 */
class FSFileWrite implements Disposable {
  readonly #allocation: WASMAllocation;
  readonly #module: PDFiumWASM;
  readonly #callbackPtr: number;

  constructor(
    memory: WASMMemoryManager,
    module: PDFiumWASM,
    callback: (pThis: number, pData: number, size: number) => number,
  ) {
    this.#module = module;
    this.#allocation = memory.alloc(FPDF_FILEWRITE_SIZE);

    // Register callback: int (*WriteBlock)(FPDF_FILEWRITE* pThis, void* pData, unsigned long size);
    this.#callbackPtr = module.addFunction(callback, 'iiii');

    memory.writeInt32(this.#allocation.ptr, 1); // version = 1
    memory.writeInt32(ptrOffset(this.#allocation.ptr, FPDF_FILEWRITE_CALLBACK_OFFSET), this.#callbackPtr);
  }

  get ptr(): WASMPointer {
    return this.#allocation.ptr;
  }

  [Symbol.dispose](): void {
    if (this.#callbackPtr !== 0) {
      this.#module.removeFunction(this.#callbackPtr);
    }
    this.#allocation[Symbol.dispose]();
  }
}
