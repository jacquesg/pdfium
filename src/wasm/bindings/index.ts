/**
 * Type-safe PDFium WASM bindings.
 *
 * This module re-exports all binding interfaces combined into a single PDFiumWASM interface.
 *
 * @module wasm/bindings
 */

import type { AnnotationBindings } from './annotation.js';
import type { AttachmentBindings } from './attachment.js';
import type { CoreBindings } from './core.js';
import type { EditBindings } from './edit.js';
import type { FontBindings } from './font.js';
import type { FormBindings } from './form.js';
import type { ImportBindings } from './import.js';
import type { LinkBindings } from './link.js';
import type { MetadataBindings } from './metadata.js';
import type { ProgressiveBindings } from './progressive.js';
import type { RenderBindings } from './render.js';
import type { SignatureBindings } from './signature.js';
import type { TextBindings } from './text.js';

export type { WASMLoadOptions } from './types.js';
// Re-export types and enums
export { BitmapFormat, PageObjectTypeNative, PDFiumNativeErrorCode, RenderFlags } from './types.js';

/**
 * PDFium WASM module interface.
 *
 * These are the exported functions from the PDFium WASM binary.
 * The interface is composed of domain-specific binding interfaces.
 */
export interface PDFiumWASM
  extends CoreBindings,
    TextBindings,
    RenderBindings,
    AnnotationBindings,
    FontBindings,
    FormBindings,
    ImportBindings,
    LinkBindings,
    EditBindings,
    AttachmentBindings,
    SignatureBindings,
    MetadataBindings,
    ProgressiveBindings {
  // Memory management (Emscripten direct exports)
  _malloc: (size: number) => number;
  _free: (ptr: number) => void;

  // Emscripten runtime callback management
  addFunction: (func: (...args: number[]) => number, signature: string) => number;
  removeFunction: (funcPtr: number) => void;

  // Heap views
  HEAPU8: Uint8Array;
  HEAP32: Int32Array;
}
