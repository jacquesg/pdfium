/**
 * Re-export of the library's TextLayer component.
 *
 * Note: the library's TextLayer takes `document` + `pageIndex` instead of
 * a `page` object. Callers that previously passed a `WorkerPDFiumPage`
 * must be updated to pass the document and page index separately.
 */

export { TextLayer } from '@scaryterry/pdfium/react';
export type { TextLayerProps } from '@scaryterry/pdfium/react';
