/**
 * Progressive rendering context for PDF pages.
 *
 * @module document/progressive-render
 */

import { Disposable } from '../core/disposable.js';
import { PDFiumErrorCode, RenderError } from '../core/errors.js';
import { ProgressiveRenderStatus, type RenderResult } from '../core/types.js';
import { NULL_BITMAP } from '../internal/constants.js';
import type { BitmapHandle, PageHandle } from '../internal/handles.js';
import { convertBgraToRgba } from '../internal/pixel-conversion.js';
import type { WASMAllocation } from '../wasm/allocation.js';
import { NativeHandle } from '../wasm/allocation.js';
import type { PDFiumWASM } from '../wasm/bindings/index.js';
import { NULL_PTR, type WASMMemoryManager } from '../wasm/memory.js';

/**
 * Context for progressive PDF page rendering.
 *
 * Owns the bitmap and buffer resources for the lifetime of the render.
 * Implements `Symbol.dispose` for ES2024 `using` keyword support.
 *
 * @example
 * ```typescript
 * using render = page.startProgressiveRender({ scale: 2 });
 *
 * while (render.status === ProgressiveRenderStatus.ToBeContinued) {
 *   render.continue();
 *   await scheduler.yield();
 * }
 *
 * if (render.status === ProgressiveRenderStatus.Done) {
 *   const result = render.getResult();
 * }
 * ```
 */
export class ProgressiveRenderContext extends Disposable {
  readonly #module: PDFiumWASM;
  readonly #memory: WASMMemoryManager;
  readonly #pageHandle: PageHandle;
  readonly #bufferAllocation: WASMAllocation;
  readonly #bitmapHandle: NativeHandle<BitmapHandle>;
  readonly #release: () => void;
  readonly #width: number;
  readonly #height: number;
  readonly #originalWidth: number;
  readonly #originalHeight: number;
  #status: ProgressiveRenderStatus;

  /** @internal */
  constructor(
    module: PDFiumWASM,
    memory: WASMMemoryManager,
    pageHandle: PageHandle,
    bufferAllocation: WASMAllocation,
    bitmapHandle: NativeHandle<BitmapHandle>,
    retain: () => void,
    release: () => void,
    width: number,
    height: number,
    originalWidth: number,
    originalHeight: number,
    initialStatus: ProgressiveRenderStatus,
  ) {
    super('ProgressiveRenderContext', PDFiumErrorCode.RESOURCE_DISPOSED);
    this.#module = module;
    this.#memory = memory;
    this.#pageHandle = pageHandle;
    this.#bufferAllocation = bufferAllocation;
    this.#bitmapHandle = bitmapHandle;
    this.#release = release;
    this.#width = width;
    this.#height = height;
    this.#originalWidth = originalWidth;
    this.#originalHeight = originalHeight;
    this.#status = initialStatus;

    retain();
    this.setFinalizerCleanup(() => this.#cleanupResources());
  }

  /** Current render status. */
  get status(): ProgressiveRenderStatus {
    return this.#status;
  }

  /** Rendered width in pixels. */
  get width(): number {
    return this.#width;
  }

  /** Rendered height in pixels. */
  get height(): number {
    return this.#height;
  }

  /**
   * Continue the progressive render.
   *
   * Call this in a loop while `status` is `ToBeContinued`.
   *
   * @returns The updated render status
   */
  continue(): ProgressiveRenderStatus {
    this.ensureNotDisposed();

    if (this.#status !== ProgressiveRenderStatus.ToBeContinued) {
      return this.#status;
    }

    const fn = this.#module._FPDF_RenderPage_Continue;
    if (typeof fn !== 'function') {
      this.#status = ProgressiveRenderStatus.Failed;
      return this.#status;
    }

    const rawStatus = fn(this.#pageHandle, NULL_PTR);
    this.#status =
      rawStatus >= 0 && rawStatus <= 3 ? (rawStatus as ProgressiveRenderStatus) : ProgressiveRenderStatus.Failed;
    return this.#status;
  }

  /**
   * Get the render result.
   *
   * Only valid when `status` is `Done`. Reads the bitmap buffer and
   * converts BGRA to RGBA format.
   *
   * @returns The rendered pixel data
   * @throws {RenderError} If the render is not complete
   */
  getResult(): RenderResult {
    this.ensureNotDisposed();

    if (this.#status !== ProgressiveRenderStatus.Done) {
      throw new RenderError(
        PDFiumErrorCode.RENDER_FAILED,
        `Cannot get result: status is ${String(this.#status)} (expected Done)`,
      );
    }

    const bufferSize = this.#width * this.#height * 4;
    const bgraData = this.#memory.copyFromWASM(this.#bufferAllocation.ptr, bufferSize);
    const rgbaData = convertBgraToRgba(bgraData, bgraData.length);

    return {
      width: this.#width,
      height: this.#height,
      originalWidth: this.#originalWidth,
      originalHeight: this.#originalHeight,
      data: rgbaData,
    };
  }

  #cleanupResources(): void {
    const closeFn = this.#module._FPDF_RenderPage_Close;
    if (typeof closeFn === 'function') {
      closeFn(this.#pageHandle);
    }
    this.#bitmapHandle[Symbol.dispose]();
    this.#bufferAllocation[Symbol.dispose]();
    this.#release();
  }

  protected disposeInternal(): void {
    this.#cleanupResources();
  }
}

/**
 * Create a ProgressiveRenderContext from page render setup.
 *
 * @internal
 */
export function createProgressiveRenderContext(
  module: PDFiumWASM,
  memory: WASMMemoryManager,
  pageHandle: PageHandle,
  bufferAllocation: WASMAllocation,
  bitmapHandleValue: BitmapHandle,
  retain: () => void,
  release: () => void,
  width: number,
  height: number,
  originalWidth: number,
  originalHeight: number,
  initialStatus: ProgressiveRenderStatus,
): ProgressiveRenderContext {
  const bitmapHandle = new NativeHandle<BitmapHandle>(bitmapHandleValue, (h) => {
    if (h !== (NULL_BITMAP as number)) {
      module._FPDFBitmap_Destroy(h);
    }
  });

  return new ProgressiveRenderContext(
    module,
    memory,
    pageHandle,
    bufferAllocation,
    bitmapHandle,
    retain,
    release,
    width,
    height,
    originalWidth,
    originalHeight,
    initialStatus,
  );
}
