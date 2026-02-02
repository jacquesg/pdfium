/**
 * WASM backend implementation wrapping PDFiumWASM + WASMMemoryManager.
 *
 * @module backend/wasm
 */

import type { PDFiumWASM } from '../wasm/bindings/index.js';
import { NULL_PTR, ptrOffset, type WASMMemoryManager } from '../wasm/memory.js';
import type { BackendAnnotation, BackendBookmark, BackendLink, PDFiumBackend } from './types.js';

/** UTF-16LE null terminator size in bytes. */
const UTF16LE_NULL_BYTES = 2;
/** UTF-16LE bytes per character. */
const UTF16LE_BYTES_PER_CHAR = 2;

/**
 * WASM PDFium backend wrapping the Emscripten module and memory manager.
 *
 * Each operation encapsulates the full alloc-call-read-free cycle.
 */
export class WasmBackend implements PDFiumBackend {
  readonly kind = 'wasm' as const;
  readonly #module: PDFiumWASM;
  readonly #memory: WASMMemoryManager;

  constructor(module: PDFiumWASM, memory: WASMMemoryManager) {
    this.#module = module;
    this.#memory = memory;
  }

  /** Access the underlying WASM module (for advanced operations not in the backend interface). */
  get module(): PDFiumWASM {
    return this.#module;
  }

  /** Access the underlying memory manager (for advanced operations not in the backend interface). */
  get memory(): WASMMemoryManager {
    return this.#memory;
  }

  initLibrary(): void {
    const FPDF_CONFIG_VERSION = 2;
    const CONFIG_STRUCT_SIZE = 4 + 4 * 4;
    using config = this.#memory.alloc(CONFIG_STRUCT_SIZE);
    this.#module.HEAPU8.fill(0, config.ptr, config.ptr + CONFIG_STRUCT_SIZE);
    this.#memory.writeInt32(config.ptr, FPDF_CONFIG_VERSION);
    this.#module._FPDF_InitLibraryWithConfig(config.ptr);
  }

  destroyLibrary(): void {
    this.#module._FPDF_DestroyLibrary();
  }

  getLastError(): number {
    return this.#module._FPDF_GetLastError();
  }

  loadDocument(data: Uint8Array, password?: string): number {
    const dataAlloc = this.#memory.allocFrom(data);
    const passwordAlloc = password !== undefined ? this.#memory.allocString(password) : undefined;
    const passwordPtr = passwordAlloc !== undefined ? passwordAlloc.ptr : NULL_PTR;

    const handle = this.#module._FPDF_LoadMemDocument(dataAlloc.ptr, data.length, passwordPtr);

    passwordAlloc?.[Symbol.dispose]();

    if (handle === 0) {
      dataAlloc[Symbol.dispose]();
      return 0;
    }

    // Data must remain allocated while the document is open.
    // The caller is responsible for freeing it via closeDocument().
    // Store the data pointer in the handle for later cleanup.
    // NOTE: This is a simplified approach — the WASM backend is primarily used
    // as a passthrough for the backend interface. The existing PDFium class
    // manages WASM memory directly for the WASM path.
    dataAlloc.take();

    return handle as number;
  }

  closeDocument(docHandle: number): void {
    this.#module._FPDF_CloseDocument(docHandle as never);
  }

  getPageCount(docHandle: number): number {
    return this.#module._FPDF_GetPageCount(docHandle as never);
  }

  loadPage(docHandle: number, pageIndex: number): number {
    return this.#module._FPDF_LoadPage(docHandle as never, pageIndex) as number;
  }

  closePage(pageHandle: number): void {
    this.#module._FPDF_ClosePage(pageHandle as never);
  }

  getPageWidth(pageHandle: number): number {
    return this.#module._FPDF_GetPageWidth(pageHandle as never);
  }

  getPageHeight(pageHandle: number): number {
    return this.#module._FPDF_GetPageHeight(pageHandle as never);
  }

  loadTextPage(pageHandle: number): number {
    return this.#module._FPDFText_LoadPage(pageHandle as never) as number;
  }

  closeTextPage(textPageHandle: number): void {
    this.#module._FPDFText_ClosePage(textPageHandle as never);
  }

  countTextChars(textPageHandle: number): number {
    return this.#module._FPDFText_CountChars(textPageHandle as never);
  }

  getFullText(textPageHandle: number): string {
    const charCount = this.#module._FPDFText_CountChars(textPageHandle as never);
    if (charCount <= 0) {
      return '';
    }

    const bufferSize = (charCount + 1) * 2;
    using bufferAlloc = this.#memory.alloc(bufferSize);

    const extracted = this.#module._FPDFText_GetText(textPageHandle as never, 0, charCount, bufferAlloc.ptr);
    if (extracted <= 0) {
      return '';
    }

    return this.#memory.readUTF16LE(bufferAlloc.ptr, extracted - 1);
  }

  getCharFontSize(textPageHandle: number, charIndex: number): number {
    return this.#module._FPDFText_GetFontSize(textPageHandle as never, charIndex);
  }

  getCharFontWeight(textPageHandle: number, charIndex: number): number {
    return this.#module._FPDFText_GetFontWeight(textPageHandle as never, charIndex);
  }

  getCharFontInfo(textPageHandle: number, charIndex: number): { name: string; flags: number } | null {
    using flagsAlloc = this.#memory.alloc(4);

    // First call: get buffer size
    const requiredBytes = this.#module._FPDFText_GetFontInfo(
      textPageHandle as never,
      charIndex,
      NULL_PTR,
      0,
      flagsAlloc.ptr,
    );

    if (requiredBytes <= 0) {
      return null;
    }

    using bufferAlloc = this.#memory.alloc(requiredBytes);
    this.#module._FPDFText_GetFontInfo(
      textPageHandle as never,
      charIndex,
      bufferAlloc.ptr,
      requiredBytes,
      flagsAlloc.ptr,
    );

    // Font name is UTF-8 (null-terminated)
    const nameBytes = requiredBytes > 0 ? requiredBytes - 1 : 0;
    if (nameBytes <= 0) {
      return null;
    }

    const nameSlice = this.#module.HEAPU8.slice(bufferAlloc.ptr, bufferAlloc.ptr + nameBytes);
    const name = new TextDecoder().decode(nameSlice);
    const flags = this.#memory.readInt32(flagsAlloc.ptr);

    return { name, flags };
  }

  getCharRenderMode(textPageHandle: number, charIndex: number): number {
    const fn = this.#module._FPDFText_GetTextRenderMode;
    if (typeof fn !== 'function') {
      return 0; // TextRenderMode.Fill
    }
    return fn(textPageHandle as never, charIndex);
  }

  getCharUnicode(textPageHandle: number, charIndex: number): number {
    return this.#module._FPDFText_GetUnicode(textPageHandle as never, charIndex);
  }

  isCharGenerated(textPageHandle: number, charIndex: number): boolean {
    return this.#module._FPDFText_IsGenerated(textPageHandle as never, charIndex) !== 0;
  }

  isCharHyphen(textPageHandle: number, charIndex: number): boolean {
    return this.#module._FPDFText_IsHyphen(textPageHandle as never, charIndex) !== 0;
  }

  hasCharUnicodeMapError(textPageHandle: number, charIndex: number): boolean {
    return this.#module._FPDFText_HasUnicodeMapError(textPageHandle as never, charIndex) !== 0;
  }

  getCharAngle(textPageHandle: number, charIndex: number): number {
    return this.#module._FPDFText_GetCharAngle(textPageHandle as never, charIndex);
  }

  getCharOrigin(textPageHandle: number, charIndex: number): { x: number; y: number } | null {
    using xPtr = this.#memory.alloc(8);
    using yPtr = this.#memory.alloc(8);
    const ok = this.#module._FPDFText_GetCharOrigin(
      textPageHandle as never,
      charIndex,
      xPtr.ptr as never,
      yPtr.ptr as never,
    );
    if (ok === 0) {
      return null;
    }
    const xView = new Float64Array(this.#memory.heapU8.buffer, xPtr.ptr, 1);
    const yView = new Float64Array(this.#memory.heapU8.buffer, yPtr.ptr, 1);
    return { x: xView[0] ?? 0, y: yView[0] ?? 0 };
  }

  getCharBox(
    textPageHandle: number,
    charIndex: number,
  ): { left: number; right: number; bottom: number; top: number } | null {
    using buf = this.#memory.alloc(32); // 4 x f64
    const ok = this.#module._FPDFText_GetCharBox(
      textPageHandle as never,
      charIndex,
      buf.ptr as never,
      ptrOffset(buf.ptr, 8) as never,
      ptrOffset(buf.ptr, 16) as never,
      ptrOffset(buf.ptr, 24) as never,
    );
    if (ok === 0) {
      return null;
    }
    const view = new Float64Array(this.#memory.heapU8.buffer, buf.ptr, 4);
    return { left: view[0] ?? 0, right: view[1] ?? 0, bottom: view[2] ?? 0, top: view[3] ?? 0 };
  }

  getCharLooseBox(
    textPageHandle: number,
    charIndex: number,
  ): { left: number; top: number; right: number; bottom: number } | null {
    using buf = this.#memory.alloc(16); // 4 x f32 (FS_RECTF)
    const ok = this.#module._FPDFText_GetLooseCharBox(textPageHandle as never, charIndex, buf.ptr as never);
    if (ok === 0) {
      return null;
    }
    const view = new Float32Array(this.#memory.heapU8.buffer, buf.ptr, 4);
    return { left: view[0] ?? 0, top: view[1] ?? 0, right: view[2] ?? 0, bottom: view[3] ?? 0 };
  }

  getCharIndexAtPos(textPageHandle: number, x: number, y: number, xTolerance: number, yTolerance: number): number {
    return this.#module._FPDFText_GetCharIndexAtPos(textPageHandle as never, x, y, xTolerance, yTolerance);
  }

  getCharFillColour(textPageHandle: number, charIndex: number): { r: number; g: number; b: number; a: number } | null {
    using buf = this.#memory.alloc(16); // 4 x u32
    const ok = this.#module._FPDFText_GetFillColor(
      textPageHandle as never,
      charIndex,
      buf.ptr as never,
      ptrOffset(buf.ptr, 4) as never,
      ptrOffset(buf.ptr, 8) as never,
      ptrOffset(buf.ptr, 12) as never,
    );
    if (ok === 0) {
      return null;
    }
    const view = new Uint32Array(this.#memory.heapU8.buffer, buf.ptr, 4);
    return { r: view[0] ?? 0, g: view[1] ?? 0, b: view[2] ?? 0, a: view[3] ?? 0 };
  }

  getCharStrokeColour(
    textPageHandle: number,
    charIndex: number,
  ): { r: number; g: number; b: number; a: number } | null {
    using buf = this.#memory.alloc(16); // 4 x u32
    const ok = this.#module._FPDFText_GetStrokeColor(
      textPageHandle as never,
      charIndex,
      buf.ptr as never,
      ptrOffset(buf.ptr, 4) as never,
      ptrOffset(buf.ptr, 8) as never,
      ptrOffset(buf.ptr, 12) as never,
    );
    if (ok === 0) {
      return null;
    }
    const view = new Uint32Array(this.#memory.heapU8.buffer, buf.ptr, 4);
    return { r: view[0] ?? 0, g: view[1] ?? 0, b: view[2] ?? 0, a: view[3] ?? 0 };
  }

  getCharMatrix(textPageHandle: number, charIndex: number): number[] | null {
    using buf = this.#memory.alloc(48); // 6 x f64
    const ok = this.#module._FPDFText_GetMatrix(textPageHandle as never, charIndex, buf.ptr as never);
    if (ok === 0) {
      return null;
    }
    const view = new Float64Array(this.#memory.heapU8.buffer, buf.ptr, 6);
    return [view[0] ?? 0, view[1] ?? 0, view[2] ?? 0, view[3] ?? 0, view[4] ?? 0, view[5] ?? 0];
  }

  findText(textPageHandle: number, query: string, flags: number): { index: number; count: number }[] {
    // Encode query as UTF-16LE with null terminator
    const encoded = new Uint16Array(query.length + 1);
    for (let i = 0; i < query.length; i++) {
      encoded[i] = query.charCodeAt(i);
    }
    encoded[query.length] = 0;

    using buf = this.#memory.alloc(encoded.byteLength);
    new Uint16Array(this.#memory.heapU8.buffer, buf.ptr, encoded.length).set(encoded);

    const handle = this.#module._FPDFText_FindStart(textPageHandle as never, buf.ptr as never, flags, 0);
    if (handle === 0) {
      return [];
    }

    const results: { index: number; count: number }[] = [];
    while (this.#module._FPDFText_FindNext(handle as never) !== 0) {
      const index = this.#module._FPDFText_GetSchResultIndex(handle as never);
      const count = this.#module._FPDFText_GetSchCount(handle as never);
      results.push({ index, count });
    }

    this.#module._FPDFText_FindClose(handle as never);
    return results;
  }

  countTextRects(textPageHandle: number, startIndex: number, count: number): number {
    return this.#module._FPDFText_CountRects(textPageHandle as never, startIndex, count);
  }

  getTextRect(
    textPageHandle: number,
    rectIndex: number,
  ): { left: number; top: number; right: number; bottom: number } | null {
    using buf = this.#memory.alloc(32); // 4 x f64
    const ok = this.#module._FPDFText_GetRect(
      textPageHandle as never,
      rectIndex,
      buf.ptr as never,
      ptrOffset(buf.ptr, 8) as never,
      ptrOffset(buf.ptr, 16) as never,
      ptrOffset(buf.ptr, 24) as never,
    );
    if (ok === 0) {
      return null;
    }
    const view = new Float64Array(this.#memory.heapU8.buffer, buf.ptr, 4);
    return { left: view[0] ?? 0, top: view[1] ?? 0, right: view[2] ?? 0, bottom: view[3] ?? 0 };
  }

  getBoundedText(textPageHandle: number, left: number, top: number, right: number, bottom: number): string {
    // First call: get required buffer size
    const size = this.#module._FPDFText_GetBoundedText(
      textPageHandle as never,
      left,
      top,
      right,
      bottom,
      NULL_PTR as never,
      0,
    );
    if (size <= 0) {
      return '';
    }

    using buf = this.#memory.alloc(size * UTF16LE_BYTES_PER_CHAR);
    const written = this.#module._FPDFText_GetBoundedText(
      textPageHandle as never,
      left,
      top,
      right,
      bottom,
      buf.ptr as never,
      size,
    );
    if (written <= 0) {
      return '';
    }

    const view = new Uint16Array(this.#memory.heapU8.buffer, buf.ptr, written);
    // Trim null terminator
    const len = written > 0 && view[written - 1] === 0 ? written - 1 : written;
    return String.fromCharCode(...view.subarray(0, len));
  }

  getPageRotation(pageHandle: number): number {
    return this.#module._FPDFPage_GetRotation(pageHandle as never);
  }

  setPageRotation(pageHandle: number, rotation: number): void {
    this.#module._FPDFPage_SetRotation(pageHandle as never, rotation);
  }

  hasPageTransparency(pageHandle: number): boolean {
    return this.#module._FPDFPage_HasTransparency(pageHandle as never) !== 0;
  }

  flattenPage(pageHandle: number, flags: number): number {
    return this.#module._FPDFPage_Flatten(pageHandle as never, flags);
  }

  generateContent(pageHandle: number): boolean {
    return this.#module._FPDFPage_GenerateContent(pageHandle as never) !== 0;
  }

  deviceToPage(
    pageHandle: number,
    startX: number,
    startY: number,
    sizeX: number,
    sizeY: number,
    rotation: number,
    deviceX: number,
    deviceY: number,
  ): { x: number; y: number } {
    using xPtr = this.#memory.alloc(8);
    using yPtr = this.#memory.alloc(8);
    this.#module._FPDF_DeviceToPage(
      pageHandle as never,
      startX,
      startY,
      sizeX,
      sizeY,
      rotation,
      deviceX,
      deviceY,
      xPtr.ptr as never,
      yPtr.ptr as never,
    );
    const xView = new Float64Array(this.#memory.heapU8.buffer, xPtr.ptr, 1);
    const yView = new Float64Array(this.#memory.heapU8.buffer, yPtr.ptr, 1);
    return { x: xView[0] ?? 0, y: yView[0] ?? 0 };
  }

  pageToDevice(
    pageHandle: number,
    startX: number,
    startY: number,
    sizeX: number,
    sizeY: number,
    rotation: number,
    pageX: number,
    pageY: number,
  ): { x: number; y: number } {
    using xPtr = this.#memory.alloc(4);
    using yPtr = this.#memory.alloc(4);
    this.#module._FPDF_PageToDevice(
      pageHandle as never,
      startX,
      startY,
      sizeX,
      sizeY,
      rotation,
      pageX,
      pageY,
      xPtr.ptr as never,
      yPtr.ptr as never,
    );
    const x = this.#memory.readInt32(xPtr.ptr);
    const y = this.#memory.readInt32(yPtr.ptr);
    return { x, y };
  }

  renderPage(
    pageHandle: number,
    width: number,
    height: number,
    rotation: number,
    flags: number,
    bgColour: number,
  ): Uint8Array {
    const stride = width * 4;
    const bufferSize = stride * height;
    using bufferAlloc = this.#memory.alloc(bufferSize);

    const bitmap = this.#module._FPDFBitmap_CreateEx(width, height, 4, bufferAlloc.ptr, stride);
    this.#module._FPDFBitmap_FillRect(bitmap, 0, 0, width, height, bgColour);
    this.#module._FPDF_RenderPageBitmap(bitmap, pageHandle as never, 0, 0, width, height, rotation, flags);
    this.#module._FPDFBitmap_Destroy(bitmap);

    // Copy BGRA data and convert to RGBA using 32-bit ops (swap R and B channels)
    const source = new Uint32Array(
      this.#module.HEAPU8.buffer,
      this.#module.HEAPU8.byteOffset + bufferAlloc.ptr,
      width * height,
    );
    const result = new Uint32Array(width * height);
    for (let i = 0; i < result.length; i++) {
      const pixel = source[i] ?? 0;
      // BGRA → RGBA: swap byte 0 (B) and byte 2 (R), keep G and A
      result[i] = (pixel & 0xff00ff00) | ((pixel & 0x00ff0000) >>> 16) | ((pixel & 0x000000ff) << 16);
    }
    return new Uint8Array(result.buffer);
  }

  getMetaText(docHandle: number, tag: string): string | null {
    using tagAlloc = this.#memory.allocString(tag);

    const requiredBytes = this.#module._FPDF_GetMetaText(docHandle as never, tagAlloc.ptr, NULL_PTR, 0);

    if (requiredBytes <= UTF16LE_NULL_BYTES) {
      return null;
    }

    using buffer = this.#memory.alloc(requiredBytes);
    this.#module._FPDF_GetMetaText(docHandle as never, tagAlloc.ptr, buffer.ptr, requiredBytes);

    const charCount = (requiredBytes - UTF16LE_NULL_BYTES) / UTF16LE_BYTES_PER_CHAR;
    const value = this.#memory.readUTF16LE(buffer.ptr, charCount);

    return value.length > 0 ? value : null;
  }

  getFileVersion(docHandle: number): number | null {
    using versionOut = this.#memory.alloc(4);
    const success = this.#module._FPDF_GetFileVersion(docHandle as never, versionOut.ptr);

    if (!success) {
      return null;
    }

    return this.#memory.readInt32(versionOut.ptr);
  }

  getDocPermissions(docHandle: number): number {
    return this.#module._FPDF_GetDocPermissions(docHandle as never);
  }

  getDocUserPermissions(docHandle: number): number {
    return this.#module._FPDF_GetDocUserPermissions(docHandle as never);
  }

  getPageMode(docHandle: number): number {
    return this.#module._FPDFDoc_GetPageMode(docHandle as never);
  }

  getSecurityHandlerRevision(docHandle: number): number {
    return this.#module._FPDF_GetSecurityHandlerRevision(docHandle as never);
  }

  isTagged(docHandle: number): boolean {
    return this.#module._FPDFCatalog_IsTagged(docHandle as never) !== 0;
  }

  getPageLabel(docHandle: number, pageIndex: number): string | null {
    const requiredBytes = this.#module._FPDF_GetPageLabel(docHandle as never, pageIndex, NULL_PTR, 0);

    if (requiredBytes <= UTF16LE_NULL_BYTES) {
      return null;
    }

    using buffer = this.#memory.alloc(requiredBytes);
    this.#module._FPDF_GetPageLabel(docHandle as never, pageIndex, buffer.ptr, requiredBytes);

    const charCount = (requiredBytes - UTF16LE_NULL_BYTES) / UTF16LE_BYTES_PER_CHAR;
    const label = this.#memory.readUTF16LE(buffer.ptr, charCount);

    return label.length > 0 ? label : null;
  }

  getPageBox(pageHandle: number, boxType: number): [number, number, number, number] | null {
    using buf = this.#memory.alloc(16);
    const leftPtr = buf.ptr;
    const bottomPtr = ptrOffset(buf.ptr, 4);
    const rightPtr = ptrOffset(buf.ptr, 8);
    const topPtr = ptrOffset(buf.ptr, 12);

    let success: number;
    switch (boxType) {
      case 0:
        success = this.#module._FPDFPage_GetMediaBox(pageHandle as never, leftPtr, bottomPtr, rightPtr, topPtr);
        break;
      case 1:
        success = this.#module._FPDFPage_GetCropBox(pageHandle as never, leftPtr, bottomPtr, rightPtr, topPtr);
        break;
      case 2:
        success = this.#module._FPDFPage_GetBleedBox(pageHandle as never, leftPtr, bottomPtr, rightPtr, topPtr);
        break;
      case 3:
        success = this.#module._FPDFPage_GetTrimBox(pageHandle as never, leftPtr, bottomPtr, rightPtr, topPtr);
        break;
      case 4:
        success = this.#module._FPDFPage_GetArtBox(pageHandle as never, leftPtr, bottomPtr, rightPtr, topPtr);
        break;
      default:
        return null;
    }

    if (!success) {
      return null;
    }

    const floats = new Float32Array(this.#memory.heapU8.buffer, buf.ptr, 4);
    return [floats[0] ?? 0, floats[1] ?? 0, floats[2] ?? 0, floats[3] ?? 0];
  }

  setPageBox(pageHandle: number, boxType: number, left: number, bottom: number, right: number, top: number): void {
    switch (boxType) {
      case 0:
        this.#module._FPDFPage_SetMediaBox(pageHandle as never, left, bottom, right, top);
        break;
      case 1:
        this.#module._FPDFPage_SetCropBox(pageHandle as never, left, bottom, right, top);
        break;
      case 2:
        this.#module._FPDFPage_SetBleedBox(pageHandle as never, left, bottom, right, top);
        break;
      case 3:
        this.#module._FPDFPage_SetTrimBox(pageHandle as never, left, bottom, right, top);
        break;
      case 4:
        this.#module._FPDFPage_SetArtBox(pageHandle as never, left, bottom, right, top);
        break;
    }
  }

  getLinks(pageHandle: number, docHandle: number): BackendLink[] {
    const result: BackendLink[] = [];

    using startPosAlloc = this.#memory.alloc(4);
    using linkPtrAlloc = this.#memory.alloc(4);
    this.#memory.writeInt32(startPosAlloc.ptr, 0);

    let index = 0;

    while (this.#module._FPDFLink_Enumerate(pageHandle as never, startPosAlloc.ptr, linkPtrAlloc.ptr)) {
      const linkHandle = this.#memory.readInt32(linkPtrAlloc.ptr);
      if (linkHandle === 0) {
        continue;
      }

      // Bounds (FS_RECTF = 4 x f32)
      let left = 0;
      let bottom = 0;
      let right = 0;
      let top = 0;
      {
        using rectAlloc = this.#memory.alloc(16);
        const hasRect = this.#module._FPDFLink_GetAnnotRect(linkHandle as never, rectAlloc.ptr);
        if (hasRect) {
          const floats = new Float32Array(this.#memory.heapU8.buffer, rectAlloc.ptr, 4);
          left = floats[0] ?? 0;
          bottom = floats[1] ?? 0;
          right = floats[2] ?? 0;
          top = floats[3] ?? 0;
        }
      }

      // Action
      const actionHandle = this.#module._FPDFLink_GetAction(linkHandle as never) as number;
      const hasAction = actionHandle !== 0;
      let actionType = 0;
      let uri: string | null = null;
      let filePath: string | null = null;

      if (hasAction) {
        actionType = this.#module._FPDFAction_GetType(actionHandle as never);

        // URI (action type 3)
        if (actionType === 3) {
          const requiredBytes = this.#module._FPDFAction_GetURIPath(
            docHandle as never,
            actionHandle as never,
            NULL_PTR,
            0,
          );
          if (requiredBytes > 0) {
            using buf = this.#memory.alloc(requiredBytes);
            this.#module._FPDFAction_GetURIPath(docHandle as never, actionHandle as never, buf.ptr, requiredBytes);
            const bytes = this.#memory.heapU8.subarray(buf.ptr, buf.ptr + requiredBytes - 1);
            uri = new TextDecoder().decode(bytes);
          }
        }

        // File path (action type 2 = RemoteGoTo, 4 = Launch)
        if (actionType === 2 || actionType === 4) {
          const requiredBytes = this.#module._FPDFAction_GetFilePath(actionHandle as never, NULL_PTR, 0);
          if (requiredBytes > 0) {
            using buf = this.#memory.alloc(requiredBytes);
            this.#module._FPDFAction_GetFilePath(actionHandle as never, buf.ptr, requiredBytes);
            const bytes = this.#memory.heapU8.subarray(buf.ptr, buf.ptr + requiredBytes - 1);
            filePath = new TextDecoder().decode(bytes);
          }
        }
      }

      // Destination — try link's direct dest first, then action's dest
      let destHandleNum = this.#module._FPDFLink_GetDest(docHandle as never, linkHandle as never) as number;
      if (destHandleNum === 0 && hasAction) {
        destHandleNum = this.#module._FPDFAction_GetDest(docHandle as never, actionHandle as never) as number;
      }

      const hasDest = destHandleNum !== 0;
      let destPageIndex = -1;
      let destFitType = 0;
      let hasX = false;
      let hasY = false;
      let hasZoom = false;
      let x = 0;
      let y = 0;
      let zoom = 0;

      if (hasDest) {
        destPageIndex = this.#module._FPDFDest_GetDestPageIndex(docHandle as never, destHandleNum as never);

        {
          using numParamsAlloc = this.#memory.alloc(4);
          using paramsAlloc = this.#memory.alloc(16);
          destFitType = this.#module._FPDFDest_GetView(destHandleNum as never, numParamsAlloc.ptr, paramsAlloc.ptr);
        }

        {
          using hasXAlloc = this.#memory.alloc(4);
          using hasYAlloc = this.#memory.alloc(4);
          using hasZoomAlloc = this.#memory.alloc(4);
          using xAlloc = this.#memory.alloc(4);
          using yAlloc = this.#memory.alloc(4);
          using zoomAlloc = this.#memory.alloc(4);

          this.#module._FPDFDest_GetLocationInPage(
            destHandleNum as never,
            hasXAlloc.ptr,
            hasYAlloc.ptr,
            hasZoomAlloc.ptr,
            xAlloc.ptr,
            yAlloc.ptr,
            zoomAlloc.ptr,
          );

          hasX = this.#memory.readInt32(hasXAlloc.ptr) !== 0;
          hasY = this.#memory.readInt32(hasYAlloc.ptr) !== 0;
          hasZoom = this.#memory.readInt32(hasZoomAlloc.ptr) !== 0;

          if (hasX) {
            const xView = new Float32Array(this.#memory.heapU8.buffer, xAlloc.ptr, 1);
            x = xView[0] ?? 0;
          }
          if (hasY) {
            const yView = new Float32Array(this.#memory.heapU8.buffer, yAlloc.ptr, 1);
            y = yView[0] ?? 0;
          }
          if (hasZoom) {
            const zoomView = new Float32Array(this.#memory.heapU8.buffer, zoomAlloc.ptr, 1);
            zoom = zoomView[0] ?? 0;
          }
        }
      }

      result.push({
        index,
        left,
        bottom,
        right,
        top,
        hasAction,
        actionType,
        uri,
        filePath,
        hasDest,
        destPageIndex,
        destFitType,
        hasX,
        hasY,
        hasZoom,
        x,
        y,
        zoom,
      });

      index++;
    }

    return result;
  }

  getAnnotations(pageHandle: number): BackendAnnotation[] {
    const count = this.#module._FPDFPage_GetAnnotCount(pageHandle as never);
    if (count <= 0) {
      return [];
    }

    const result: BackendAnnotation[] = [];

    for (let i = 0; i < count; i++) {
      const annot = this.#module._FPDFPage_GetAnnot(pageHandle as never, i);
      if ((annot as number) === 0) {
        continue;
      }

      const subtype = this.#module._FPDFAnnot_GetSubtype(annot);

      // Read bounding rect (FS_RECTF = 4 x f32 = 16 bytes)
      let left = 0;
      let top = 0;
      let right = 0;
      let bottom = 0;
      {
        using rectAlloc = this.#memory.alloc(16);
        const hasRect = this.#module._FPDFAnnot_GetRect(annot, rectAlloc.ptr);
        if (hasRect) {
          const floats = new Float32Array(this.#memory.heapU8.buffer, rectAlloc.ptr, 4);
          left = floats[0] ?? 0;
          top = floats[1] ?? 0;
          right = floats[2] ?? 0;
          bottom = floats[3] ?? 0;
        }
      }

      // Read colour (type 0 = colour)
      let hasColour = false;
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      {
        using colourAlloc = this.#memory.alloc(16); // 4 x u32
        const rPtr = colourAlloc.ptr;
        const gPtr = ptrOffset(colourAlloc.ptr, 4);
        const bPtr = ptrOffset(colourAlloc.ptr, 8);
        const aPtr = ptrOffset(colourAlloc.ptr, 12);
        const ok = this.#module._FPDFAnnot_GetColor(annot, 0, rPtr, gPtr, bPtr, aPtr);
        if (ok) {
          hasColour = true;
          const uints = new Uint32Array(this.#memory.heapU8.buffer, colourAlloc.ptr, 4);
          r = uints[0] ?? 0;
          g = uints[1] ?? 0;
          b = uints[2] ?? 0;
          a = uints[3] ?? 0;
        }
      }

      this.#module._FPDFPage_CloseAnnot(annot);

      result.push({ index: i, subtype, left, top, right, bottom, hasColour, r, g, b, a });
    }

    return result;
  }

  createAnnotation(pageHandle: number, subtype: number): number {
    const annot = this.#module._FPDFPage_CreateAnnot(pageHandle as never, subtype);
    if ((annot as number) === 0) {
      throw new Error('Failed to create annotation');
    }
    this.#module._FPDFPage_CloseAnnot(annot);
    const count = this.#module._FPDFPage_GetAnnotCount(pageHandle as never);
    return count - 1;
  }

  removeAnnotation(pageHandle: number, index: number): boolean {
    return this.#module._FPDFPage_RemoveAnnot(pageHandle as never, index) !== 0;
  }

  setAnnotationRect(
    pageHandle: number,
    index: number,
    left: number,
    top: number,
    right: number,
    bottom: number,
  ): boolean {
    const annot = this.#module._FPDFPage_GetAnnot(pageHandle as never, index);
    if ((annot as number) === 0) {
      return false;
    }
    using rectAlloc = this.#memory.alloc(16);
    const floats = new Float32Array(this.#memory.heapU8.buffer, rectAlloc.ptr, 4);
    floats[0] = left;
    floats[1] = top;
    floats[2] = right;
    floats[3] = bottom;
    const ok = this.#module._FPDFAnnot_SetRect(annot, rectAlloc.ptr);
    this.#module._FPDFPage_CloseAnnot(annot);
    return ok !== 0;
  }

  setAnnotationColour(
    pageHandle: number,
    index: number,
    colourType: number,
    r: number,
    g: number,
    b: number,
    a: number,
  ): boolean {
    const annot = this.#module._FPDFPage_GetAnnot(pageHandle as never, index);
    if ((annot as number) === 0) {
      return false;
    }
    const ok = this.#module._FPDFAnnot_SetColor(annot, colourType, r, g, b, a);
    this.#module._FPDFPage_CloseAnnot(annot);
    return ok !== 0;
  }

  getAnnotationFlags(pageHandle: number, index: number): number {
    const annot = this.#module._FPDFPage_GetAnnot(pageHandle as never, index);
    if ((annot as number) === 0) {
      return 0;
    }
    const flags = this.#module._FPDFAnnot_GetFlags(annot);
    this.#module._FPDFPage_CloseAnnot(annot);
    return flags;
  }

  setAnnotationFlags(pageHandle: number, index: number, flags: number): boolean {
    const annot = this.#module._FPDFPage_GetAnnot(pageHandle as never, index);
    if ((annot as number) === 0) {
      return false;
    }
    const ok = this.#module._FPDFAnnot_SetFlags(annot, flags);
    this.#module._FPDFPage_CloseAnnot(annot);
    return ok !== 0;
  }

  setAnnotationStringValue(pageHandle: number, index: number, key: string, value: string): boolean {
    const annot = this.#module._FPDFPage_GetAnnot(pageHandle as never, index);
    if ((annot as number) === 0) {
      return false;
    }
    using keyAlloc = this.#memory.allocString(key);
    // Encode value as UTF-16LE with null terminator
    const utf16 = new Uint16Array(value.length + 1);
    for (let i = 0; i < value.length; i++) {
      utf16[i] = value.charCodeAt(i);
    }
    utf16[value.length] = 0;
    using valueAlloc = this.#memory.alloc(utf16.byteLength);
    new Uint16Array(this.#memory.heapU8.buffer, valueAlloc.ptr, utf16.length).set(utf16);
    const ok = this.#module._FPDFAnnot_SetStringValue(annot, keyAlloc.ptr, valueAlloc.ptr);
    this.#module._FPDFPage_CloseAnnot(annot);
    return ok !== 0;
  }

  setAnnotationBorder(
    pageHandle: number,
    index: number,
    horizontalRadius: number,
    verticalRadius: number,
    borderWidth: number,
  ): boolean {
    const annot = this.#module._FPDFPage_GetAnnot(pageHandle as never, index);
    if ((annot as number) === 0) {
      return false;
    }
    const ok = this.#module._FPDFAnnot_SetBorder(annot, horizontalRadius, verticalRadius, borderWidth);
    this.#module._FPDFPage_CloseAnnot(annot);
    return ok !== 0;
  }

  setAnnotationAttachmentPoints(
    pageHandle: number,
    annotIndex: number,
    quadIndex: number,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    x3: number,
    y3: number,
    x4: number,
    y4: number,
  ): boolean {
    const annot = this.#module._FPDFPage_GetAnnot(pageHandle as never, annotIndex);
    if ((annot as number) === 0) {
      return false;
    }
    using qpAlloc = this.#memory.alloc(32); // 8 x f32
    const floats = new Float32Array(this.#memory.heapU8.buffer, qpAlloc.ptr, 8);
    floats[0] = x1;
    floats[1] = y1;
    floats[2] = x2;
    floats[3] = y2;
    floats[4] = x3;
    floats[5] = y3;
    floats[6] = x4;
    floats[7] = y4;
    const ok = this.#module._FPDFAnnot_SetAttachmentPoints(annot, quadIndex, qpAlloc.ptr);
    this.#module._FPDFPage_CloseAnnot(annot);
    return ok !== 0;
  }

  appendAnnotationAttachmentPoints(
    pageHandle: number,
    annotIndex: number,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    x3: number,
    y3: number,
    x4: number,
    y4: number,
  ): boolean {
    const annot = this.#module._FPDFPage_GetAnnot(pageHandle as never, annotIndex);
    if ((annot as number) === 0) {
      return false;
    }
    using qpAlloc = this.#memory.alloc(32); // 8 x f32
    const floats = new Float32Array(this.#memory.heapU8.buffer, qpAlloc.ptr, 8);
    floats[0] = x1;
    floats[1] = y1;
    floats[2] = x2;
    floats[3] = y2;
    floats[4] = x3;
    floats[5] = y3;
    floats[6] = x4;
    floats[7] = y4;
    const ok = this.#module._FPDFAnnot_AppendAttachmentPoints(annot, qpAlloc.ptr);
    this.#module._FPDFPage_CloseAnnot(annot);
    return ok !== 0;
  }

  setAnnotationUri(pageHandle: number, index: number, uri: string): boolean {
    const annot = this.#module._FPDFPage_GetAnnot(pageHandle as never, index);
    if ((annot as number) === 0) {
      return false;
    }
    using uriAlloc = this.#memory.allocString(uri);
    const ok = this.#module._FPDFAnnot_SetURI(annot, uriAlloc.ptr);
    this.#module._FPDFPage_CloseAnnot(annot);
    return ok !== 0;
  }

  getBookmarks(docHandle: number): BackendBookmark[] {
    return this.#collectBookmarks(docHandle, 0, 0);
  }

  #collectBookmarks(docHandle: number, parent: number, depth: number): BackendBookmark[] {
    if (depth > 100) {
      return [];
    }

    const result: BackendBookmark[] = [];
    let current = this.#module._FPDFBookmark_GetFirstChild(docHandle as never, parent as never) as number;

    while (current !== 0) {
      const title = this.#readBookmarkTitle(current);

      const dest = this.#module._FPDFBookmark_GetDest(docHandle as never, current as never) as number;
      const pageIndex = dest !== 0 ? this.#module._FPDFDest_GetDestPageIndex(docHandle as never, dest as never) : -1;

      const children = this.#collectBookmarks(docHandle, current, depth + 1);

      result.push({ title, pageIndex, children });
      current = this.#module._FPDFBookmark_GetNextSibling(docHandle as never, current as never) as number;
    }

    return result;
  }

  #readBookmarkTitle(bookmark: number): string {
    const requiredBytes = this.#module._FPDFBookmark_GetTitle(bookmark as never, NULL_PTR, 0);
    if (requiredBytes <= UTF16LE_NULL_BYTES) {
      return '';
    }

    using buffer = this.#memory.alloc(requiredBytes);
    this.#module._FPDFBookmark_GetTitle(bookmark as never, buffer.ptr, requiredBytes);

    const charCount = (requiredBytes - UTF16LE_NULL_BYTES) / UTF16LE_BYTES_PER_CHAR;
    return this.#memory.readUTF16LE(buffer.ptr, charCount);
  }

  getSignatureCount(docHandle: number): number {
    const fn_ = this.#module._FPDF_GetSignatureCount;
    if (typeof fn_ !== 'function') {
      return 0;
    }
    return fn_(docHandle as never);
  }

  getSignature(
    docHandle: number,
    index: number,
  ): {
    contents?: Uint8Array;
    byteRange?: number[];
    subFilter?: string;
    reason?: string;
    time?: string;
    docMDPPermission: number;
  } | null {
    const getObj = this.#module._FPDF_GetSignatureObject;
    if (typeof getObj !== 'function') {
      return null;
    }

    const handle = getObj(docHandle as never, index);
    if ((handle as number) === 0) {
      return null;
    }

    const result: {
      contents?: Uint8Array;
      byteRange?: number[];
      subFilter?: string;
      reason?: string;
      time?: string;
      docMDPPermission: number;
    } = { docMDPPermission: 0 };

    // Contents
    const getContents = this.#module._FPDFSignatureObj_GetContents;
    if (typeof getContents === 'function') {
      const size = getContents(handle, NULL_PTR, 0);
      if (size > 0) {
        using buf = this.#memory.alloc(size);
        const written = getContents(handle, buf.ptr, size);
        if (written > 0) {
          result.contents = this.#memory.heapU8.slice(buf.ptr, buf.ptr + written);
        }
      }
    }

    // Byte range
    const getByteRange = this.#module._FPDFSignatureObj_GetByteRange;
    if (typeof getByteRange === 'function') {
      const count = getByteRange(handle, NULL_PTR, 0);
      if (count > 0) {
        using buf = this.#memory.alloc(count * 4);
        const written = getByteRange(handle, buf.ptr, count);
        if (written > 0) {
          result.byteRange = Array.from(new Int32Array(this.#memory.heapU8.buffer, buf.ptr, written));
        }
      }
    }

    // Sub-filter (ASCII)
    const getSubFilter = this.#module._FPDFSignatureObj_GetSubFilter;
    if (typeof getSubFilter === 'function') {
      const size = getSubFilter(handle, NULL_PTR, 0);
      if (size > 1) {
        using buf = this.#memory.alloc(size);
        const written = getSubFilter(handle, buf.ptr, size);
        if (written > 1) {
          const bytes = this.#memory.heapU8.subarray(buf.ptr, buf.ptr + written - 1);
          result.subFilter = new TextDecoder('ascii').decode(bytes);
        }
      }
    }

    // Reason (UTF-16LE)
    const getReason = this.#module._FPDFSignatureObj_GetReason;
    if (typeof getReason === 'function') {
      const size = getReason(handle, NULL_PTR, 0);
      if (size > UTF16LE_NULL_BYTES) {
        using buf = this.#memory.alloc(size);
        const written = getReason(handle, buf.ptr, size);
        if (written > UTF16LE_NULL_BYTES) {
          const charCount = (written - UTF16LE_NULL_BYTES) / UTF16LE_BYTES_PER_CHAR;
          result.reason = this.#memory.readUTF16LE(buf.ptr, charCount);
        }
      }
    }

    // Time (ASCII)
    const getTime = this.#module._FPDFSignatureObj_GetTime;
    if (typeof getTime === 'function') {
      const size = getTime(handle, NULL_PTR, 0);
      if (size > 1) {
        using buf = this.#memory.alloc(size);
        const written = getTime(handle, buf.ptr, size);
        if (written > 1) {
          const bytes = this.#memory.heapU8.subarray(buf.ptr, buf.ptr + written - 1);
          result.time = new TextDecoder('ascii').decode(bytes);
        }
      }
    }

    // DocMDP permission
    const getDocMDP = this.#module._FPDFSignatureObj_GetDocMDPPermission;
    if (typeof getDocMDP === 'function') {
      const perm = getDocMDP(handle);
      result.docMDPPermission = perm >= 0 && perm <= 3 ? perm : 0;
    }

    return result;
  }

  saveDocument(docHandle: number, flags: number, version: number | null): Uint8Array {
    const chunks: Uint8Array[] = [];
    let totalSize = 0;

    const writeBlock = (_pThis: number, pData: number, size: number): number => {
      if (size > 0 && pData > 0) {
        chunks.push(this.#module.HEAPU8.slice(pData, pData + size));
        totalSize += size;
      }
      return 1;
    };

    const funcPtr = this.#module.addFunction(writeBlock, 'iiii');
    try {
      // FPDF_FILEWRITE struct: version (i32) + WriteBlock callback (i32)
      using fileWrite = this.#memory.alloc(8);
      this.#memory.writeInt32(fileWrite.ptr, 1); // version = 1
      this.#memory.writeInt32(ptrOffset(fileWrite.ptr, 4), funcPtr);

      const ok =
        version !== null
          ? this.#module._FPDF_SaveWithVersion(docHandle as never, fileWrite.ptr, flags, version)
          : this.#module._FPDF_SaveAsCopy(docHandle as never, fileWrite.ptr, flags);

      if (!ok) {
        throw new Error('Failed to save document');
      }
    } finally {
      this.#module.removeFunction(funcPtr);
    }

    const result = new Uint8Array(totalSize);
    let offset = 0;
    for (const chunk of chunks) {
      result.set(chunk, offset);
      offset += chunk.length;
    }
    return result;
  }

  getAttachmentCount(docHandle: number): number {
    return this.#module._FPDFDoc_GetAttachmentCount(docHandle as never);
  }

  getAttachment(docHandle: number, index: number): { name: string; data: Uint8Array } | null {
    const attachment = this.#module._FPDFDoc_GetAttachment(docHandle as never, index);
    if (attachment === 0) {
      return null;
    }

    // Get name (UTF-16LE, two-call pattern)
    const nameSize = this.#module._FPDFAttachment_GetName(attachment, NULL_PTR, 0);
    let name = '';
    if (nameSize > UTF16LE_NULL_BYTES) {
      using nameAlloc = this.#memory.alloc(nameSize);
      this.#module._FPDFAttachment_GetName(attachment, nameAlloc.ptr, nameSize);
      const charCount = (nameSize - UTF16LE_NULL_BYTES) / UTF16LE_BYTES_PER_CHAR;
      name = this.#memory.readUTF16LE(nameAlloc.ptr, charCount);
    }

    // Get file data (two-call pattern)
    using outLenAlloc = this.#memory.alloc(4);
    const ok = this.#module._FPDFAttachment_GetFile(attachment, NULL_PTR, 0, outLenAlloc.ptr);
    let data = new Uint8Array(0);
    if (ok) {
      const fileSize = this.#memory.readUint32(outLenAlloc.ptr);
      if (fileSize > 0) {
        using dataAlloc = this.#memory.alloc(fileSize);
        this.#module._FPDFAttachment_GetFile(attachment, dataAlloc.ptr, fileSize, outLenAlloc.ptr);
        const actualSize = this.#memory.readUint32(outLenAlloc.ptr);
        data = this.#module.HEAPU8.slice(dataAlloc.ptr, dataAlloc.ptr + actualSize);
      }
    }

    return { name, data };
  }

  importPages(destHandle: number, srcHandle: number, pageRange: string | null, insertIndex: number): void {
    const fn_ = this.#module._FPDF_ImportPages;
    if (typeof fn_ !== 'function') {
      throw new Error('FPDF_ImportPages is not available');
    }

    let result: number;
    if (pageRange !== null) {
      using rangeAlloc = this.#memory.allocString(pageRange);
      result = fn_(destHandle as never, srcHandle as never, rangeAlloc.ptr, insertIndex);
    } else {
      result = fn_(destHandle as never, srcHandle as never, NULL_PTR, insertIndex);
    }

    if (result === 0) {
      throw new Error('Failed to import pages');
    }
  }

  importPagesByIndex(destHandle: number, srcHandle: number, pageIndices: number[], insertIndex: number): void {
    const fn_ = this.#module._FPDF_ImportPagesByIndex;
    if (typeof fn_ !== 'function') {
      throw new Error('FPDF_ImportPagesByIndex is not available');
    }

    if (pageIndices.length === 0) {
      return;
    }

    using indicesAlloc = this.#memory.alloc(pageIndices.length * 4);
    const intView = new Int32Array(this.#memory.heapU8.buffer, indicesAlloc.ptr, pageIndices.length);
    for (let i = 0; i < pageIndices.length; i++) {
      intView[i] = pageIndices[i] ?? 0;
    }

    const result = fn_(destHandle as never, srcHandle as never, indicesAlloc.ptr, pageIndices.length, insertIndex);

    if (result === 0) {
      throw new Error('Failed to import pages by index');
    }
  }

  importNPagesToOne(
    srcHandle: number,
    outputWidth: number,
    outputHeight: number,
    pagesPerRow: number,
    pagesPerColumn: number,
  ): number {
    const fn_ = this.#module._FPDF_ImportNPagesToOne;
    if (typeof fn_ !== 'function') {
      return 0;
    }

    return fn_(srcHandle as never, outputWidth, outputHeight, pagesPerRow, pagesPerColumn) as number;
  }

  copyViewerPreferences(destHandle: number, srcHandle: number): boolean {
    const fn_ = this.#module._FPDF_CopyViewerPreferences;
    if (typeof fn_ !== 'function') {
      return false;
    }

    return fn_(destHandle as never, srcHandle as never) !== 0;
  }
}
