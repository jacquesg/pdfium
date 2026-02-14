/**
 * Annotation implementation for PDFiumPage.
 *
 * @module document/page_impl/annotations
 * @internal
 */

import type { AnnotationType } from '../../core/types.js';
import { NULL_ANNOT } from '../../internal/constants.js';
import { annotationTypeMap, toNative } from '../../internal/enum-maps.js';
import type { AnnotationHandle, PageHandle } from '../../internal/handles.js';
import type { PDFiumWASM } from '../../wasm/bindings/index.js';

// ─────────────────────────────────────────────────────────────────────────
// Annotation Modification
// ─────────────────────────────────────────────────────────────────────────

export function createAnnotation(
  module: PDFiumWASM,
  pageHandle: PageHandle,
  type: AnnotationType,
): AnnotationHandle | null {
  const handle = module._FPDFPage_CreateAnnot(pageHandle, toNative(annotationTypeMap.toNative, type));
  return handle === NULL_ANNOT ? null : handle;
}

export function removeAnnotation(module: PDFiumWASM, pageHandle: PageHandle, index: number): boolean {
  return module._FPDFPage_RemoveAnnot(pageHandle, index) !== 0;
}
