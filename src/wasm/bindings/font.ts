/**
 * Font introspection WASM bindings.
 *
 * @module wasm/bindings/font
 */

import type { FontHandle, PathSegmentHandle, WASMPointer } from '../../internal/handles.js';

/**
 * Font introspection WASM bindings.
 */
export interface FontBindings {
  /**
   * Gets the family name of a font.
   * @param font - Font handle
   * @param buffer - Buffer to receive the family name (UTF-8)
   * @param length - Buffer length
   * @returns Required buffer length including null terminator
   */
  _FPDFFont_GetFamilyName: (font: FontHandle, buffer: WASMPointer, length: number) => number;

  /**
   * Gets the full name of a font.
   * @param font - Font handle
   * @param buffer - Buffer to receive the font name (UTF-8)
   * @param length - Buffer length
   * @returns Required buffer length including null terminator
   */
  _FPDFFont_GetFontName: (font: FontHandle, buffer: WASMPointer, length: number) => number;

  /**
   * Gets the raw font data.
   * @param font - Font handle
   * @param buffer - Buffer to receive the font data
   * @param buflen - Buffer length
   * @param outBuflen - Pointer to receive actual data length
   * @returns Non-zero on success
   */
  _FPDFFont_GetFontData: (font: FontHandle, buffer: WASMPointer, buflen: number, outBuflen: WASMPointer) => number;

  /**
   * Gets the font descriptor flags.
   * @param font - Font handle
   * @returns Font flags or -1 on error
   */
  _FPDFFont_GetFlags: (font: FontHandle) => number;

  /**
   * Gets the font weight.
   * @param font - Font handle
   * @returns Font weight (100-900) or -1 on error
   */
  _FPDFFont_GetWeight: (font: FontHandle) => number;

  /**
   * Gets the italic angle of the font.
   * @param font - Font handle
   * @returns Italic angle in degrees or 0 if not available
   */
  _FPDFFont_GetItalicAngle: (font: FontHandle) => number;

  /**
   * Gets the ascent of a font at a given size.
   * @param font - Font handle
   * @param fontSize - Font size in points
   * @param ascent - Pointer to receive ascent value
   * @returns Non-zero on success
   */
  _FPDFFont_GetAscent: (font: FontHandle, fontSize: number, ascent: WASMPointer) => number;

  /**
   * Gets the descent of a font at a given size.
   * @param font - Font handle
   * @param fontSize - Font size in points
   * @param descent - Pointer to receive descent value
   * @returns Non-zero on success
   */
  _FPDFFont_GetDescent: (font: FontHandle, fontSize: number, descent: WASMPointer) => number;

  /**
   * Gets the width of a glyph.
   * @param font - Font handle
   * @param glyph - Glyph index
   * @param fontSize - Font size in points
   * @param width - Pointer to receive width value
   * @returns Non-zero on success
   */
  _FPDFFont_GetGlyphWidth: (font: FontHandle, glyph: number, fontSize: number, width: WASMPointer) => number;

  /**
   * Gets the path for a glyph.
   * @param font - Font handle
   * @param glyph - Glyph index
   * @param fontSize - Font size in points
   * @returns Path segment handle or 0 on error
   */
  _FPDFFont_GetGlyphPath: (font: FontHandle, glyph: number, fontSize: number) => PathSegmentHandle;

  /**
   * Checks if a font is embedded in the document.
   * @param font - Font handle
   * @returns 1 if embedded, 0 if not, -1 on error
   */
  _FPDFFont_GetIsEmbedded: (font: FontHandle) => number;
}
