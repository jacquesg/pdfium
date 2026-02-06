/**
 * Page object wrapper classes for type-safe access to PDF page objects.
 *
 * These classes encapsulate raw PDFium handles and provide a clean API
 * for working with text, image, path, and other page objects.
 *
 * Page objects are borrowed views on the parent page. They become invalid
 * when the page is disposed — methods will throw after page disposal.
 *
 * @module document/page-object
 */

import { PageError, PDFiumErrorCode } from '../core/errors.js';
import {
  type BlendMode,
  type Colour,
  type DashPattern,
  type ImageMetadata,
  type LineCapStyle,
  type LineJoinStyle,
  type PageObjectMark,
  PageObjectType,
  type PathFillMode,
  type PathSegmentType,
  type Point,
  type QuadPoints,
  type Rect,
  type TextRenderMode,
  type TransformMatrix,
} from '../core/types.js';
import { fromNative, textRenderModeMap, toNative } from '../internal/enum-maps.js';
import type { BitmapHandle, PageObjectHandle, PageObjectMarkHandle, PathSegmentHandle } from '../internal/handles.js';
import { INTERNAL } from '../internal/symbols.js';
import type { PDFiumWASM } from '../wasm/bindings/index.js';
import type { WASMMemoryManager } from '../wasm/memory.js';
import type { PDFiumFont } from './font.js';
import * as Images from './page_impl/images.js';
import * as Objects from './page_impl/objects.js';

/**
 * Internal context needed by page object wrappers.
 *
 * Passed at construction time to avoid circular imports with PDFiumPage.
 *
 * @internal
 */
export interface PageObjectContext {
  readonly module: PDFiumWASM;
  readonly memory: WASMMemoryManager;
  readonly ensurePageValid: () => void;
  readonly retain: () => void;
  readonly release: () => void;
  readonly getFont: (handle: PageObjectHandle) => PDFiumFont | null;
  readonly getMarkParams: (mark: PageObjectMarkHandle) => PageObjectMark['params'];
  readonly getImageMetadata: (handle: PageObjectHandle) => ImageMetadata | null;
}

/**
 * Base class for all PDF page objects.
 *
 * Page objects are lightweight borrowed views on the parent page.
 * They do not need to be disposed, but become invalid when the
 * parent page is disposed.
 *
 * **Design convention:** Getters are used for cheap, cached, or always-available
 * properties (e.g. `type`, `bounds`). Methods are used for fallible, parameterised,
 * or WASM-allocating operations (e.g. `setMatrix()`, `getFont()`).
 *
 * @example
 * ```typescript
 * using page = doc.getPage(0);
 * for (const obj of page.pageObjects()) {
 *   console.log(obj.type, obj.bounds);
 *   console.log('Fill colour:', obj.fillColour);
 * }
 * ```
 */
export class PDFiumPageObject {
  readonly #ctx: PageObjectContext;
  readonly #handle: PageObjectHandle;
  readonly #type: PageObjectType;
  readonly #bounds: Rect;
  #destroyed = false;

  /** @internal */
  constructor(ctx: PageObjectContext, handle: PageObjectHandle, type: PageObjectType, bounds: Rect) {
    this.#ctx = ctx;
    this.#handle = handle;
    this.#type = type;
    this.#bounds = bounds;
  }

  /** The type of this page object. */
  get type(): PageObjectType {
    return this.#type;
  }

  /** Bounding box in page coordinates (points, origin at bottom-left). */
  get bounds(): Rect {
    return this.#bounds;
  }

  /** Get the fill colour of this page object. */
  get fillColour(): Colour | null {
    this.ensureValid();
    return Objects.pageObjGetFillColour(this.#ctx.module, this.#ctx.memory, this.#handle);
  }

  /** Get the stroke colour of this page object. */
  get strokeColour(): Colour | null {
    this.ensureValid();
    return Objects.pageObjGetStrokeColour(this.#ctx.module, this.#ctx.memory, this.#handle);
  }

  /** Get the stroke width of this page object. */
  get strokeWidth(): number | null {
    this.ensureValid();
    return Objects.pageObjGetStrokeWidth(this.#ctx.module, this.#ctx.memory, this.#handle);
  }

  /** Get the transformation matrix of this page object. */
  get matrix(): TransformMatrix | null {
    this.ensureValid();
    return Objects.pageObjGetMatrix(this.#ctx.module, this.#ctx.memory, this.#handle);
  }

  /** Set the transformation matrix of this page object. */
  setMatrix(matrix: TransformMatrix): boolean {
    this.ensureValid();
    return Objects.pageObjSetMatrix(this.#ctx.module, this.#ctx.memory, this.#handle, matrix);
  }

  /** Get the line cap style of this page object. */
  get lineCap(): LineCapStyle {
    this.ensureValid();
    return Objects.pageObjGetLineCap(this.#ctx.module, this.#handle);
  }

  /** Set the line cap style of this page object. */
  setLineCap(lineCap: LineCapStyle): boolean {
    this.ensureValid();
    return Objects.pageObjSetLineCap(this.#ctx.module, this.#handle, lineCap);
  }

  /** Get the line join style of this page object. */
  get lineJoin(): LineJoinStyle {
    this.ensureValid();
    return Objects.pageObjGetLineJoin(this.#ctx.module, this.#handle);
  }

  /** Set the line join style of this page object. */
  setLineJoin(lineJoin: LineJoinStyle): boolean {
    this.ensureValid();
    return Objects.pageObjSetLineJoin(this.#ctx.module, this.#handle, lineJoin);
  }

  /** Get the dash pattern of this page object. */
  get dashPattern(): DashPattern | null {
    this.ensureValid();
    return Objects.pageObjGetDashPattern(this.#ctx.module, this.#ctx.memory, this.#handle);
  }

  /** Set the dash pattern of this page object. */
  setDashPattern(pattern: DashPattern): boolean {
    this.ensureValid();
    return Objects.pageObjSetDashPattern(this.#ctx.module, this.#ctx.memory, this.#handle, pattern);
  }

  /** Set the dash phase of this page object. */
  setDashPhase(phase: number): boolean {
    this.ensureValid();
    return Objects.pageObjSetDashPhase(this.#ctx.module, this.#handle, phase);
  }

  /** Check if this page object has transparency. */
  get hasTransparency(): boolean {
    this.ensureValid();
    return Objects.pageObjHasTransparency(this.#ctx.module, this.#handle);
  }

  /** Set the blend mode of this page object. */
  setBlendMode(blendMode: BlendMode): void {
    this.ensureValid();
    Objects.pageObjSetBlendMode(this.#ctx.module, this.#ctx.memory, this.#handle, blendMode);
  }

  /** Get the rotated bounding box of this page object as quad points. */
  get rotatedBounds(): QuadPoints | null {
    this.ensureValid();
    return Objects.pageObjGetRotatedBounds(this.#ctx.module, this.#ctx.memory, this.#handle);
  }

  /** Whether this page object has a clip path applied. */
  get hasClipPath(): boolean {
    this.ensureValid();
    return Objects.pageObjGetClipPath(this.#ctx.module, this.#handle) !== null;
  }

  /** Transform the clip path of this page object. */
  transformClipPath(matrix: TransformMatrix): void {
    this.ensureValid();
    Objects.pageObjTransformClipPath(
      this.#ctx.module,
      this.#handle,
      matrix.a,
      matrix.b,
      matrix.c,
      matrix.d,
      matrix.e,
      matrix.f,
    );
  }

  /**
   * Destroy this page object and free its underlying resources.
   *
   * Page objects are borrowed views — they do not own the underlying handle
   * and become invalid when the parent page is disposed.
   *
   * Only call this for page objects that have NOT been inserted into a page.
   * Once an object is added to a page via builder methods, it is owned by the
   * page and must not be destroyed manually.
   *
   * After calling `destroy()`, any further access to this object's properties
   * or methods will throw.
   */
  destroy(): void {
    this.ensureValid();
    Objects.pageObjDestroy(this.#ctx.module, this.#handle);
    this.#destroyed = true;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Content Mark Methods
  // ─────────────────────────────────────────────────────────────────────────

  /** Get the number of content marks on this page object. */
  get markCount(): number {
    this.ensureValid();
    return Objects.pageObjCountMarks(this.#ctx.module, this.#handle);
  }

  /**
   * Get a content mark by index.
   *
   * @param index - Zero-based mark index
   * @returns The mark information, or null if not found
   */
  getMark(index: number): PageObjectMark | null {
    this.ensureValid();

    const markHandle = Objects.pageObjGetMark(this.#ctx.module, this.#handle, index);
    if (markHandle === null) {
      return null;
    }

    const name = Objects.pageObjMarkGetName(this.#ctx.module, this.#ctx.memory, markHandle) ?? '';
    const params = this.#ctx.getMarkParams(markHandle);
    return { name, params };
  }

  /** Get all content marks from this page object. */
  get marks(): PageObjectMark[] {
    this.ensureValid();
    const count = this.markCount;
    const marks: PageObjectMark[] = [];
    for (let i = 0; i < count; i++) {
      const mark = this.getMark(i);
      if (mark !== null) {
        marks.push(mark);
      }
    }
    return marks;
  }

  /**
   * Add a content mark to this page object.
   *
   * @param name - The mark name (e.g., 'Artifact', 'Span')
   * @returns The mark data, or null if failed
   */
  addMark(name: string): PageObjectMark | null {
    this.ensureValid();
    const markHandle = Objects.pageObjAddMark(this.#ctx.module, this.#ctx.memory, this.#handle, name);
    if (markHandle === null) {
      return null;
    }
    const params = this.#ctx.getMarkParams(markHandle);
    return { name, params };
  }

  /**
   * Remove a content mark from this page object by index.
   *
   * @param index - Zero-based mark index
   * @returns True if successful
   */
  removeMark(index: number): boolean {
    this.ensureValid();
    const markHandle = Objects.pageObjGetMark(this.#ctx.module, this.#handle, index);
    if (markHandle === null) {
      return false;
    }
    return Objects.pageObjRemoveMark(this.#ctx.module, this.#handle, markHandle);
  }

  /**
   * Internal access for handle-based methods.
   *
   * @internal
   */
  get [INTERNAL](): { handle: PageObjectHandle } {
    return { handle: this.#handle };
  }

  /** @internal */
  protected get _ctx(): PageObjectContext {
    return this.#ctx;
  }

  /** @internal */
  protected get _handle(): PageObjectHandle {
    return this.#handle;
  }

  /** @internal */
  protected ensureValid(): void {
    if (this.#destroyed) {
      throw new PageError(PDFiumErrorCode.OBJECT_ACCESS_FAILED, 'Page object has been destroyed');
    }
    this.#ctx.ensurePageValid();
  }
}

/**
 * Text object on a PDF page.
 *
 * Provides access to text content, font size, render mode, and font information.
 *
 * @example
 * ```typescript
 * for (const obj of page.objects()) {
 *   if (obj instanceof PDFiumTextObject) {
 *     console.log(obj.text, obj.fontSize);
 *     using font = obj.getFont();
 *     if (font) console.log(font.familyName);
 *   }
 * }
 * ```
 */
export class PDFiumTextObject extends PDFiumPageObject {
  readonly #text: string;
  readonly #fontSize: number;

  /** @internal */
  constructor(ctx: PageObjectContext, handle: PageObjectHandle, bounds: Rect, text: string, fontSize: number) {
    super(ctx, handle, PageObjectType.Text, bounds);
    this.#text = text;
    this.#fontSize = fontSize;
  }

  /** The text content. */
  get text(): string {
    return this.#text;
  }

  /** Font size in points. */
  get fontSize(): number {
    return this.#fontSize;
  }

  /** Get the text render mode. */
  get renderMode(): TextRenderMode | null {
    this.ensureValid();
    return fromNative(textRenderModeMap.fromNative, Objects.textObjGetRenderMode(this._ctx.module, this._handle), null);
  }

  /** Set the text render mode. */
  setRenderMode(mode: TextRenderMode): boolean {
    this.ensureValid();
    return Objects.textObjSetRenderMode(this._ctx.module, this._handle, toNative(textRenderModeMap.toNative, mode));
  }

  /**
   * Get the font of this text object.
   *
   * Returns a PDFiumFont that retains the parent page's native resources.
   * Dispose the font when done (or use the `using` keyword).
   */
  getFont(): PDFiumFont | null {
    this.ensureValid();
    return this._ctx.getFont(this._handle);
  }
}

/**
 * Image object on a PDF page.
 *
 * Provides access to image data, dimensions, and metadata.
 */
export class PDFiumImageObject extends PDFiumPageObject {
  readonly #width: number;
  readonly #height: number;

  /** @internal */
  constructor(ctx: PageObjectContext, handle: PageObjectHandle, bounds: Rect, width: number, height: number) {
    super(ctx, handle, PageObjectType.Image, bounds);
    this.#width = width;
    this.#height = height;
  }

  /** Image width in pixels. */
  get width(): number {
    return this.#width;
  }

  /** Image height in pixels. */
  get height(): number {
    return this.#height;
  }

  /** Get the decoded image data. */
  getDecodedData(): Uint8Array | null {
    this.ensureValid();
    return Images.imageObjGetDecodedData(this._ctx.module, this._ctx.memory, this._handle);
  }

  /** Get the raw image data. */
  getRawData(): Uint8Array | null {
    this.ensureValid();
    return Images.imageObjGetRawData(this._ctx.module, this._ctx.memory, this._handle);
  }

  /** Get image metadata (colour space, dimensions, bits per pixel, etc.). */
  getMetadata(): ImageMetadata | null {
    this.ensureValid();
    return this._ctx.getImageMetadata(this._handle);
  }

  /**
   * Set the transformation matrix for this image object.
   *
   * Overrides the base class to use the image-specific PDFium function
   * (`FPDFImageObj_SetMatrix`) instead of the generic `FPDFPageObj_SetMatrix`.
   */
  override setMatrix(matrix: TransformMatrix): boolean {
    this.ensureValid();
    return Images.imageObjSetMatrix(
      this._ctx.module,
      this._handle,
      matrix.a,
      matrix.b,
      matrix.c,
      matrix.d,
      matrix.e,
      matrix.f,
    );
  }

  /**
   * Internal access for handle-based methods.
   *
   * @internal
   */
  override get [INTERNAL](): { handle: PageObjectHandle; setBitmap: (bitmap: BitmapHandle) => boolean } {
    return {
      handle: this._handle,
      setBitmap: (bitmap: BitmapHandle) => {
        this.ensureValid();
        return Images.imageObjSetBitmap(this._ctx.module, this._handle, bitmap);
      },
    };
  }
}

/**
 * A segment of a PDF path object.
 *
 * Represents a single command (move, line, bezier, close) in a path.
 */
export class PDFiumPathSegment {
  readonly #module: PDFiumWASM;
  readonly #memory: WASMMemoryManager;
  readonly #handle: PathSegmentHandle;

  /** @internal */
  constructor(module: PDFiumWASM, memory: WASMMemoryManager, handle: PathSegmentHandle) {
    this.#module = module;
    this.#memory = memory;
    this.#handle = handle;
  }

  /** Get the point coordinates of this segment. */
  get point(): Point | null {
    return Objects.pathSegmentGetPoint(this.#module, this.#memory, this.#handle);
  }

  /** Get the type of this segment (move, line, bezier). */
  get type(): PathSegmentType {
    return Objects.pathSegmentGetType(this.#module, this.#handle);
  }

  /** Whether this segment closes the current subpath. */
  get isClosing(): boolean {
    return Objects.pathSegmentGetClose(this.#module, this.#handle);
  }
}

/**
 * Path object on a PDF page.
 *
 * Provides methods for constructing and querying paths (moves, lines, bezier curves).
 */
export class PDFiumPathObject extends PDFiumPageObject {
  /** Move the current point to the specified coordinates. */
  moveTo(x: number, y: number): boolean {
    this.ensureValid();
    return Objects.pathMoveTo(this._ctx.module, this._handle, x, y);
  }

  /** Add a line segment from the current point to the specified coordinates. */
  lineTo(x: number, y: number): boolean {
    this.ensureValid();
    return Objects.pathLineTo(this._ctx.module, this._handle, x, y);
  }

  /** Add a cubic Bezier curve to the path. */
  bezierTo(x1: number, y1: number, x2: number, y2: number, x3: number, y3: number): boolean {
    this.ensureValid();
    return Objects.pathBezierTo(this._ctx.module, this._handle, x1, y1, x2, y2, x3, y3);
  }

  /** Close the current subpath by connecting the current point to the start point. */
  closePath(): boolean {
    this.ensureValid();
    return Objects.pathClose(this._ctx.module, this._handle);
  }

  /** Set the draw mode for this path. */
  setDrawMode(fillMode: PathFillMode, stroke: boolean): boolean {
    this.ensureValid();
    return Objects.pathSetDrawMode(this._ctx.module, this._handle, fillMode, stroke);
  }

  /** Get the draw mode for this path. */
  getDrawMode(): { fillMode: PathFillMode; stroke: boolean } | null {
    this.ensureValid();
    return Objects.pathGetDrawMode(this._ctx.module, this._ctx.memory, this._handle);
  }

  /** Get the number of segments in this path. */
  get segmentCount(): number {
    this.ensureValid();
    return Objects.pathCountSegments(this._ctx.module, this._handle);
  }

  /**
   * Get a segment from this path at the specified index.
   *
   * @param index - The segment index
   * @returns A path segment, or null on failure
   */
  getSegment(index: number): PDFiumPathSegment | null {
    this.ensureValid();
    const handle = Objects.pathGetSegment(this._ctx.module, this._handle, index);
    if (handle === null) {
      return null;
    }
    return new PDFiumPathSegment(this._ctx.module, this._ctx.memory, handle);
  }
}
