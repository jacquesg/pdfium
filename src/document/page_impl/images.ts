/**
 * Image Object implementation for PDFiumPage.
 *
 * @module document/page_impl/images
 * @internal
 */

import { ImageColourSpace, ImageMarkedContentType, type ImageMetadata } from '../../core/types.js';
import { fromNative, imageColourSpaceMap, imageMarkedContentTypeMap } from '../../internal/enum-maps.js';
import type { BitmapHandle, PageHandle, PageObjectHandle } from '../../internal/handles.js';
import type { PDFiumWASM } from '../../wasm/bindings/index.js';
import { NULL_PTR, ptrOffset, type WASMMemoryManager } from '../../wasm/memory.js';
import { getWasmBytes } from '../../wasm/utils.js';

// ─────────────────────────────────────────────────────────────────────────
// Image Object Methods
// ─────────────────────────────────────────────────────────────────────────

export function imageObjSetBitmap(module: PDFiumWASM, imageObj: PageObjectHandle, bitmap: BitmapHandle): boolean {
  // Pass NULL for pages array and 0 for count - use current page
  return module._FPDFImageObj_SetBitmap(NULL_PTR, 0, imageObj, bitmap) !== 0;
}

export function imageObjSetMatrix(
  module: PDFiumWASM,
  imageObj: PageObjectHandle,
  a: number,
  b: number,
  c: number,
  d: number,
  e: number,
  f: number,
): boolean {
  return module._FPDFImageObj_SetMatrix(imageObj, a, b, c, d, e, f) !== 0;
}

export function imageObjGetDecodedData(
  module: PDFiumWASM,
  memory: WASMMemoryManager,
  imageObj: PageObjectHandle,
): Uint8Array | null {
  return getWasmBytes(memory, (ptr, size) => module._FPDFImageObj_GetImageDataDecoded(imageObj, ptr, size)) ?? null;
}

export function imageObjGetRawData(
  module: PDFiumWASM,
  memory: WASMMemoryManager,
  imageObj: PageObjectHandle,
): Uint8Array | null {
  return getWasmBytes(memory, (ptr, size) => module._FPDFImageObj_GetImageDataRaw(imageObj, ptr, size)) ?? null;
}

export function imageObjGetMetadata(
  module: PDFiumWASM,
  memory: WASMMemoryManager,
  imageObj: PageObjectHandle,
  page: PageHandle,
): ImageMetadata | null {
  // FPDF_IMAGEOBJ_METADATA struct is 28 bytes
  // uint width;
  // uint height;
  // float horizontal_dpi;
  // float vertical_dpi;
  // uint bits_per_pixel;
  // int colorspace;
  // int marked_content_id;
  using metadataPtr = memory.alloc(28);

  const success = module._FPDFImageObj_GetImageMetadata(imageObj, page, metadataPtr.ptr);

  if (!success) {
    return null;
  }

  const width = memory.readUint32(metadataPtr.ptr);
  const height = memory.readUint32(ptrOffset(metadataPtr.ptr, 4));
  const horizontalDpi = memory.readFloat32(ptrOffset(metadataPtr.ptr, 8));
  const verticalDpi = memory.readFloat32(ptrOffset(metadataPtr.ptr, 12));
  const bitsPerPixel = memory.readUint32(ptrOffset(metadataPtr.ptr, 16));
  const colourSpaceRaw = memory.readInt32(ptrOffset(metadataPtr.ptr, 20));
  const markedContentRaw = memory.readInt32(ptrOffset(metadataPtr.ptr, 24));

  // Map colour space value
  const colourSpace = fromNative(imageColourSpaceMap.fromNative, colourSpaceRaw, ImageColourSpace.Unknown);

  // Map marked content type
  const markedContent = fromNative(imageMarkedContentTypeMap.fromNative, markedContentRaw, ImageMarkedContentType.None);

  return {
    width,
    height,
    horizontalDpi,
    verticalDpi,
    bitsPerPixel,
    colourSpace,
    markedContent,
  };
}
