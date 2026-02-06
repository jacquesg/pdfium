/**
 * Native PDFium page backed by the native backend.
 *
 * @module document/native-page
 */

import type { BackendAnnotation, BackendLink, PDFiumBackend } from '../backend/types.js';
import { Disposable } from '../core/disposable.js';
import { PageError, PDFiumErrorCode, RenderError, TextError } from '../core/errors.js';
import {
  ActionType,
  type Annotation,
  AnnotationType,
  type CharBox,
  type Colour,
  type CoordinateTransformContext,
  DEFAULT_LIMITS,
  DestinationFitType,
  type DeviceCoordinate,
  FlattenFlags,
  FlattenResult,
  type PageBox,
  PageBoxType,
  type PageCoordinate,
  PageRotation,
  type PDFAction,
  type PDFDestination,
  type PDFiumLimits,
  type PDFLink,
  type QuadPoints,
  type Rect,
  type RenderOptions,
  type RenderResult,
  TextRenderMode,
  TextSearchFlags,
  type TextSearchResult,
  type TransformMatrix,
} from '../core/types.js';
import {
  actionTypeMap,
  annotationTypeMap,
  destinationFitTypeMap,
  flattenFlagsMap,
  flattenResultMap,
  fromNative,
  pageBoxTypeMap,
  pageRotationMap,
  textRenderModeMap,
  toNative,
} from '../internal/enum-maps.js';

/** Default background colour (white with full opacity). */
const DEFAULT_BACKGROUND_COLOUR = 0xffffffff;

/** FPDF_ANNOT render flag. */
const RENDER_FLAG_ANNOT = 0x01;

/** Default tolerance for character position lookups (in points). */
const DEFAULT_CHAR_POSITION_TOLERANCE = 10;

/**
 * A PDF page backed by the native PDFium addon.
 *
 * Supports core operations: dimensions, text extraction, and rendering.
 */
export class NativePDFiumPage extends Disposable {
  readonly #backend: PDFiumBackend;
  readonly #pageHandle: number;
  readonly #docHandle: number;
  readonly #pageIndex: number;
  readonly #limits: Readonly<Required<PDFiumLimits>>;
  readonly #width: number;
  readonly #height: number;
  readonly #deregister: ((page: NativePDFiumPage) => void) | undefined;
  #textPageHandle = 0;

  /** @internal */
  constructor(
    backend: PDFiumBackend,
    pageHandle: number,
    docHandle: number,
    pageIndex: number,
    limits?: Readonly<Required<PDFiumLimits>>,
    deregister?: (page: NativePDFiumPage) => void,
  ) {
    super('NativePDFiumPage', PDFiumErrorCode.PAGE_ALREADY_CLOSED);
    this.#backend = backend;
    this.#pageHandle = pageHandle;
    this.#docHandle = docHandle;
    this.#pageIndex = pageIndex;
    this.#limits = limits ?? DEFAULT_LIMITS;
    this.#deregister = deregister;
    this.#width = this.#backend.getPageWidth(this.#pageHandle);
    this.#height = this.#backend.getPageHeight(this.#pageHandle);

    this.setFinalizerCleanup(() => {
      this.#releaseNative();
    });
  }

  /** The zero-based index of this page. */
  get index(): number {
    return this.#pageIndex;
  }

  /** Get the page dimensions in points. */
  get size(): { width: number; height: number } {
    this.ensureNotDisposed();
    return { width: this.#width, height: this.#height };
  }

  /** Get the width of the page in points. */
  get width(): number {
    this.ensureNotDisposed();
    return this.#width;
  }

  /** Get the height of the page in points. */
  get height(): number {
    this.ensureNotDisposed();
    return this.#height;
  }

  /** Get all text content from the page. */
  getText(): string {
    this.ensureNotDisposed();
    this.#ensureTextPage();

    const charCount = this.#backend.countTextChars(this.#textPageHandle);
    if (charCount <= 0) {
      return '';
    }

    if (charCount > this.#limits.maxTextCharCount) {
      throw new TextError(
        PDFiumErrorCode.TEXT_EXTRACTION_FAILED,
        `Text character count ${charCount} exceeds maximum of ${this.#limits.maxTextCharCount}`,
        { charCount, maxTextCharCount: this.#limits.maxTextCharCount },
      );
    }

    return this.#backend.getFullText(this.#textPageHandle);
  }

  /** Get the number of characters on the page. */
  get charCount(): number {
    this.ensureNotDisposed();
    this.#ensureTextPage();
    return this.#backend.countTextChars(this.#textPageHandle);
  }

  /** Render the page to a bitmap. */
  render(options: RenderOptions = {}): RenderResult {
    this.ensureNotDisposed();

    const { renderWidth, renderHeight } = this.#calculateRenderDimensions(options);
    this.#validateRenderDimensions(renderWidth, renderHeight);

    const bgColour = options.backgroundColour ?? DEFAULT_BACKGROUND_COLOUR;
    const rotation = options.rotation ?? PageRotation.None;
    const flags = RENDER_FLAG_ANNOT;

    const data = this.#backend.renderPage(
      this.#pageHandle,
      renderWidth,
      renderHeight,
      toNative(pageRotationMap.toNative, rotation),
      flags,
      bgColour,
    );

    return {
      width: renderWidth,
      height: renderHeight,
      originalWidth: this.#width,
      originalHeight: this.#height,
      data,
    };
  }

  // ── Character Font Info ──────────────────────────────────────────────

  /** Get the font size of a character at the specified index. */
  getCharFontSize(charIndex: number): number {
    this.ensureNotDisposed();
    this.#ensureTextPage();

    const count = this.#backend.countTextChars(this.#textPageHandle);
    if (charIndex < 0 || charIndex >= count) {
      return 0;
    }

    return this.#backend.getCharFontSize(this.#textPageHandle, charIndex);
  }

  /** Get the font weight of a character at the specified index. */
  getCharFontWeight(charIndex: number): number {
    this.ensureNotDisposed();
    this.#ensureTextPage();

    const count = this.#backend.countTextChars(this.#textPageHandle);
    if (charIndex < 0 || charIndex >= count) {
      return -1;
    }

    return this.#backend.getCharFontWeight(this.#textPageHandle, charIndex);
  }

  /** Get the font name of a character at the specified index. */
  getCharFontName(charIndex: number): string | undefined {
    this.ensureNotDisposed();
    this.#ensureTextPage();

    const count = this.#backend.countTextChars(this.#textPageHandle);
    if (charIndex < 0 || charIndex >= count) {
      return undefined;
    }

    const result = this.#backend.getCharFontInfo(this.#textPageHandle, charIndex);
    return result?.name;
  }

  /** Get the text render mode for a character at the specified index. */
  getCharRenderMode(charIndex: number): TextRenderMode {
    this.ensureNotDisposed();
    this.#ensureTextPage();

    const count = this.#backend.countTextChars(this.#textPageHandle);
    if (charIndex < 0 || charIndex >= count) {
      return TextRenderMode.Fill;
    }

    const mode = this.#backend.getCharRenderMode(this.#textPageHandle, charIndex);
    return fromNative(textRenderModeMap.fromNative, mode, TextRenderMode.Fill);
  }

  // ── Text Character Extended Operations ─────────────────────────────────

  /** Get the Unicode codepoint of a character. */
  getCharUnicode(charIndex: number): number {
    this.ensureNotDisposed();
    this.#ensureTextPage();
    const count = this.#backend.countTextChars(this.#textPageHandle);
    if (charIndex < 0 || charIndex >= count) {
      return 0;
    }
    return this.#backend.getCharUnicode(this.#textPageHandle, charIndex);
  }

  /** Check if a character is generated (not from the original PDF content). */
  isCharGenerated(charIndex: number): boolean {
    this.ensureNotDisposed();
    this.#ensureTextPage();
    const count = this.#backend.countTextChars(this.#textPageHandle);
    if (charIndex < 0 || charIndex >= count) {
      return false;
    }
    return this.#backend.isCharGenerated(this.#textPageHandle, charIndex);
  }

  /** Check if a character is a hyphen. */
  isCharHyphen(charIndex: number): boolean {
    this.ensureNotDisposed();
    this.#ensureTextPage();
    const count = this.#backend.countTextChars(this.#textPageHandle);
    if (charIndex < 0 || charIndex >= count) {
      return false;
    }
    return this.#backend.isCharHyphen(this.#textPageHandle, charIndex);
  }

  /** Check if a character has a Unicode mapping error. */
  hasCharUnicodeMapError(charIndex: number): boolean {
    this.ensureNotDisposed();
    this.#ensureTextPage();
    const count = this.#backend.countTextChars(this.#textPageHandle);
    if (charIndex < 0 || charIndex >= count) {
      return false;
    }
    return this.#backend.hasCharUnicodeMapError(this.#textPageHandle, charIndex);
  }

  /** Get the rotation angle (in radians) of a character. */
  getCharAngle(charIndex: number): number {
    this.ensureNotDisposed();
    this.#ensureTextPage();
    const count = this.#backend.countTextChars(this.#textPageHandle);
    if (charIndex < 0 || charIndex >= count) {
      return 0;
    }
    return this.#backend.getCharAngle(this.#textPageHandle, charIndex);
  }

  /** Get the origin point of a character. */
  getCharOrigin(charIndex: number): { x: number; y: number } | undefined {
    this.ensureNotDisposed();
    this.#ensureTextPage();
    const count = this.#backend.countTextChars(this.#textPageHandle);
    if (charIndex < 0 || charIndex >= count) {
      return undefined;
    }
    return this.#backend.getCharOrigin(this.#textPageHandle, charIndex) ?? undefined;
  }

  /** Get the bounding box of a character. */
  getCharBox(charIndex: number): CharBox | undefined {
    this.ensureNotDisposed();
    this.#ensureTextPage();
    const count = this.#backend.countTextChars(this.#textPageHandle);
    if (charIndex < 0 || charIndex >= count) {
      return undefined;
    }
    return this.#backend.getCharBox(this.#textPageHandle, charIndex) ?? undefined;
  }

  /** Get the loose bounding box of a character. */
  getCharLooseBox(charIndex: number): Rect | undefined {
    this.ensureNotDisposed();
    this.#ensureTextPage();
    const count = this.#backend.countTextChars(this.#textPageHandle);
    if (charIndex < 0 || charIndex >= count) {
      return undefined;
    }
    return this.#backend.getCharLooseBox(this.#textPageHandle, charIndex) ?? undefined;
  }

  /** Get the character index at a page position. Returns -1 if not found. */
  getCharIndexAtPos(
    x: number,
    y: number,
    xTolerance = DEFAULT_CHAR_POSITION_TOLERANCE,
    yTolerance = DEFAULT_CHAR_POSITION_TOLERANCE,
  ): number {
    this.ensureNotDisposed();
    this.#ensureTextPage();
    return this.#backend.getCharIndexAtPos(this.#textPageHandle, x, y, xTolerance, yTolerance);
  }

  /** Get the fill colour of a character. */
  getCharFillColour(charIndex: number): Colour | undefined {
    this.ensureNotDisposed();
    this.#ensureTextPage();
    const count = this.#backend.countTextChars(this.#textPageHandle);
    if (charIndex < 0 || charIndex >= count) {
      return undefined;
    }
    return this.#backend.getCharFillColour(this.#textPageHandle, charIndex) ?? undefined;
  }

  /** Get the stroke colour of a character. */
  getCharStrokeColour(charIndex: number): Colour | undefined {
    this.ensureNotDisposed();
    this.#ensureTextPage();
    const count = this.#backend.countTextChars(this.#textPageHandle);
    if (charIndex < 0 || charIndex >= count) {
      return undefined;
    }
    return this.#backend.getCharStrokeColour(this.#textPageHandle, charIndex) ?? undefined;
  }

  /** Get the transformation matrix of a character. */
  getCharMatrix(charIndex: number): TransformMatrix | undefined {
    this.ensureNotDisposed();
    this.#ensureTextPage();
    const count = this.#backend.countTextChars(this.#textPageHandle);
    if (charIndex < 0 || charIndex >= count) {
      return undefined;
    }
    const arr = this.#backend.getCharMatrix(this.#textPageHandle, charIndex);
    if (!arr || arr.length < 6) {
      return undefined;
    }
    return {
      a: arr[0] ?? 0,
      b: arr[1] ?? 0,
      c: arr[2] ?? 0,
      d: arr[3] ?? 0,
      e: arr[4] ?? 0,
      f: arr[5] ?? 0,
    };
  }

  // ── Text Search ──────────────────────────────────────────────────────

  /** Find all occurrences of a string on the page. */
  *findText(query: string, flags: TextSearchFlags = TextSearchFlags.None): IterableIterator<TextSearchResult> {
    this.ensureNotDisposed();
    if (query.length === 0) {
      return;
    }
    this.#ensureTextPage();

    const matches = this.#backend.findText(this.#textPageHandle, query, flags);
    for (const match of matches) {
      const rects = this.#getTextRects(match.index, match.count);
      yield { charIndex: match.index, charCount: match.count, rects };
    }
  }

  /** Get text within a bounding rectangle. */
  getBoundedText(left: number, top: number, right: number, bottom: number): string {
    this.ensureNotDisposed();
    this.#ensureTextPage();
    return this.#backend.getBoundedText(this.#textPageHandle, left, top, right, bottom);
  }

  // ── Page Operations ──────────────────────────────────────────────────

  /** Get the page rotation (0=0deg, 1=90deg, 2=180deg, 3=270deg). */
  get rotation(): PageRotation {
    this.ensureNotDisposed();
    return fromNative(pageRotationMap.fromNative, this.#backend.getPageRotation(this.#pageHandle), PageRotation.None);
  }

  /** Check if this page contains transparency. */
  hasTransparency(): boolean {
    this.ensureNotDisposed();
    return this.#backend.hasPageTransparency(this.#pageHandle);
  }

  /** Flatten annotations and form fields into page content. */
  flatten(flags: FlattenFlags = FlattenFlags.NormalDisplay): FlattenResult {
    this.ensureNotDisposed();
    return fromNative(
      flattenResultMap.fromNative,
      this.#backend.flattenPage(this.#pageHandle, toNative(flattenFlagsMap.toNative, flags)),
      FlattenResult.Fail,
    );
  }

  /** Generate the page content stream after modifications. */
  generateContent(): boolean {
    this.ensureNotDisposed();
    return this.#backend.generateContent(this.#pageHandle);
  }

  // ── Coordinate Conversion ────────────────────────────────────────────

  /** Convert device coordinates to page coordinates. */
  deviceToPage(context: CoordinateTransformContext, deviceX: number, deviceY: number): PageCoordinate {
    this.ensureNotDisposed();
    if (!Number.isFinite(deviceX) || !Number.isFinite(deviceY)) {
      throw new PageError(PDFiumErrorCode.PAGE_LOAD_FAILED, 'Device coordinates must be finite numbers');
    }
    return this.#backend.deviceToPage(
      this.#pageHandle,
      context.startX,
      context.startY,
      context.sizeX,
      context.sizeY,
      toNative(pageRotationMap.toNative, context.rotate),
      deviceX,
      deviceY,
    );
  }

  /** Convert page coordinates to device coordinates. */
  pageToDevice(context: CoordinateTransformContext, pageX: number, pageY: number): DeviceCoordinate {
    this.ensureNotDisposed();
    if (!Number.isFinite(pageX) || !Number.isFinite(pageY)) {
      throw new PageError(PDFiumErrorCode.PAGE_LOAD_FAILED, 'Page coordinates must be finite numbers');
    }
    return this.#backend.pageToDevice(
      this.#pageHandle,
      context.startX,
      context.startY,
      context.sizeX,
      context.sizeY,
      toNative(pageRotationMap.toNative, context.rotate),
      pageX,
      pageY,
    );
  }

  // ── Page Boxes ────────────────────────────────────────────────────────

  /** Get a specific page box by type. */
  getPageBox(boxType: PageBoxType): PageBox | undefined {
    this.ensureNotDisposed();
    const result = this.#backend.getPageBox(this.#pageHandle, toNative(pageBoxTypeMap.toNative, boxType));
    if (result === null) {
      return undefined;
    }
    return { left: result[0], bottom: result[1], right: result[2], top: result[3] };
  }

  /** Set a specific page box by type. */
  setPageBox(boxType: PageBoxType, box: PageBox): void {
    this.ensureNotDisposed();
    this.#backend.setPageBox(
      this.#pageHandle,
      toNative(pageBoxTypeMap.toNative, boxType),
      box.left,
      box.bottom,
      box.right,
      box.top,
    );
  }

  /** Get the media box (physical page boundaries). */
  get mediaBox(): PageBox | undefined {
    return this.getPageBox(PageBoxType.MediaBox);
  }

  /** Get the crop box (visible region). */
  get cropBox(): PageBox | undefined {
    return this.getPageBox(PageBoxType.CropBox);
  }

  /** Get the bleed box (printing bleed area). */
  get bleedBox(): PageBox | undefined {
    return this.getPageBox(PageBoxType.BleedBox);
  }

  /** Get the trim box (final trimmed dimensions). */
  get trimBox(): PageBox | undefined {
    return this.getPageBox(PageBoxType.TrimBox);
  }

  /** Get the art box (content boundaries). */
  get artBox(): PageBox | undefined {
    return this.getPageBox(PageBoxType.ArtBox);
  }

  // ── Annotations ──────────────────────────────────────────────────────

  /** Get all annotations on this page. */
  getAnnotations(): Annotation[] {
    this.ensureNotDisposed();
    const raw = this.#backend.getAnnotations(this.#pageHandle);
    return raw.map((a) => this.#toAnnotation(a));
  }

  /** Get the number of annotations on this page. */
  get annotationCount(): number {
    this.ensureNotDisposed();
    return this.#backend.getAnnotations(this.#pageHandle).length;
  }

  /**
   * Create a new annotation on this page.
   *
   * @param subtype - Annotation subtype (e.g. AnnotationType.Text = 1).
   * @returns The index of the new annotation.
   */
  createAnnotation(subtype: AnnotationType): number {
    this.ensureNotDisposed();
    return this.#backend.createAnnotation(this.#pageHandle, toNative(annotationTypeMap.toNative, subtype));
  }

  /**
   * Remove an annotation by index.
   *
   * @returns `true` if the annotation was removed.
   */
  removeAnnotation(index: number): boolean {
    this.ensureNotDisposed();
    return this.#backend.removeAnnotation(this.#pageHandle, index);
  }

  /**
   * Set the bounding rectangle of an annotation.
   *
   * @returns `true` if the rect was set.
   */
  setAnnotationRect(index: number, bounds: PageBox): boolean {
    this.ensureNotDisposed();
    return this.#backend.setAnnotationRect(
      this.#pageHandle,
      index,
      bounds.left,
      bounds.top,
      bounds.right,
      bounds.bottom,
    );
  }

  /**
   * Set the colour of an annotation.
   *
   * @param colourType - 0 for colour, 1 for interior colour.
   * @returns `true` if the colour was set.
   */
  setAnnotationColour(index: number, colour: Colour, colourType = 0): boolean {
    this.ensureNotDisposed();
    return this.#backend.setAnnotationColour(
      this.#pageHandle,
      index,
      colourType,
      colour.r,
      colour.g,
      colour.b,
      colour.a,
    );
  }

  /**
   * Get the flags of an annotation.
   */
  getAnnotationFlags(index: number): number {
    this.ensureNotDisposed();
    return this.#backend.getAnnotationFlags(this.#pageHandle, index);
  }

  /**
   * Set the flags of an annotation.
   *
   * @returns `true` if the flags were set.
   */
  setAnnotationFlags(index: number, flags: number): boolean {
    this.ensureNotDisposed();
    return this.#backend.setAnnotationFlags(this.#pageHandle, index, flags);
  }

  /**
   * Set a string value on an annotation.
   *
   * @param key - The dictionary key (e.g. "Contents").
   * @param value - The string value.
   * @returns `true` if the value was set.
   */
  setAnnotationStringValue(index: number, key: string, value: string): boolean {
    this.ensureNotDisposed();
    return this.#backend.setAnnotationStringValue(this.#pageHandle, index, key, value);
  }

  /**
   * Set the border of an annotation.
   *
   * @returns `true` if the border was set.
   */
  setAnnotationBorder(index: number, horizontalRadius: number, verticalRadius: number, borderWidth: number): boolean {
    this.ensureNotDisposed();
    return this.#backend.setAnnotationBorder(this.#pageHandle, index, horizontalRadius, verticalRadius, borderWidth);
  }

  /**
   * Set attachment points at a specific quad index.
   *
   * @returns `true` if the points were set.
   */
  setAnnotationAttachmentPoints(index: number, quadIndex: number, points: QuadPoints): boolean {
    this.ensureNotDisposed();
    return this.#backend.setAnnotationAttachmentPoints(
      this.#pageHandle,
      index,
      quadIndex,
      points.x1,
      points.y1,
      points.x2,
      points.y2,
      points.x3,
      points.y3,
      points.x4,
      points.y4,
    );
  }

  /**
   * Append attachment points to an annotation.
   *
   * @returns `true` if the points were appended.
   */
  appendAnnotationAttachmentPoints(index: number, points: QuadPoints): boolean {
    this.ensureNotDisposed();
    return this.#backend.appendAnnotationAttachmentPoints(
      this.#pageHandle,
      index,
      points.x1,
      points.y1,
      points.x2,
      points.y2,
      points.x3,
      points.y3,
      points.x4,
      points.y4,
    );
  }

  /**
   * Set the URI on a link annotation.
   *
   * @returns `true` if the URI was set.
   */
  setAnnotationUri(index: number, uri: string): boolean {
    this.ensureNotDisposed();
    return this.#backend.setAnnotationUri(this.#pageHandle, index, uri);
  }

  // ── Links ────────────────────────────────────────────────────────────

  /** Get all links on this page. */
  getLinks(): PDFLink[] {
    this.ensureNotDisposed();
    const raw = this.#backend.getLinks(this.#pageHandle, this.#docHandle);
    return raw.map((l) => this.#toLink(l));
  }

  #toLink(raw: BackendLink): PDFLink {
    const bounds: Rect = { left: raw.left, bottom: raw.bottom, right: raw.right, top: raw.top };
    const link: PDFLink = { index: raw.index, bounds };

    if (raw.hasAction) {
      const type = fromNative(actionTypeMap.fromNative, raw.actionType, ActionType.Unsupported);
      const action: PDFAction = { type };
      if (raw.uri !== null) {
        action.uri = raw.uri;
      }
      if (raw.filePath !== null) {
        action.filePath = raw.filePath;
      }
      link.action = action;
    }

    if (raw.hasDest) {
      const fitType = fromNative(destinationFitTypeMap.fromNative, raw.destFitType, DestinationFitType.Unknown);
      const destination: PDFDestination = { pageIndex: raw.destPageIndex, fitType };
      if (raw.hasX) {
        destination.x = raw.x;
      }
      if (raw.hasY) {
        destination.y = raw.y;
      }
      if (raw.hasZoom) {
        destination.zoom = raw.zoom;
      }
      link.destination = destination;
    }

    return link;
  }

  #toAnnotation(raw: BackendAnnotation): Annotation {
    const type = fromNative(annotationTypeMap.fromNative, raw.subtype, AnnotationType.Unknown);
    const bounds: Rect = { left: raw.left, top: raw.top, right: raw.right, bottom: raw.bottom };

    const colour: Colour | null = raw.hasColour ? { r: raw.r, g: raw.g, b: raw.b, a: raw.a } : null;
    return { index: raw.index, type, bounds, colour };
  }

  #getTextRects(charIndex: number, charCount: number): Rect[] {
    const rectCount = this.#backend.countTextRects(this.#textPageHandle, charIndex, charCount);
    if (rectCount <= 0) {
      return [];
    }

    const rects: Rect[] = [];
    for (let i = 0; i < rectCount; i++) {
      const rect = this.#backend.getTextRect(this.#textPageHandle, i);
      if (rect !== null) {
        rects.push(rect);
      }
    }
    return rects;
  }

  #ensureTextPage(): void {
    if (this.#textPageHandle !== 0) {
      return;
    }
    this.#textPageHandle = this.#backend.loadTextPage(this.#pageHandle);
    if (this.#textPageHandle === 0) {
      throw new TextError(PDFiumErrorCode.TEXT_EXTRACTION_FAILED, 'Failed to load text page');
    }
  }

  #calculateRenderDimensions(options: RenderOptions): { renderWidth: number; renderHeight: number } {
    if (options.width !== undefined && options.height !== undefined) {
      return { renderWidth: Math.round(options.width), renderHeight: Math.round(options.height) };
    }
    const scale = options.scale ?? 1;
    return {
      renderWidth: Math.round(this.#width * scale),
      renderHeight: Math.round(this.#height * scale),
    };
  }

  #validateRenderDimensions(width: number, height: number): void {
    if (width <= 0 || height <= 0) {
      throw new RenderError(PDFiumErrorCode.RENDER_INVALID_DIMENSIONS, `Invalid render dimensions: ${width}x${height}`);
    }
    const max = this.#limits.maxRenderDimension;
    if (width > max || height > max) {
      throw new RenderError(
        PDFiumErrorCode.RENDER_INVALID_DIMENSIONS,
        `Render dimensions ${width}x${height} exceed maximum of ${max}`,
      );
    }
  }

  #releaseNative(): void {
    if (this.#textPageHandle !== 0) {
      this.#backend.closeTextPage(this.#textPageHandle);
      this.#textPageHandle = 0;
    }
    this.#backend.closePage(this.#pageHandle);
    this.#deregister?.(this);
  }

  protected disposeInternal(): void {
    this.#releaseNative();
  }
}
