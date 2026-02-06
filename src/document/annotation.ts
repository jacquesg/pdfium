/**
 * PDF annotation wrapper.
 *
 * Provides a type-safe, disposable wrapper around an open PDFium annotation
 * handle. The annotation retains the parent page's native resources for as
 * long as it is alive — dispose the annotation when you are done to allow
 * the page to release its native memory.
 *
 * @module document/annotation
 */

import { Disposable } from '../core/disposable.js';
import { PDFiumErrorCode } from '../core/errors.js';
import {
  type Annotation,
  type AnnotationAppearanceMode,
  type AnnotationBorder,
  type AnnotationColourType,
  type AnnotationFlags,
  AnnotationType,
  type Colour,
  type DictionaryKey,
  FormFieldFlags,
  FormFieldType,
  type LinePoints,
  type PDFLink,
  type Point,
  type QuadPoints,
  type Rect,
  type WidgetOption,
} from '../core/types.js';
import { NULL_FORM, NULL_LINK, SIZEOF_FLOAT, SIZEOF_FS_POINTF, SIZEOF_FS_QUADPOINTSF } from '../internal/constants.js';
import {
  annotationAppearanceModeMap,
  annotationTypeMap,
  formFieldTypeMap,
  fromNative,
  toBitflags,
  toNative,
} from '../internal/enum-maps.js';
import type { AnnotationHandle, FormHandle, LinkHandle, PageHandle } from '../internal/handles.js';
import { INTERNAL } from '../internal/symbols.js';
import type { PDFiumWASM } from '../wasm/bindings/index.js';
import { encodeUTF16LE, NULL_PTR, ptrOffset, textEncoder, type WASMMemoryManager } from '../wasm/memory.js';
import { FSRectF } from '../wasm/structs.js';
import { getWasmStringUTF16LE } from '../wasm/utils.js';
import type { PDFiumPageObject } from './page-object.js';

/**
 * Context required to construct a PDFiumAnnotation.
 *
 * @internal
 */
export interface AnnotationContext {
  readonly module: PDFiumWASM;
  readonly memory: WASMMemoryManager;
  readonly pageHandle: PageHandle;
  readonly formHandle: FormHandle;
  readonly buildLink: (handle: LinkHandle) => PDFLink | null;
}

/**
 * Represents an annotation on a PDF page.
 *
 * The annotation holds an open native handle and a borrow on the parent
 * page's native resources. Dispose the annotation (or use the `using`
 * keyword) to close the handle and release the borrow.
 *
 * @example
 * ```typescript
 * using annot = page.getAnnotation(0);
 * console.log(annot.type, annot.getRect());
 *
 * annot.setColour({ r: 255, g: 0, b: 0, a: 255 });
 * annot.setStringValue('Contents', 'Updated note');
 * ```
 *
 * **Design convention:** Getters are used for cheap, cached, or always-available
 * properties (e.g. `type`, `bounds`). Methods are used for fallible, parameterised,
 * or WASM-allocating operations (e.g. `getColour()`, `setRect()`).
 */

const COLOUR_TYPE_NATIVE: Readonly<Record<AnnotationColourType, number>> = { stroke: 0, interior: 1 };

export class PDFiumAnnotation extends Disposable implements Annotation {
  readonly #ctx: AnnotationContext;
  readonly #handle: AnnotationHandle;
  readonly #release: () => void;
  readonly #index: number;
  #cachedStrokeColour: Colour | null;

  /**
   * Creates a new PDFiumAnnotation.
   *
   * @param ctx - The annotation context (module, memory, page/form handles)
   * @param handle - The open annotation handle
   * @param retain - Callback to retain the parent page's native resources
   * @param release - Callback to release the parent page's native resources
   * @internal
   */
  constructor(ctx: AnnotationContext, handle: AnnotationHandle, retain: () => void, release: () => void) {
    super('PDFiumAnnotation', PDFiumErrorCode.RESOURCE_DISPOSED);
    this.#ctx = ctx;
    this.#handle = handle;
    this.#release = release;
    this.#index = ctx.module._FPDFPage_GetAnnotIndex(ctx.pageHandle, handle);
    this.#cachedStrokeColour = this.#readColour('stroke');

    this.setFinalizerCleanup(release);
    retain();
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Read-Only Properties
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Gets the annotation subtype (e.g. Text, Highlight, Ink, Link).
   */
  get type(): AnnotationType {
    this.ensureNotDisposed();
    const raw = this.#ctx.module._FPDFAnnot_GetSubtype(this.#handle);
    return fromNative(annotationTypeMap.fromNative, raw, AnnotationType.Unknown);
  }

  /**
   * Gets the bounding rectangle of this annotation.
   *
   * Returns a zero-rect if the annotation has no rectangle set.
   * Use {@link getRect} to distinguish between "no rect" (null) and a valid rect.
   *
   * This getter satisfies the `Annotation` interface.
   */
  get bounds(): Rect {
    return this.getRect() ?? { left: 0, top: 0, right: 0, bottom: 0 };
  }

  /**
   * Gets the stroke colour of this annotation, if set.
   *
   * This value is cached at construction time and invalidated by {@link setColour}.
   *
   * This getter satisfies the `Annotation` interface.
   */
  get colour(): Colour | null {
    return this.#cachedStrokeColour;
  }

  /**
   * Gets the zero-based index of this annotation on its page.
   *
   * This value is cached at construction time.
   */
  get index(): number {
    return this.#index;
  }

  /**
   * Internal access for handle-based methods.
   *
   * @internal
   */
  get [INTERNAL](): { handle: AnnotationHandle } {
    this.ensureNotDisposed();
    return { handle: this.#handle };
  }

  /**
   * Gets the number of page objects in this annotation.
   *
   * Only ink and stamp annotations typically have objects.
   */
  get objectCount(): number {
    this.ensureNotDisposed();
    return this.#ctx.module._FPDFAnnot_GetObjectCount(this.#handle);
  }

  /**
   * Gets the annotation flags.
   */
  get flags(): AnnotationFlags {
    this.ensureNotDisposed();
    return toBitflags<AnnotationFlags>(this.#ctx.module._FPDFAnnot_GetFlags(this.#handle));
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Rect
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Gets the bounding rectangle of this annotation.
   *
   * @returns The bounding rectangle, or null if not available
   */
  getRect(): Rect | null {
    this.ensureNotDisposed();
    using rect = new FSRectF(this.#ctx.memory);
    const success = this.#ctx.module._FPDFAnnot_GetRect(this.#handle, rect.ptr);
    if (!success) {
      return null;
    }
    return { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom };
  }

  /**
   * Sets the bounding rectangle of this annotation.
   *
   * @param bounds - The new bounding rectangle
   * @returns True if successful
   */
  setRect(bounds: Rect): boolean {
    this.ensureNotDisposed();
    using rect = new FSRectF(this.#ctx.memory);
    rect.left = bounds.left;
    rect.top = bounds.top;
    rect.right = bounds.right;
    rect.bottom = bounds.bottom;
    return this.#ctx.module._FPDFAnnot_SetRect(this.#handle, rect.ptr) !== 0;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Colour
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Gets the colour of this annotation.
   *
   * @param colourType - Which colour channel: `'stroke'` (default) or `'interior'`
   * @returns The colour, or null if not available
   */
  getColour(colourType: AnnotationColourType = 'stroke'): Colour | null {
    this.ensureNotDisposed();
    return this.#readColour(colourType);
  }

  #readColour(colourType: AnnotationColourType): Colour | null {
    using colourBuf = this.#ctx.memory.alloc(4 * SIZEOF_FLOAT);
    const rPtr = colourBuf.ptr;
    const gPtr = ptrOffset(colourBuf.ptr, 4);
    const bPtr = ptrOffset(colourBuf.ptr, 8);
    const aPtr = ptrOffset(colourBuf.ptr, 12);

    const success = this.#ctx.module._FPDFAnnot_GetColor(
      this.#handle,
      COLOUR_TYPE_NATIVE[colourType],
      rPtr,
      gPtr,
      bPtr,
      aPtr,
    );
    if (!success) {
      return null;
    }

    return {
      r: this.#ctx.memory.readInt32(rPtr),
      g: this.#ctx.memory.readInt32(gPtr),
      b: this.#ctx.memory.readInt32(bPtr),
      a: this.#ctx.memory.readInt32(aPtr),
    };
  }

  /**
   * Sets the colour of this annotation.
   *
   * @param colour - The colour to set
   * @param colourType - Which colour channel: `'stroke'` (default) or `'interior'`
   * @returns True if successful
   */
  setColour(colour: Colour, colourType: AnnotationColourType = 'stroke'): boolean {
    this.ensureNotDisposed();
    const success =
      this.#ctx.module._FPDFAnnot_SetColor(
        this.#handle,
        COLOUR_TYPE_NATIVE[colourType],
        colour.r,
        colour.g,
        colour.b,
        colour.a,
      ) !== 0;

    if (success && colourType === 'stroke') {
      this.#cachedStrokeColour = colour;
    }

    return success;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Flags
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Sets the flags of this annotation.
   *
   * @param flags - The annotation flags to set
   * @returns True if successful
   */
  setFlags(flags: AnnotationFlags): boolean {
    this.ensureNotDisposed();
    return this.#ctx.module._FPDFAnnot_SetFlags(this.#handle, flags) !== 0;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Dictionary Key/Value
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Checks if this annotation has a specific key in its dictionary.
   *
   * @param key - The key name to check
   * @returns True if the key exists
   */
  hasKey(key: DictionaryKey): boolean {
    this.ensureNotDisposed();
    const keyBytes = textEncoder.encode(`${key}\0`);
    using keyBuffer = this.#ctx.memory.alloc(keyBytes.length);
    this.#ctx.memory.heapU8.set(keyBytes, keyBuffer.ptr);
    return this.#ctx.module._FPDFAnnot_HasKey(this.#handle, keyBuffer.ptr) !== 0;
  }

  /**
   * Gets a string value from this annotation's dictionary.
   *
   * @param key - The dictionary key
   * @returns The string value, or undefined if not available
   */
  getStringValue(key: DictionaryKey): string | undefined {
    this.ensureNotDisposed();
    using keyBuffer = this.#ctx.memory.allocString(key);
    return getWasmStringUTF16LE(this.#ctx.memory, (buf, len) =>
      this.#ctx.module._FPDFAnnot_GetStringValue(this.#handle, keyBuffer.ptr, buf, len),
    );
  }

  /**
   * Sets a string value in this annotation's dictionary.
   *
   * @param key - The dictionary key
   * @param value - The string value to set
   * @returns True if successful
   */
  setStringValue(key: DictionaryKey, value: string): boolean {
    this.ensureNotDisposed();
    const keyBytes = textEncoder.encode(`${key}\0`);
    using keyBuffer = this.#ctx.memory.alloc(keyBytes.length);
    this.#ctx.memory.heapU8.set(keyBytes, keyBuffer.ptr);

    const valueBytes = encodeUTF16LE(value);
    using valueBuffer = this.#ctx.memory.allocFrom(valueBytes);
    return this.#ctx.module._FPDFAnnot_SetStringValue(this.#handle, keyBuffer.ptr, valueBuffer.ptr) !== 0;
  }

  /** The 'Contents' dictionary value (e.g. text body of a note). */
  get contents(): string | undefined {
    return this.getStringValue('Contents');
  }

  set contents(value: string) {
    this.setStringValue('Contents', value);
  }

  /** The author ('T' key) of this annotation. */
  get author(): string | undefined {
    return this.getStringValue('T');
  }

  set author(value: string) {
    this.setStringValue('T', value);
  }

  /** The subject of this annotation. */
  get subject(): string | undefined {
    return this.getStringValue('Subject');
  }

  set subject(value: string) {
    this.setStringValue('Subject', value);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Border
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Gets the border properties of this annotation.
   *
   * @returns Border properties, or null if not available
   */
  getBorder(): AnnotationBorder | null {
    this.ensureNotDisposed();
    using borderBuf = this.#ctx.memory.alloc(3 * SIZEOF_FLOAT);
    const hRadiusPtr = borderBuf.ptr;
    const vRadiusPtr = ptrOffset(borderBuf.ptr, SIZEOF_FLOAT);
    const widthPtr = ptrOffset(borderBuf.ptr, 2 * SIZEOF_FLOAT);

    const success = this.#ctx.module._FPDFAnnot_GetBorder(this.#handle, hRadiusPtr, vRadiusPtr, widthPtr);
    if (!success) {
      return null;
    }

    return {
      horizontalRadius: this.#ctx.memory.readFloat32(borderBuf.ptr),
      verticalRadius: this.#ctx.memory.readFloat32(ptrOffset(borderBuf.ptr, 4)),
      borderWidth: this.#ctx.memory.readFloat32(ptrOffset(borderBuf.ptr, 8)),
    };
  }

  /**
   * Sets the border of this annotation.
   *
   * @param border - The border properties
   * @returns True if successful
   */
  setBorder(border: AnnotationBorder): boolean {
    this.ensureNotDisposed();
    return (
      this.#ctx.module._FPDFAnnot_SetBorder(
        this.#handle,
        border.horizontalRadius,
        border.verticalRadius,
        border.borderWidth,
      ) !== 0
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Appearance
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Gets the appearance stream of this annotation.
   *
   * @param mode - The appearance mode to retrieve
   * @returns The appearance stream string, or undefined if not available
   */
  getAppearance(mode: AnnotationAppearanceMode): string | undefined {
    this.ensureNotDisposed();
    const nativeMode = toNative(annotationAppearanceModeMap.toNative, mode);
    return getWasmStringUTF16LE(this.#ctx.memory, (buf, len) =>
      this.#ctx.module._FPDFAnnot_GetAP(this.#handle, nativeMode, buf, len),
    );
  }

  /**
   * Sets the appearance stream of this annotation.
   *
   * @param mode - The appearance mode to set
   * @param value - The appearance stream value, or undefined to remove
   * @returns True if successful
   */
  setAppearance(mode: AnnotationAppearanceMode, value: string | undefined): boolean {
    this.ensureNotDisposed();
    const nativeMode = toNative(annotationAppearanceModeMap.toNative, mode);

    if (value === undefined) {
      return this.#ctx.module._FPDFAnnot_SetAP(this.#handle, nativeMode, NULL_PTR) !== 0;
    }

    const valueBytes = encodeUTF16LE(value);
    using valueBuffer = this.#ctx.memory.allocFrom(valueBytes);
    return this.#ctx.module._FPDFAnnot_SetAP(this.#handle, nativeMode, valueBuffer.ptr) !== 0;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Line
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Gets the line endpoints for a line annotation.
   *
   * @returns Line endpoints, or null if not a line annotation
   */
  getLine(): LinePoints | null {
    this.ensureNotDisposed();

    if (this.type !== AnnotationType.Line) {
      return null;
    }

    using lineBuf = this.#ctx.memory.alloc(16);
    const startXPtr = lineBuf.ptr;
    const startYPtr = ptrOffset(lineBuf.ptr, 4);
    const endXPtr = ptrOffset(lineBuf.ptr, 8);
    const endYPtr = ptrOffset(lineBuf.ptr, 12);

    const success = this.#ctx.module._FPDFAnnot_GetLine(this.#handle, startXPtr, startYPtr, endXPtr, endYPtr);
    if (!success) {
      return null;
    }

    return {
      startX: this.#ctx.memory.readFloat32(lineBuf.ptr),
      startY: this.#ctx.memory.readFloat32(ptrOffset(lineBuf.ptr, 4)),
      endX: this.#ctx.memory.readFloat32(ptrOffset(lineBuf.ptr, 8)),
      endY: this.#ctx.memory.readFloat32(ptrOffset(lineBuf.ptr, 12)),
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Vertices
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Gets the vertices of a polygon or polyline annotation.
   *
   * @returns Array of points, or null if not a polygon/polyline annotation
   */
  getVertices(): Point[] | null {
    this.ensureNotDisposed();

    const count = this.#ctx.module._FPDFAnnot_GetVertices(this.#handle, NULL_PTR, 0);
    if (count <= 0) {
      return null;
    }

    using vertexBuf = this.#ctx.memory.alloc(count * SIZEOF_FS_POINTF);
    const written = this.#ctx.module._FPDFAnnot_GetVertices(this.#handle, vertexBuf.ptr, count);
    if (written <= 0) {
      return null;
    }

    const points = new Array<Point>(written);
    for (let i = 0; i < written; i++) {
      const offset = i * SIZEOF_FS_POINTF;
      const x = this.#ctx.memory.readFloat32(ptrOffset(vertexBuf.ptr, offset));
      const y = this.#ctx.memory.readFloat32(ptrOffset(vertexBuf.ptr, offset + 4));
      points[i] = { x, y };
    }

    return points;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Ink
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Gets the number of ink paths in this ink annotation.
   */
  get inkPathCount(): number {
    this.ensureNotDisposed();
    return this.#ctx.module._FPDFAnnot_GetInkListCount(this.#handle);
  }

  /**
   * Gets the points in an ink path.
   *
   * @param pathIndex - Zero-based path index
   * @returns Array of points, or null if not available
   */
  getInkPath(pathIndex: number): Point[] | null {
    this.ensureNotDisposed();

    const count = this.#ctx.module._FPDFAnnot_GetInkListPath(this.#handle, pathIndex, NULL_PTR, 0);
    if (count <= 0) {
      return null;
    }

    using pointBuf = this.#ctx.memory.alloc(count * SIZEOF_FS_POINTF);
    const written = this.#ctx.module._FPDFAnnot_GetInkListPath(this.#handle, pathIndex, pointBuf.ptr, count);
    if (written <= 0) {
      return null;
    }

    const points = new Array<Point>(written);
    for (let i = 0; i < written; i++) {
      const offset = i * SIZEOF_FS_POINTF;
      const x = this.#ctx.memory.readFloat32(ptrOffset(pointBuf.ptr, offset));
      const y = this.#ctx.memory.readFloat32(ptrOffset(pointBuf.ptr, offset + 4));
      points[i] = { x, y };
    }

    return points;
  }

  /**
   * Adds an ink stroke to this ink annotation.
   *
   * @param points - Array of points defining the ink stroke
   * @returns The index of the added stroke, or -1 on failure
   */
  addInkStroke(points: readonly Point[]): number {
    this.ensureNotDisposed();

    if (points.length === 0) return -1;

    const bufSize = points.length * SIZEOF_FS_POINTF;
    using pointsBuf = this.#ctx.memory.alloc(bufSize);

    for (let i = 0; i < points.length; i++) {
      const point = points[i];
      if (point !== undefined) {
        const offset = i * SIZEOF_FS_POINTF;
        this.#ctx.memory.writeFloat32(ptrOffset(pointsBuf.ptr, offset), point.x);
        this.#ctx.memory.writeFloat32(ptrOffset(pointsBuf.ptr, offset + SIZEOF_FLOAT), point.y);
      }
    }

    return this.#ctx.module._FPDFAnnot_AddInkStroke(this.#handle, pointsBuf.ptr, points.length);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Attachment Points (Quad Points)
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Gets the number of attachment point sets (quad points) for this markup annotation.
   */
  get attachmentPointCount(): number {
    this.ensureNotDisposed();
    return this.#ctx.module._FPDFAnnot_CountAttachmentPoints(this.#handle);
  }

  /**
   * Gets attachment points (quad points) for this markup annotation.
   *
   * @param quadIndex - Zero-based quad points index
   * @returns Quad points, or null if not available
   */
  getAttachmentPoints(quadIndex: number): QuadPoints | null {
    this.ensureNotDisposed();

    using quadBuf = this.#ctx.memory.alloc(SIZEOF_FS_QUADPOINTSF);
    const success = this.#ctx.module._FPDFAnnot_GetAttachmentPoints(this.#handle, quadIndex, quadBuf.ptr);
    if (!success) {
      return null;
    }

    const m = this.#ctx.memory;
    const p = quadBuf.ptr;
    return {
      x1: m.readFloat32(p),
      y1: m.readFloat32(ptrOffset(p, SIZEOF_FLOAT)),
      x2: m.readFloat32(ptrOffset(p, 2 * SIZEOF_FLOAT)),
      y2: m.readFloat32(ptrOffset(p, 3 * SIZEOF_FLOAT)),
      x3: m.readFloat32(ptrOffset(p, 4 * SIZEOF_FLOAT)),
      y3: m.readFloat32(ptrOffset(p, 5 * SIZEOF_FLOAT)),
      x4: m.readFloat32(ptrOffset(p, 6 * SIZEOF_FLOAT)),
      y4: m.readFloat32(ptrOffset(p, 7 * SIZEOF_FLOAT)),
    };
  }

  /**
   * Sets attachment points (quad points) for this markup annotation.
   *
   * @param quadIndex - Zero-based quad points index
   * @param quadPoints - The quad points to set
   * @returns True if successful
   */
  setAttachmentPoints(quadIndex: number, quadPoints: QuadPoints): boolean {
    this.ensureNotDisposed();

    using quadBuf = this.#ctx.memory.alloc(SIZEOF_FS_QUADPOINTSF);
    const m = this.#ctx.memory;
    const p = quadBuf.ptr;
    m.writeFloat32(p, quadPoints.x1);
    m.writeFloat32(ptrOffset(p, SIZEOF_FLOAT), quadPoints.y1);
    m.writeFloat32(ptrOffset(p, 2 * SIZEOF_FLOAT), quadPoints.x2);
    m.writeFloat32(ptrOffset(p, 3 * SIZEOF_FLOAT), quadPoints.y2);
    m.writeFloat32(ptrOffset(p, 4 * SIZEOF_FLOAT), quadPoints.x3);
    m.writeFloat32(ptrOffset(p, 5 * SIZEOF_FLOAT), quadPoints.y3);
    m.writeFloat32(ptrOffset(p, 6 * SIZEOF_FLOAT), quadPoints.x4);
    m.writeFloat32(ptrOffset(p, 7 * SIZEOF_FLOAT), quadPoints.y4);

    return this.#ctx.module._FPDFAnnot_SetAttachmentPoints(this.#handle, quadIndex, quadBuf.ptr) !== 0;
  }

  /**
   * Appends attachment points (quad points) to this markup annotation.
   *
   * @param quadPoints - The quad points to append
   * @returns True if successful
   */
  appendAttachmentPoints(quadPoints: QuadPoints): boolean {
    this.ensureNotDisposed();

    using quadBuf = this.#ctx.memory.alloc(SIZEOF_FS_QUADPOINTSF);
    const m = this.#ctx.memory;
    const p = quadBuf.ptr;
    m.writeFloat32(p, quadPoints.x1);
    m.writeFloat32(ptrOffset(p, SIZEOF_FLOAT), quadPoints.y1);
    m.writeFloat32(ptrOffset(p, 2 * SIZEOF_FLOAT), quadPoints.x2);
    m.writeFloat32(ptrOffset(p, 3 * SIZEOF_FLOAT), quadPoints.y2);
    m.writeFloat32(ptrOffset(p, 4 * SIZEOF_FLOAT), quadPoints.x3);
    m.writeFloat32(ptrOffset(p, 5 * SIZEOF_FLOAT), quadPoints.y3);
    m.writeFloat32(ptrOffset(p, 6 * SIZEOF_FLOAT), quadPoints.x4);
    m.writeFloat32(ptrOffset(p, 7 * SIZEOF_FLOAT), quadPoints.y4);

    return this.#ctx.module._FPDFAnnot_AppendAttachmentPoints(this.#handle, quadBuf.ptr) !== 0;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Page Object Manipulation
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Appends a page object to this annotation.
   *
   * Only ink and stamp annotations support object manipulation.
   *
   * @param object - The page object to append
   * @returns True if successful
   */
  appendObject(object: PDFiumPageObject): boolean {
    this.ensureNotDisposed();
    return this.#ctx.module._FPDFAnnot_AppendObject(this.#handle, object[INTERNAL].handle) !== 0;
  }

  /**
   * Updates a page object in this annotation.
   *
   * The object must already be in the annotation.
   *
   * @param object - The page object to update
   * @returns True if successful
   */
  updateObject(object: PDFiumPageObject): boolean {
    this.ensureNotDisposed();
    return this.#ctx.module._FPDFAnnot_UpdateObject(this.#handle, object[INTERNAL].handle) !== 0;
  }

  /**
   * Removes a page object from this annotation.
   *
   * Only ink and stamp annotations support object manipulation.
   *
   * @param objectIndex - The zero-based index of the object to remove
   * @returns True if successful
   */
  removeObject(objectIndex: number): boolean {
    this.ensureNotDisposed();
    return this.#ctx.module._FPDFAnnot_RemoveObject(this.#handle, objectIndex) !== 0;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Link
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Gets the link associated with this link annotation.
   *
   * @returns The link, or null if not found
   */
  getLink(): PDFLink | null {
    this.ensureNotDisposed();
    const linkHandle = this.#ctx.module._FPDFAnnot_GetLink(this.#handle);
    if (linkHandle === NULL_LINK) return null;
    return this.#ctx.buildLink(linkHandle);
  }

  /**
   * Sets the URI for this link annotation.
   *
   * @param uri - The URI to set
   * @returns True if successful
   */
  setURI(uri: string): boolean {
    this.ensureNotDisposed();
    const uriBytes = textEncoder.encode(`${uri}\0`);
    using uriBuf = this.#ctx.memory.alloc(uriBytes.length);
    this.#ctx.memory.heapU8.set(uriBytes, uriBuf.ptr);
    return this.#ctx.module._FPDFAnnot_SetURI(this.#handle, uriBuf.ptr) !== 0;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Font Size (for free text annotations)
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Gets the font size for a free text annotation.
   *
   * @returns The font size, or null if not available
   */
  getFontSize(): number | null {
    this.ensureNotDisposed();

    if (this.#ctx.formHandle === NULL_FORM) return null;

    using valueBuf = this.#ctx.memory.alloc(4);
    const success = this.#ctx.module._FPDFAnnot_GetFontSize(this.#ctx.formHandle, this.#handle, valueBuf.ptr);
    if (!success) return null;

    return this.#ctx.memory.readFloat32(valueBuf.ptr);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Form Field Operations
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Gets the number of form controls for this form field annotation.
   */
  getFormControlCount(): number {
    this.ensureNotDisposed();
    if (this.#ctx.formHandle === NULL_FORM) return 0;
    return this.#ctx.module._FPDFAnnot_GetFormControlCount(this.#ctx.formHandle, this.#handle);
  }

  /**
   * Gets the form control index for this form field annotation.
   *
   * @returns The form control index, or -1 if not found
   */
  getFormControlIndex(): number {
    this.ensureNotDisposed();

    if (this.#ctx.formHandle === NULL_FORM) {
      return -1;
    }

    return this.#ctx.module._FPDFAnnot_GetFormControlIndex(this.#ctx.formHandle, this.#handle);
  }

  /**
   * Gets the export value of this form field annotation.
   *
   * @returns The export value, or undefined if not available
   */
  getFormFieldExportValue(): string | undefined {
    this.ensureNotDisposed();
    if (this.#ctx.formHandle === NULL_FORM) return undefined;
    return getWasmStringUTF16LE(this.#ctx.memory, (buf, len) =>
      this.#ctx.module._FPDFAnnot_GetFormFieldExportValue(this.#ctx.formHandle, this.#handle, buf, len),
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Form Field Properties
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Returns true if this annotation is a valid form widget (Widget subtype with a known field type).
   */
  isWidget(): boolean {
    return this.type === AnnotationType.Widget && this.getFormFieldType() !== FormFieldType.Unknown;
  }

  /**
   * Gets the form field type for this widget annotation.
   *
   * @returns The form field type, or `FormFieldType.Unknown` if not a widget
   */
  getFormFieldType(): FormFieldType {
    this.ensureNotDisposed();
    if (this.#ctx.formHandle === NULL_FORM) return FormFieldType.Unknown;
    const raw = this.#ctx.module._FPDFAnnot_GetFormFieldType(this.#ctx.formHandle, this.#handle);
    return fromNative(formFieldTypeMap.fromNative, raw, FormFieldType.Unknown);
  }

  /**
   * Gets the form field flags for this widget annotation.
   *
   * @returns The form field flags bitmask, or `FormFieldFlags.None` if not a widget
   */
  getFormFieldFlags(): FormFieldFlags {
    this.ensureNotDisposed();
    if (this.#ctx.formHandle === NULL_FORM) return FormFieldFlags.None;
    return toBitflags<FormFieldFlags>(
      this.#ctx.module._FPDFAnnot_GetFormFieldFlags(this.#ctx.formHandle, this.#handle),
    );
  }

  /**
   * Gets the form field name for this widget annotation.
   *
   * @returns The field name, or undefined if not available
   */
  getFormFieldName(): string | undefined {
    this.ensureNotDisposed();
    if (this.#ctx.formHandle === NULL_FORM) return undefined;
    return getWasmStringUTF16LE(this.#ctx.memory, (buf, len) =>
      this.#ctx.module._FPDFAnnot_GetFormFieldName(this.#ctx.formHandle, this.#handle, buf, len),
    );
  }

  /**
   * Gets the current value of this form field widget annotation.
   *
   * @returns The field value, or undefined if not available
   */
  getFormFieldValue(): string | undefined {
    this.ensureNotDisposed();
    if (this.#ctx.formHandle === NULL_FORM) return undefined;
    return getWasmStringUTF16LE(this.#ctx.memory, (buf, len) =>
      this.#ctx.module._FPDFAnnot_GetFormFieldValue(this.#ctx.formHandle, this.#handle, buf, len),
    );
  }

  /**
   * Gets the alternate (tooltip) name for this form field widget annotation.
   *
   * @returns The alternate name, or undefined if not available
   */
  getFormFieldAlternateName(): string | undefined {
    this.ensureNotDisposed();
    if (this.#ctx.formHandle === NULL_FORM) return undefined;
    return getWasmStringUTF16LE(this.#ctx.memory, (buf, len) =>
      this.#ctx.module._FPDFAnnot_GetFormFieldAlternateName(this.#ctx.formHandle, this.#handle, buf, len),
    );
  }

  /**
   * Gets the options for a combo box or list box widget annotation.
   *
   * @returns Array of options, or undefined if not a combo/list box or no options
   */
  getFormFieldOptions(): WidgetOption[] | undefined {
    this.ensureNotDisposed();
    if (this.#ctx.formHandle === NULL_FORM) return undefined;

    const fieldType = this.getFormFieldType();
    if (fieldType !== FormFieldType.ComboBox && fieldType !== FormFieldType.ListBox) return undefined;

    const count = this.#ctx.module._FPDFAnnot_GetOptionCount(this.#ctx.formHandle, this.#handle);
    if (count <= 0) return undefined;

    const options = new Array<WidgetOption>(count);
    for (let i = 0; i < count; i++) {
      const label = getWasmStringUTF16LE(this.#ctx.memory, (buf, len) =>
        this.#ctx.module._FPDFAnnot_GetOptionLabel(this.#ctx.formHandle, this.#handle, i, buf, len),
      );
      const selected = this.#ctx.module._FPDFAnnot_IsOptionSelected(this.#ctx.formHandle, this.#handle, i) !== 0;
      options[i] = { index: i, label: label ?? '', selected };
    }

    return options;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Focus
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Sets this annotation as the focused annotation in the form.
   *
   * @returns True if successful
   */
  focus(): boolean {
    this.ensureNotDisposed();
    if (this.#ctx.formHandle === NULL_FORM) return false;
    return this.#ctx.module._FORM_SetFocusedAnnot(this.#ctx.formHandle, this.#handle) !== 0;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Disposal
  // ─────────────────────────────────────────────────────────────────────────

  protected disposeInternal(): void {
    this.#ctx.module._FPDFPage_CloseAnnot(this.#handle);
    this.#release();
  }
}
