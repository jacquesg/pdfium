/**
 * Shared save utilities for PDF document serialisation.
 *
 * @module document/save-utils
 */

import { DocumentError, PDFiumErrorCode } from '../core/errors.js';
import { SaveFlags, type DocumentHandle, type SaveOptions } from '../core/types.js';
import type { PDFiumWASM } from '../wasm/bindings.js';
import { ptrOffset, type WASMMemoryManager } from '../wasm/memory.js';

/** Size of FPDF_FILEWRITE struct: version (4 bytes) + WriteBlock callback pointer (4 bytes). */
const FPDF_FILEWRITE_SIZE = 8;
/** Byte offset of the version field in FPDF_FILEWRITE. */
const FPDF_FILEWRITE_VERSION_OFFSET = 0;
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
 */
export function saveDocument(
  module: PDFiumWASM,
  memory: WASMMemoryManager,
  docHandle: DocumentHandle,
  options: SaveOptions = {},
): Uint8Array {
  const flags = options.flags ?? SaveFlags.None;
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
    } catch {
      return 0;
    }
  };

  const funcPtr = module.addFunction(writeBlock, 'iiii');

  try {
    using fileWrite = memory.alloc(FPDF_FILEWRITE_SIZE);
    memory.writeInt32(ptrOffset(fileWrite.ptr, FPDF_FILEWRITE_VERSION_OFFSET), 1);
    memory.writeInt32(ptrOffset(fileWrite.ptr, FPDF_FILEWRITE_CALLBACK_OFFSET), funcPtr);

    const success = options.version !== undefined
      ? module._FPDF_SaveWithVersion(docHandle, fileWrite.ptr, flags, options.version)
      : module._FPDF_SaveAsCopy(docHandle, fileWrite.ptr, flags);

    if (!success) {
      throw new DocumentError(PDFiumErrorCode.DOC_SAVE_FAILED, 'Failed to save document');
    }
  } finally {
    module.removeFunction(funcPtr);
  }

  const result = new Uint8Array(totalSize);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  return result;
}
