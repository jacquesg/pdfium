/**
 * Page import and merge WASM bindings.
 *
 * @module wasm/bindings/import
 */

import type { DocumentHandle, WASMPointer } from '../../internal/handles.js';

/**
 * Page import and merge WASM bindings.
 *
 * These functions allow copying pages between PDF documents.
 */
export interface ImportBindings {
  /**
   * Import pages from a source document.
   *
   * @param destDoc - Destination document handle
   * @param srcDoc - Source document handle
   * @param pageRange - Page range string (e.g., "1-3,5,8-10") or null for all pages
   * @param insertIndex - Zero-based index to insert pages at
   * @returns Non-zero on success
   */
  _FPDF_ImportPages: (
    destDoc: DocumentHandle,
    srcDoc: DocumentHandle,
    pageRange: WASMPointer,
    insertIndex: number,
  ) => number;

  /**
   * Import pages by index array.
   *
   * @param destDoc - Destination document handle
   * @param srcDoc - Source document handle
   * @param pageIndices - Pointer to array of page indices
   * @param length - Number of page indices
   * @param insertIndex - Zero-based index to insert pages at
   * @returns Non-zero on success
   */
  _FPDF_ImportPagesByIndex: (
    destDoc: DocumentHandle,
    srcDoc: DocumentHandle,
    pageIndices: WASMPointer,
    length: number,
    insertIndex: number,
  ) => number;

  /**
   * Create a new document with N-up layout (multiple pages per sheet).
   *
   * @param srcDoc - Source document handle
   * @param outputWidth - Output page width in points
   * @param outputHeight - Output page height in points
   * @param pagesPerRow - Number of pages per row
   * @param pagesPerColumn - Number of pages per column
   * @returns New document handle or null on failure
   */
  _FPDF_ImportNPagesToOne: (
    srcDoc: DocumentHandle,
    outputWidth: number,
    outputHeight: number,
    pagesPerRow: number,
    pagesPerColumn: number,
  ) => DocumentHandle;

  /**
   * Copy viewer preferences from source to destination document.
   *
   * @param destDoc - Destination document handle
   * @param srcDoc - Source document handle
   * @returns Non-zero on success
   */
  _FPDF_CopyViewerPreferences: (destDoc: DocumentHandle, srcDoc: DocumentHandle) => number;
}
