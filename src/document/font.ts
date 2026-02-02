/**
 * PDF font introspection.
 *
 * Provides access to font metadata, metrics, and glyph information from
 * a PDF text object. The font retains the parent page's native resources
 * for as long as it is alive — dispose the font when you are done to
 * allow the page to release its native memory.
 *
 * @module document/font
 */

import { Disposable } from '../core/disposable.js';
import { PDFiumErrorCode } from '../core/errors.js';
import { FontFlags, type FontInfo, type FontMetrics } from '../core/types.js';
import type { FontHandle } from '../internal/handles.js';
import { readUtf8String } from '../internal/wasm-string.js';
import type { PDFiumWASM } from '../wasm/bindings/index.js';
import { NULL_PTR, type WASMMemoryManager } from '../wasm/memory.js';

/**
 * Represents a font from a PDF text object.
 *
 * The font holds a borrow on the parent page's native resources,
 * keeping them alive even after the page is disposed. Dispose the font
 * (or use the `using` keyword) to release the borrow and allow the page
 * to free its native memory.
 *
 * @example
 * ```typescript
 * const objects = page.getObjects();
 * for (const obj of objects) {
 *   if (obj.type === PageObjectType.Text) {
 *     using font = page.getTextObjectFont(obj.handle);
 *     if (font) {
 *       console.log('Font:', font.familyName, font.weight);
 *       const metrics = font.getMetrics(12);
 *       console.log('Ascent:', metrics.ascent);
 *     }
 *   }
 * }
 * ```
 */
export class PDFiumFont extends Disposable {
  readonly #module: PDFiumWASM;
  readonly #memory: WASMMemoryManager;
  readonly #handle: FontHandle;
  readonly #release: () => void;

  /**
   * Creates a new PDFiumFont.
   *
   * @param module - The PDFium WASM module
   * @param memory - The memory manager
   * @param handle - The borrowed font handle
   * @param retain - Callback to retain the parent page's native resources
   * @param release - Callback to release the parent page's native resources
   * @internal
   */
  constructor(
    module: PDFiumWASM,
    memory: WASMMemoryManager,
    handle: FontHandle,
    retain: () => void,
    release: () => void,
  ) {
    super('PDFiumFont', PDFiumErrorCode.RESOURCE_DISPOSED);
    this.#module = module;
    this.#memory = memory;
    this.#handle = handle;
    this.#release = release;

    retain();
    this.setFinalizerCleanup(release);
  }

  /**
   * Gets the family name of the font (e.g., 'Helvetica', 'Times New Roman').
   */
  get familyName(): string {
    this.ensureNotDisposed();
    return readUtf8String(this.#memory, (buf, size) => this.#module._FPDFFont_GetFamilyName(this.#handle, buf, size));
  }

  /**
   * Gets the full font name (e.g., 'Helvetica-Bold', 'Times-Roman').
   *
   * Returns an empty string if the font name is not available or the
   * underlying WASM function is not supported.
   */
  get fontName(): string {
    this.ensureNotDisposed();

    const fn = this.#module._FPDFFont_GetFontName;
    if (typeof fn !== 'function') {
      return '';
    }

    return readUtf8String(this.#memory, (buf, size) => fn(this.#handle, buf, size));
  }

  /**
   * Gets the font descriptor flags.
   *
   * @see FontFlags for the meaning of individual flags
   */
  get flags(): FontFlags {
    this.ensureNotDisposed();
    const result = this.#module._FPDFFont_GetFlags(this.#handle);
    return result === -1 ? (0 as FontFlags) : (result as FontFlags);
  }

  /**
   * Gets the font weight (100-900).
   *
   * Common values:
   * - 400: Normal
   * - 700: Bold
   *
   * Returns 0 if the weight is not available.
   */
  get weight(): number {
    this.ensureNotDisposed();
    const result = this.#module._FPDFFont_GetWeight(this.#handle);
    return result === -1 ? 0 : result;
  }

  /**
   * Gets the italic angle in degrees.
   *
   * Returns a negative value for italic or oblique fonts,
   * 0 for upright fonts.
   */
  get italicAngle(): number {
    this.ensureNotDisposed();
    return this.#module._FPDFFont_GetItalicAngle(this.#handle);
  }

  /**
   * Checks if the font is embedded in the document.
   *
   * Embedded fonts include their glyph data in the PDF, ensuring
   * consistent rendering across different systems.
   */
  get isEmbedded(): boolean {
    this.ensureNotDisposed();
    const result = this.#module._FPDFFont_GetIsEmbedded(this.#handle);
    return result === 1;
  }

  /**
   * Gets all font information in a single object.
   *
   * More efficient than reading individual properties as it only
   * validates disposal once.
   */
  getInfo(): FontInfo {
    this.ensureNotDisposed();

    const fn = this.#module._FPDFFont_GetFontName;
    const rawFlags = this.#module._FPDFFont_GetFlags(this.#handle);
    const rawWeight = this.#module._FPDFFont_GetWeight(this.#handle);

    return {
      familyName: readUtf8String(this.#memory, (buf, size) =>
        this.#module._FPDFFont_GetFamilyName(this.#handle, buf, size),
      ),
      fontName:
        typeof fn === 'function' ? readUtf8String(this.#memory, (buf, size) => fn(this.#handle, buf, size)) : '',
      flags: rawFlags === -1 ? (0 as FontFlags) : (rawFlags as FontFlags),
      weight: rawWeight === -1 ? 0 : rawWeight,
      italicAngle: this.#module._FPDFFont_GetItalicAngle(this.#handle),
      isEmbedded: this.#module._FPDFFont_GetIsEmbedded(this.#handle) === 1,
    };
  }

  /**
   * Gets font metrics (ascent and descent) at a specific size.
   *
   * @param fontSize - The font size in points
   * @returns Font metrics at the given size
   */
  getMetrics(fontSize: number): FontMetrics {
    this.ensureNotDisposed();

    using ascentPtr = this.#memory.alloc(4);
    using descentPtr = this.#memory.alloc(4);

    let ascent = 0;
    let descent = 0;

    if (this.#module._FPDFFont_GetAscent(this.#handle, fontSize, ascentPtr.ptr)) {
      ascent = this.#memory.readFloat32(ascentPtr.ptr);
    }

    if (this.#module._FPDFFont_GetDescent(this.#handle, fontSize, descentPtr.ptr)) {
      descent = this.#memory.readFloat32(descentPtr.ptr);
    }

    return { ascent, descent };
  }

  /**
   * Gets the width of a specific glyph.
   *
   * @param glyphIndex - The glyph index (not character code)
   * @param fontSize - The font size in points
   * @returns The glyph width in points, or 0 if not available
   */
  getGlyphWidth(glyphIndex: number, fontSize: number): number {
    this.ensureNotDisposed();

    using widthPtr = this.#memory.alloc(4);

    if (this.#module._FPDFFont_GetGlyphWidth(this.#handle, glyphIndex, fontSize, widthPtr.ptr)) {
      return this.#memory.readFloat32(widthPtr.ptr);
    }

    return 0;
  }

  /**
   * Gets the raw font data if the font is embedded.
   *
   * @returns The font data as a Uint8Array, or undefined if not available
   */
  getFontData(): Uint8Array | undefined {
    this.ensureNotDisposed();

    // First call to get the required buffer size
    using sizePtr = this.#memory.alloc(4);
    const result = this.#module._FPDFFont_GetFontData(this.#handle, NULL_PTR, 0, sizePtr.ptr);
    if (!result) {
      return undefined;
    }

    const dataSize = this.#memory.readUint32(sizePtr.ptr);
    if (dataSize === 0) {
      return undefined;
    }

    // Second call to get the actual data
    using buffer = this.#memory.alloc(dataSize);
    const success = this.#module._FPDFFont_GetFontData(this.#handle, buffer.ptr, dataSize, sizePtr.ptr);
    if (!success) {
      return undefined;
    }

    // Copy data out of WASM memory
    const data = new Uint8Array(dataSize);
    data.set(this.#module.HEAPU8.subarray(buffer.ptr, buffer.ptr + dataSize));
    return data;
  }

  /**
   * Checks if the font is a fixed-pitch (monospace) font.
   */
  get isFixedPitch(): boolean {
    return (this.flags & FontFlags.FixedPitch) !== 0;
  }

  /**
   * Checks if the font is a serif font.
   */
  get isSerif(): boolean {
    return (this.flags & FontFlags.Serif) !== 0;
  }

  /**
   * Checks if the font is italic.
   */
  get isItalic(): boolean {
    return (this.flags & FontFlags.Italic) !== 0;
  }

  /**
   * Checks if the font is bold (weight >= 700 or ForceBold flag set).
   */
  get isBold(): boolean {
    return this.weight >= 700 || (this.flags & FontFlags.ForceBold) !== 0;
  }

  protected disposeInternal(): void {
    this.#release();
  }
}
