/**
 * Text extraction WASM bindings.
 *
 * @module wasm/bindings/text
 */

import type { PageHandle, SearchHandle, TextPageHandle, WASMPointer } from '../../internal/handles.js';

/**
 * Text extraction WASM bindings.
 */
export interface TextBindings {
  // Text page operations
  _FPDFText_LoadPage: (page: PageHandle) => TextPageHandle;
  _FPDFText_ClosePage: (textPage: TextPageHandle) => void;
  _FPDFText_CountChars: (textPage: TextPageHandle) => number;
  _FPDFText_GetText: (textPage: TextPageHandle, startIndex: number, count: number, buffer: WASMPointer) => number;

  // Extended text operations
  _FPDFText_GetUnicode: (textPage: TextPageHandle, index: number) => number;
  _FPDFText_IsGenerated: (textPage: TextPageHandle, index: number) => number;
  _FPDFText_IsHyphen: (textPage: TextPageHandle, index: number) => number;
  _FPDFText_HasUnicodeMapError: (textPage: TextPageHandle, index: number) => number;
  _FPDFText_GetFontSize: (textPage: TextPageHandle, index: number) => number;
  _FPDFText_GetFontInfo: (
    textPage: TextPageHandle,
    index: number,
    buffer: WASMPointer,
    bufferLen: number,
    flags: WASMPointer,
  ) => number;
  _FPDFText_GetFontWeight: (textPage: TextPageHandle, index: number) => number;
  _FPDFText_GetTextRenderMode: (textPage: TextPageHandle, index: number) => number;
  _FPDFText_GetFillColor: (
    textPage: TextPageHandle,
    index: number,
    r: WASMPointer,
    g: WASMPointer,
    b: WASMPointer,
    a: WASMPointer,
  ) => number;
  _FPDFText_GetStrokeColor: (
    textPage: TextPageHandle,
    index: number,
    r: WASMPointer,
    g: WASMPointer,
    b: WASMPointer,
    a: WASMPointer,
  ) => number;
  _FPDFText_GetCharAngle: (textPage: TextPageHandle, index: number) => number;
  _FPDFText_GetCharOrigin: (textPage: TextPageHandle, index: number, x: WASMPointer, y: WASMPointer) => number;
  _FPDFText_GetLooseCharBox: (textPage: TextPageHandle, index: number, rect: WASMPointer) => number;
  _FPDFText_GetMatrix: (textPage: TextPageHandle, index: number, matrix: WASMPointer) => number;

  // Text search operations
  _FPDFText_FindStart: (
    textPage: TextPageHandle,
    findWhat: WASMPointer,
    flags: number,
    startIndex: number,
  ) => SearchHandle;
  _FPDFText_FindNext: (handle: SearchHandle) => number;
  _FPDFText_FindPrev: (handle: SearchHandle) => number;
  _FPDFText_FindClose: (handle: SearchHandle) => void;
  _FPDFText_GetSchResultIndex: (handle: SearchHandle) => number;
  _FPDFText_GetSchCount: (handle: SearchHandle) => number;

  // Text position operations
  _FPDFText_CountRects: (textPage: TextPageHandle, startIndex: number, count: number) => number;
  _FPDFText_GetRect: (
    textPage: TextPageHandle,
    rectIndex: number,
    left: WASMPointer,
    top: WASMPointer,
    right: WASMPointer,
    bottom: WASMPointer,
  ) => number;

  // Character position operations
  _FPDFText_GetCharBox: (
    textPage: TextPageHandle,
    charIndex: number,
    left: WASMPointer,
    right: WASMPointer,
    bottom: WASMPointer,
    top: WASMPointer,
  ) => number;
  _FPDFText_GetCharIndexAtPos: (
    textPage: TextPageHandle,
    x: number,
    y: number,
    xTolerance: number,
    yTolerance: number,
  ) => number;
  _FPDFText_GetBoundedText: (
    textPage: TextPageHandle,
    left: number,
    top: number,
    right: number,
    bottom: number,
    buffer: WASMPointer,
    bufferLen: number,
  ) => number;
}
