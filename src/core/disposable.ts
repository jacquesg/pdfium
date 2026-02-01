/**
 * Disposable resource management with ES2024 explicit resource management.
 *
 * Provides automatic cleanup of resources using the `using` keyword and
 * Symbol.dispose, with a FinalizationRegistry safety net for forgotten
 * resources.
 *
 * @module core/disposable
 */

import { PDFiumError, PDFiumErrorCode } from './errors.js';

/**
 * Registry to track non-disposed resources and warn developers.
 *
 * When a resource is garbage collected without being disposed, a warning
 * is logged to help identify memory leaks during development.
 */
const disposalRegistry = new FinalizationRegistry<string>((resourceName) => {
  if (__DEV__) {
    console.warn(
      `[PDFium] Resource "${resourceName}" was garbage collected without being disposed. ` +
        'This may cause memory leaks. Use the "using" keyword or call dispose() explicitly.',
    );
  }
});

// Declare the global __DEV__ variable
declare const __DEV__: boolean;

/**
 * Base class for disposable PDFium resources.
 *
 * Provides automatic cleanup support through ES2024's explicit resource
 * management (Symbol.dispose) and a FinalizationRegistry safety net.
 *
 * @example
 * ```typescript
 * // Automatic cleanup with 'using' keyword
 * {
 *   using doc = await pdfium.openDocument(bytes);
 *   // Work with document
 * } // Automatically disposed here
 *
 * // Manual cleanup
 * const doc = await pdfium.openDocument(bytes);
 * try {
 *   // Work with document
 * } finally {
 *   doc.dispose();
 * }
 * ```
 */
export abstract class Disposable implements globalThis.Disposable {
  #disposed = false;
  readonly #resourceName: string;
  readonly #registrationToken: object;

  constructor(resourceName: string) {
    this.#resourceName = resourceName;
    this.#registrationToken = {};
    disposalRegistry.register(this, resourceName, this.#registrationToken);
  }

  /**
   * Whether this resource has been disposed.
   */
  get disposed(): boolean {
    return this.#disposed;
  }

  /**
   * Dispose of this resource, freeing WASM memory.
   *
   * This method is idempotent - calling it multiple times has no effect
   * after the first call.
   *
   * @implements {Symbol.dispose}
   */
  [Symbol.dispose](): void {
    if (this.#disposed) {
      return;
    }
    this.#disposed = true;
    disposalRegistry.unregister(this.#registrationToken);
    this.disposeInternal();
  }

  /**
   * Alias for Symbol.dispose for explicit calls.
   *
   * @example
   * ```typescript
   * document.dispose();
   * ```
   */
  dispose(): void {
    this[Symbol.dispose]();
  }

  /**
   * Override in subclasses to perform actual cleanup.
   *
   * This method is called exactly once when the resource is disposed.
   * Implementations should free all WASM memory and other resources.
   */
  protected abstract disposeInternal(): void;

  /**
   * Throws if this resource has been disposed.
   *
   * Call this at the beginning of any method that requires the resource
   * to be active.
   *
   * @throws {PDFiumError} If the resource has been disposed
   */
  protected ensureNotDisposed(): void {
    if (this.#disposed) {
      throw new PDFiumError(
        PDFiumErrorCode.DOC_ALREADY_CLOSED,
        `Cannot use ${this.#resourceName} after it has been disposed`,
      );
    }
  }

  /**
   * Gets the resource name for debugging purposes.
   */
  protected get resourceName(): string {
    return this.#resourceName;
  }
}

/**
 * Base class for async disposable PDFium resources.
 *
 * Use this when disposal requires async operations, such as
 * communicating with a worker thread.
 *
 * @example
 * ```typescript
 * {
 *   await using worker = await PDFiumWorker.create();
 *   // Work with worker
 * } // Automatically disposed here
 * ```
 */
export abstract class AsyncDisposable implements globalThis.AsyncDisposable {
  #disposed = false;
  readonly #resourceName: string;
  readonly #registrationToken: object;

  constructor(resourceName: string) {
    this.#resourceName = resourceName;
    this.#registrationToken = {};
    disposalRegistry.register(this, resourceName, this.#registrationToken);
  }

  /**
   * Whether this resource has been disposed.
   */
  get disposed(): boolean {
    return this.#disposed;
  }

  /**
   * Asynchronously dispose of this resource.
   *
   * @implements {Symbol.asyncDispose}
   */
  async [Symbol.asyncDispose](): Promise<void> {
    if (this.#disposed) {
      return;
    }
    this.#disposed = true;
    disposalRegistry.unregister(this.#registrationToken);
    await this.disposeInternalAsync();
  }

  /**
   * Alias for Symbol.asyncDispose for explicit calls.
   */
  async dispose(): Promise<void> {
    await this[Symbol.asyncDispose]();
  }

  /**
   * Override in subclasses to perform actual async cleanup.
   */
  protected abstract disposeInternalAsync(): Promise<void>;

  /**
   * Throws if this resource has been disposed.
   */
  protected ensureNotDisposed(): void {
    if (this.#disposed) {
      throw new PDFiumError(
        PDFiumErrorCode.DOC_ALREADY_CLOSED,
        `Cannot use ${this.#resourceName} after it has been disposed`,
      );
    }
  }

  /**
   * Gets the resource name for debugging purposes.
   */
  protected get resourceName(): string {
    return this.#resourceName;
  }
}
