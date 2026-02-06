/**
 * Text Page implementation for PDFiumPage.
 *
 * @module document/page_impl/text
 * @internal
 */

import { type CharBox, type Rect, TextRenderMode, TextSearchFlags } from '../../core/types.js';
import { NULL_PAGE_OBJECT, NULL_SEARCH, NULL_TEXT_PAGE } from '../../internal/constants.js';
import { fromNative, textRenderModeMap } from '../../internal/enum-maps.js';
import type { PageHandle, TextPageHandle } from '../../internal/handles.js';
import { NativeHandle } from '../../wasm/allocation.js';
import type { PDFiumWASM } from '../../wasm/bindings/index.js';
import { encodeUTF16LE, NULL_PTR, type WASMMemoryManager } from '../../wasm/memory.js';

// ─────────────────────────────────────────────────────────────────────────
// Text Page Lifecycle
// ─────────────────────────────────────────────────────────────────────────

export function loadTextPage(module: PDFiumWASM, pageHandle: PageHandle): TextPageHandle {
  const handle = module._FPDFText_LoadPage(pageHandle);
  return handle === NULL_TEXT_PAGE ? NULL_TEXT_PAGE : handle;
}

export function closeTextPage(module: PDFiumWASM, textPageHandle: TextPageHandle): void {
  module._FPDFText_ClosePage(textPageHandle);
}

// ─────────────────────────────────────────────────────────────────────────
// Text Extraction
// ─────────────────────────────────────────────────────────────────────────

export function countChars(module: PDFiumWASM, textPageHandle: TextPageHandle): number {
  return module._FPDFText_CountChars(textPageHandle);
}

export function getUnicode(module: PDFiumWASM, textPageHandle: TextPageHandle, index: number): number {
  return module._FPDFText_GetUnicode(textPageHandle, index);
}

export function getFontSize(module: PDFiumWASM, textPageHandle: TextPageHandle, index: number): number {
  return module._FPDFText_GetFontSize(textPageHandle, index);
}

export function getFontWeight(module: PDFiumWASM, textPageHandle: TextPageHandle, index: number): number {
  return module._FPDFText_GetFontWeight(textPageHandle, index);
}

export function getTextRenderMode(module: PDFiumWASM, textPageHandle: TextPageHandle, index: number): TextRenderMode {
  // Use FPDFText_GetTextObject to get the page object for the character
  const pageObj = module._FPDFText_GetTextObject(textPageHandle, index);
  if (pageObj === NULL_PAGE_OBJECT) {
    return TextRenderMode.Fill;
  }

  const mode = module._FPDFTextObj_GetTextRenderMode(pageObj);
  return fromNative(textRenderModeMap.fromNative, mode, TextRenderMode.Fill);
}

export function getFillColor(
  module: PDFiumWASM,
  memory: WASMMemoryManager,
  textPageHandle: TextPageHandle,
  index: number,
): { r: number; g: number; b: number; a: number } | undefined {
  using rPtr = memory.alloc(4);
  using gPtr = memory.alloc(4);
  using bPtr = memory.alloc(4);
  using aPtr = memory.alloc(4);

  if (!module._FPDFText_GetFillColor(textPageHandle, index, rPtr.ptr, gPtr.ptr, bPtr.ptr, aPtr.ptr)) {
    return undefined;
  }

  return {
    r: memory.readInt32(rPtr.ptr) & 0xff,
    g: memory.readInt32(gPtr.ptr) & 0xff,
    b: memory.readInt32(bPtr.ptr) & 0xff,
    a: memory.readInt32(aPtr.ptr) & 0xff,
  };
}

export function getStrokeColor(
  module: PDFiumWASM,
  memory: WASMMemoryManager,
  textPageHandle: TextPageHandle,
  index: number,
): { r: number; g: number; b: number; a: number } | undefined {
  using rPtr = memory.alloc(4);
  using gPtr = memory.alloc(4);
  using bPtr = memory.alloc(4);
  using aPtr = memory.alloc(4);

  if (!module._FPDFText_GetStrokeColor(textPageHandle, index, rPtr.ptr, gPtr.ptr, bPtr.ptr, aPtr.ptr)) {
    return undefined;
  }

  return {
    r: memory.readInt32(rPtr.ptr) & 0xff,
    g: memory.readInt32(gPtr.ptr) & 0xff,
    b: memory.readInt32(bPtr.ptr) & 0xff,
    a: memory.readInt32(aPtr.ptr) & 0xff,
  };
}

export function getCharAngle(module: PDFiumWASM, textPageHandle: TextPageHandle, index: number): number {
  return module._FPDFText_GetCharAngle(textPageHandle, index);
}

export function getCharBox(
  module: PDFiumWASM,
  memory: WASMMemoryManager,
  textPageHandle: TextPageHandle,
  index: number,
): CharBox | undefined {
  using leftPtr = memory.alloc(8);
  using rightPtr = memory.alloc(8);
  using bottomPtr = memory.alloc(8);
  using topPtr = memory.alloc(8);

  if (!module._FPDFText_GetCharBox(textPageHandle, index, leftPtr.ptr, rightPtr.ptr, bottomPtr.ptr, topPtr.ptr)) {
    return undefined;
  }

  return {
    left: memory.readFloat64(leftPtr.ptr),
    right: memory.readFloat64(rightPtr.ptr),
    bottom: memory.readFloat64(bottomPtr.ptr),
    top: memory.readFloat64(topPtr.ptr),
  };
}

export function getCharOrigin(
  module: PDFiumWASM,
  memory: WASMMemoryManager,
  textPageHandle: TextPageHandle,
  index: number,
): { x: number; y: number } {
  using xPtr = memory.alloc(8);
  using yPtr = memory.alloc(8);
  module._FPDFText_GetCharOrigin(textPageHandle, index, xPtr.ptr, yPtr.ptr);
  return {
    x: memory.readFloat64(xPtr.ptr),
    y: memory.readFloat64(yPtr.ptr),
  };
}

export function getCharIndexAtPoint(
  module: PDFiumWASM,
  textPageHandle: TextPageHandle,
  x: number,
  y: number,
  xTolerance: number,
  yTolerance: number,
): number {
  return module._FPDFText_GetCharIndexAtPos(textPageHandle, x, y, xTolerance, yTolerance);
}

export function getText(
  module: PDFiumWASM,
  memory: WASMMemoryManager,
  textPageHandle: TextPageHandle,
  start: number,
  count: number,
): string {
  if (count <= 0) return '';

  // Allocate buffer for UTF-16LE text (2 bytes per char + null terminator)
  const bufferSize = (count + 1) * 2;
  using bufferAlloc = memory.alloc(bufferSize);

  const extractedCount = module._FPDFText_GetText(textPageHandle, start, count, bufferAlloc.ptr);
  if (extractedCount <= 0) {
    return '';
  }

  // Read UTF-16LE text (-1 to exclude null terminator)
  return memory.readUTF16LE(bufferAlloc.ptr, extractedCount - 1);
}

export function getTextBounded(
  module: PDFiumWASM,
  memory: WASMMemoryManager,
  textPageHandle: TextPageHandle,
  left: number,
  top: number,
  right: number,
  bottom: number,
): string {
  const count = module._FPDFText_GetBoundedText(textPageHandle, left, top, right, bottom, NULL_PTR, 0);
  if (count <= 1) {
    // 1 for null terminator
    return '';
  }

  using bufferAlloc = memory.alloc(count * 2);
  module._FPDFText_GetBoundedText(textPageHandle, left, top, right, bottom, bufferAlloc.ptr, count);

  return memory.readUTF16LE(bufferAlloc.ptr, count - 1);
}

// ─────────────────────────────────────────────────────────────────────────
// Text Search
// ─────────────────────────────────────────────────────────────────────────

export interface TextSearchMatch {
  index: number;
  length: number;
}

export function search(
  module: PDFiumWASM,
  memory: WASMMemoryManager,
  textPageHandle: TextPageHandle,
  term: string,
  flags: TextSearchFlags = TextSearchFlags.None,
  startIndex: number = 0,
): { results: TextSearchMatch[]; nextIndex: number } {
  const results: TextSearchMatch[] = [];

  // PDFium expects UTF-16LE for search query
  const termBytes = encodeUTF16LE(term);
  using termAlloc = memory.allocFrom(termBytes);

  const searchHandle = module._FPDFText_FindStart(textPageHandle, termAlloc.ptr, flags, startIndex);

  if (searchHandle === NULL_SEARCH) {
    return { results, nextIndex: startIndex };
  }

  using _search = new NativeHandle(searchHandle, (h) => module._FPDFText_FindClose(h));

  while (module._FPDFText_FindNext(searchHandle)) {
    const matchIndex = module._FPDFText_GetSchResultIndex(searchHandle);
    const matchLength = module._FPDFText_GetSchCount(searchHandle);
    results.push({ index: matchIndex, length: matchLength });
  }

  return { results, nextIndex: -1 };
}

// ─────────────────────────────────────────────────────────────────────────
// Text Rects (Layout)
// ─────────────────────────────────────────────────────────────────────────

export function countRects(
  module: PDFiumWASM,
  textPageHandle: TextPageHandle,
  startIndex: number,
  count: number,
): number {
  return module._FPDFText_CountRects(textPageHandle, startIndex, count);
}

export function getRect(
  module: PDFiumWASM,
  memory: WASMMemoryManager,
  textPageHandle: TextPageHandle,
  index: number,
): Rect | undefined {
  using leftPtr = memory.alloc(8);
  using topPtr = memory.alloc(8);
  using rightPtr = memory.alloc(8);
  using bottomPtr = memory.alloc(8);

  if (!module._FPDFText_GetRect(textPageHandle, index, leftPtr.ptr, topPtr.ptr, rightPtr.ptr, bottomPtr.ptr)) {
    return undefined;
  }

  return {
    left: memory.readFloat64(leftPtr.ptr),
    top: memory.readFloat64(topPtr.ptr),
    right: memory.readFloat64(rightPtr.ptr),
    bottom: memory.readFloat64(bottomPtr.ptr),
  };
}

// ─────────────────────────────────────────────────────────────────────────
// Font Info
// ─────────────────────────────────────────────────────────────────────────

export function getFontName(
  module: PDFiumWASM,
  memory: WASMMemoryManager,
  textPageHandle: TextPageHandle,
  index: number,
): string | undefined {
  // FPDFText_GetFontInfo allocates buffer size
  const numBytes = module._FPDFText_GetFontInfo(textPageHandle, index, NULL_PTR, 0, NULL_PTR);
  if (numBytes <= 0) return undefined;

  using buffer = memory.alloc(numBytes);
  // We assume the flags output is optional or we can ignore it
  using flagsPtr = memory.alloc(4);

  const resultBytes = module._FPDFText_GetFontInfo(textPageHandle, index, buffer.ptr, numBytes, flagsPtr.ptr);
  if (resultBytes <= 0) return undefined;

  // Font name is UTF-8 (usually)
  return memory.readUtf8String(buffer.ptr, resultBytes - 1);
}
