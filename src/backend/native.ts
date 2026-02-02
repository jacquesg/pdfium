/**
 * Native backend implementation using the Rust napi-rs addon.
 *
 * @module backend/native
 */

import type { NativePdfium } from '../native/types.js';
import type { BackendAnnotation, BackendBookmark, BackendLink, PDFiumBackend } from './types.js';

/**
 * Native PDFium backend backed by the Rust napi-rs addon with libloading.
 */
export class NativeBackend implements PDFiumBackend {
  readonly kind = 'native' as const;
  readonly #binding: NativePdfium;

  constructor(binding: NativePdfium) {
    this.#binding = binding;
  }

  initLibrary(): void {
    this.#binding.initLibrary();
  }

  destroyLibrary(): void {
    this.#binding.destroyLibrary();
  }

  getLastError(): number {
    return this.#binding.getLastError();
  }

  loadDocument(data: Uint8Array, password?: string): number {
    return this.#binding.loadDocument(Buffer.from(data), password);
  }

  closeDocument(docHandle: number): void {
    this.#binding.closeDocument(docHandle);
  }

  getPageCount(docHandle: number): number {
    return this.#binding.getPageCount(docHandle);
  }

  loadPage(docHandle: number, pageIndex: number): number {
    return this.#binding.loadPage(docHandle, pageIndex);
  }

  closePage(pageHandle: number): void {
    this.#binding.closePage(pageHandle);
  }

  getPageWidth(pageHandle: number): number {
    return this.#binding.getPageWidth(pageHandle);
  }

  getPageHeight(pageHandle: number): number {
    return this.#binding.getPageHeight(pageHandle);
  }

  loadTextPage(pageHandle: number): number {
    return this.#binding.loadTextPage(pageHandle);
  }

  closeTextPage(textPageHandle: number): void {
    this.#binding.closeTextPage(textPageHandle);
  }

  countTextChars(textPageHandle: number): number {
    return this.#binding.countTextChars(textPageHandle);
  }

  getFullText(textPageHandle: number): string {
    return this.#binding.getFullText(textPageHandle);
  }

  getCharFontSize(textPageHandle: number, charIndex: number): number {
    return this.#binding.getCharFontSize(textPageHandle, charIndex);
  }

  getCharFontWeight(textPageHandle: number, charIndex: number): number {
    return this.#binding.getCharFontWeight(textPageHandle, charIndex);
  }

  getCharFontInfo(textPageHandle: number, charIndex: number): { name: string; flags: number } | null {
    return this.#binding.getCharFontInfo(textPageHandle, charIndex);
  }

  getCharRenderMode(textPageHandle: number, charIndex: number): number {
    return this.#binding.getCharRenderMode(textPageHandle, charIndex);
  }

  getCharUnicode(textPageHandle: number, charIndex: number): number {
    return this.#binding.getCharUnicode(textPageHandle, charIndex);
  }

  isCharGenerated(textPageHandle: number, charIndex: number): boolean {
    return this.#binding.isCharGenerated(textPageHandle, charIndex);
  }

  isCharHyphen(textPageHandle: number, charIndex: number): boolean {
    return this.#binding.isCharHyphen(textPageHandle, charIndex);
  }

  hasCharUnicodeMapError(textPageHandle: number, charIndex: number): boolean {
    return this.#binding.hasCharUnicodeMapError(textPageHandle, charIndex);
  }

  getCharAngle(textPageHandle: number, charIndex: number): number {
    return this.#binding.getCharAngle(textPageHandle, charIndex);
  }

  getCharOrigin(textPageHandle: number, charIndex: number): { x: number; y: number } | null {
    return this.#binding.getCharOrigin(textPageHandle, charIndex);
  }

  getCharBox(
    textPageHandle: number,
    charIndex: number,
  ): { left: number; right: number; bottom: number; top: number } | null {
    return this.#binding.getCharBox(textPageHandle, charIndex);
  }

  getCharLooseBox(
    textPageHandle: number,
    charIndex: number,
  ): { left: number; top: number; right: number; bottom: number } | null {
    return this.#binding.getCharLooseBox(textPageHandle, charIndex);
  }

  getCharIndexAtPos(textPageHandle: number, x: number, y: number, xTolerance: number, yTolerance: number): number {
    return this.#binding.getCharIndexAtPos(textPageHandle, x, y, xTolerance, yTolerance);
  }

  getCharFillColour(textPageHandle: number, charIndex: number): { r: number; g: number; b: number; a: number } | null {
    return this.#binding.getCharFillColour(textPageHandle, charIndex);
  }

  getCharStrokeColour(
    textPageHandle: number,
    charIndex: number,
  ): { r: number; g: number; b: number; a: number } | null {
    return this.#binding.getCharStrokeColour(textPageHandle, charIndex);
  }

  getCharMatrix(textPageHandle: number, charIndex: number): number[] | null {
    return this.#binding.getCharMatrix(textPageHandle, charIndex);
  }

  findText(textPageHandle: number, query: string, flags: number): { index: number; count: number }[] {
    return this.#binding.findText(textPageHandle, query, flags);
  }

  countTextRects(textPageHandle: number, startIndex: number, count: number): number {
    return this.#binding.countTextRects(textPageHandle, startIndex, count);
  }

  getTextRect(
    textPageHandle: number,
    rectIndex: number,
  ): { left: number; top: number; right: number; bottom: number } | null {
    return this.#binding.getTextRect(textPageHandle, rectIndex);
  }

  getBoundedText(textPageHandle: number, left: number, top: number, right: number, bottom: number): string {
    return this.#binding.getBoundedText(textPageHandle, left, top, right, bottom);
  }

  getPageRotation(pageHandle: number): number {
    return this.#binding.getPageRotation(pageHandle);
  }

  setPageRotation(pageHandle: number, rotation: number): void {
    this.#binding.setPageRotation(pageHandle, rotation);
  }

  hasPageTransparency(pageHandle: number): boolean {
    return this.#binding.hasPageTransparency(pageHandle);
  }

  flattenPage(pageHandle: number, flags: number): number {
    return this.#binding.flattenPage(pageHandle, flags);
  }

  generateContent(pageHandle: number): boolean {
    return this.#binding.generateContent(pageHandle);
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
    return this.#binding.deviceToPage(pageHandle, startX, startY, sizeX, sizeY, rotation, deviceX, deviceY);
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
    return this.#binding.pageToDevice(pageHandle, startX, startY, sizeX, sizeY, rotation, pageX, pageY);
  }

  renderPage(
    pageHandle: number,
    width: number,
    height: number,
    rotation: number,
    flags: number,
    bgColour: number,
  ): Uint8Array {
    return this.#binding.renderPage(pageHandle, width, height, rotation, flags, bgColour);
  }

  getMetaText(docHandle: number, tag: string): string | null {
    return this.#binding.getMetaText(docHandle, tag);
  }

  getFileVersion(docHandle: number): number | null {
    return this.#binding.getFileVersion(docHandle);
  }

  getDocPermissions(docHandle: number): number {
    return this.#binding.getDocPermissions(docHandle);
  }

  getDocUserPermissions(docHandle: number): number {
    return this.#binding.getDocUserPermissions(docHandle);
  }

  getPageMode(docHandle: number): number {
    return this.#binding.getPageMode(docHandle);
  }

  getSecurityHandlerRevision(docHandle: number): number {
    return this.#binding.getSecurityHandlerRevision(docHandle);
  }

  isTagged(docHandle: number): boolean {
    return this.#binding.isTagged(docHandle);
  }

  getPageLabel(docHandle: number, pageIndex: number): string | null {
    return this.#binding.getPageLabel(docHandle, pageIndex);
  }

  getPageBox(pageHandle: number, boxType: number): [number, number, number, number] | null {
    const result = this.#binding.getPageBox(pageHandle, boxType);
    if (result === null) {
      return null;
    }
    return [result[0] ?? 0, result[1] ?? 0, result[2] ?? 0, result[3] ?? 0];
  }

  setPageBox(pageHandle: number, boxType: number, left: number, bottom: number, right: number, top: number): void {
    this.#binding.setPageBox(pageHandle, boxType, left, bottom, right, top);
  }

  getLinks(pageHandle: number, docHandle: number): BackendLink[] {
    return this.#binding.getLinks(pageHandle, docHandle);
  }

  getAnnotations(pageHandle: number): BackendAnnotation[] {
    return this.#binding.getAnnotations(pageHandle);
  }

  createAnnotation(pageHandle: number, subtype: number): number {
    return this.#binding.createAnnotation(pageHandle, subtype);
  }

  removeAnnotation(pageHandle: number, index: number): boolean {
    return this.#binding.removeAnnotation(pageHandle, index);
  }

  setAnnotationRect(
    pageHandle: number,
    index: number,
    left: number,
    top: number,
    right: number,
    bottom: number,
  ): boolean {
    return this.#binding.setAnnotationRect(pageHandle, index, left, top, right, bottom);
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
    return this.#binding.setAnnotationColour(pageHandle, index, colourType, r, g, b, a);
  }

  getAnnotationFlags(pageHandle: number, index: number): number {
    return this.#binding.getAnnotationFlags(pageHandle, index);
  }

  setAnnotationFlags(pageHandle: number, index: number, flags: number): boolean {
    return this.#binding.setAnnotationFlags(pageHandle, index, flags);
  }

  setAnnotationStringValue(pageHandle: number, index: number, key: string, value: string): boolean {
    return this.#binding.setAnnotationStringValue(pageHandle, index, key, value);
  }

  setAnnotationBorder(
    pageHandle: number,
    index: number,
    horizontalRadius: number,
    verticalRadius: number,
    borderWidth: number,
  ): boolean {
    return this.#binding.setAnnotationBorder(pageHandle, index, horizontalRadius, verticalRadius, borderWidth);
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
    return this.#binding.setAnnotationAttachmentPoints(
      pageHandle,
      annotIndex,
      quadIndex,
      x1,
      y1,
      x2,
      y2,
      x3,
      y3,
      x4,
      y4,
    );
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
    return this.#binding.appendAnnotationAttachmentPoints(pageHandle, annotIndex, x1, y1, x2, y2, x3, y3, x4, y4);
  }

  setAnnotationUri(pageHandle: number, index: number, uri: string): boolean {
    return this.#binding.setAnnotationUri(pageHandle, index, uri);
  }

  getBookmarks(docHandle: number): BackendBookmark[] {
    return this.#binding.getBookmarks(docHandle);
  }

  getSignatureCount(docHandle: number): number {
    return this.#binding.getSignatureCount(docHandle);
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
    try {
      const sig = this.#binding.getSignature(docHandle, index);
      return {
        docMDPPermission: sig.docMdpPermission,
        ...(sig.contents !== null ? { contents: new Uint8Array(sig.contents) } : {}),
        ...(sig.byteRange !== null ? { byteRange: sig.byteRange } : {}),
        ...(sig.subFilter !== null ? { subFilter: sig.subFilter } : {}),
        ...(sig.reason !== null ? { reason: sig.reason } : {}),
        ...(sig.time !== null ? { time: sig.time } : {}),
      };
    } catch {
      return null;
    }
  }

  saveDocument(docHandle: number, flags: number, version: number | null): Uint8Array {
    return new Uint8Array(this.#binding.saveDocument(docHandle, flags, version));
  }

  getAttachmentCount(docHandle: number): number {
    return this.#binding.getAttachmentCount(docHandle);
  }

  getAttachment(docHandle: number, index: number): { name: string; data: Uint8Array } | null {
    const result = this.#binding.getAttachment(docHandle, index);
    if (result === null) {
      return null;
    }
    return { name: result.name, data: new Uint8Array(result.data) };
  }

  importPages(destHandle: number, srcHandle: number, pageRange: string | null, insertIndex: number): void {
    this.#binding.importPages(destHandle, srcHandle, pageRange, insertIndex);
  }

  importPagesByIndex(destHandle: number, srcHandle: number, pageIndices: number[], insertIndex: number): void {
    this.#binding.importPagesByIndex(destHandle, srcHandle, pageIndices, insertIndex);
  }

  importNPagesToOne(
    srcHandle: number,
    outputWidth: number,
    outputHeight: number,
    pagesPerRow: number,
    pagesPerColumn: number,
  ): number {
    return this.#binding.importNPagesToOne(srcHandle, outputWidth, outputHeight, pagesPerRow, pagesPerColumn);
  }

  copyViewerPreferences(destHandle: number, srcHandle: number): boolean {
    return this.#binding.copyViewerPreferences(destHandle, srcHandle);
  }
}
