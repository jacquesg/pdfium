# PLAN.md - @jacquesg/pdfium Library Redesign

## 1. Executive Summary

This document outlines the complete redesign of the PDFium WASM wrapper, transforming `@hyzyla/pdfium` into `@jacquesg/pdfium`. The redesign addresses three critical pain points in the current implementation: manual memory management prone to leaks, opaque error handling without context, and an API that lacks modern TypeScript ergonomics.

The new library will leverage ES2024 features including `Symbol.dispose` for automatic resource cleanup, a lightweight `Result<T, E>` type for explicit error handling, and a transparent worker abstraction that provides the same API regardless of execution context. The target platforms are Node.js 22 LTS and modern browsers, with ESM-only distribution built using tsup.

---

## 2. Architecture Overview

### 2.1 Module Structure Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           @jacquesg/pdfium                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────────────────┐│
│  │   Public     │     │   Context    │     │        Document          ││
│  │    API       │────▶│  Abstraction │────▶│        Layer             ││
│  │              │     │              │     │                          ││
│  │ PDFium.init()│     │ MainThread   │     │ PDFiumDocument           ││
│  │              │     │ Worker       │     │ PDFiumPage               ││
│  └──────────────┘     └──────────────┘     │ PDFiumObject             ││
│         │                    │             └──────────────────────────┘│
│         │                    │                         │               │
│         ▼                    ▼                         ▼               │
│  ┌──────────────────────────────────────────────────────────────────┐ │
│  │                         Core Layer                                │ │
│  │                                                                   │ │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐               │ │
│  │  │   Result    │  │   Errors    │  │ Disposable  │               │ │
│  │  │   <T, E>    │  │  Hierarchy  │  │   Pattern   │               │ │
│  │  └─────────────┘  └─────────────┘  └─────────────┘               │ │
│  └──────────────────────────────────────────────────────────────────┘ │
│                                │                                       │
│                                ▼                                       │
│  ┌──────────────────────────────────────────────────────────────────┐ │
│  │                        WASM Layer                                 │ │
│  │                                                                   │ │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐               │ │
│  │  │  Bindings   │  │   Memory    │  │   Loader    │               │ │
│  │  │  (typed)    │  │   Manager   │  │ (universal) │               │ │
│  │  └─────────────┘  └─────────────┘  └─────────────┘               │ │
│  │                          │                                        │ │
│  │                          ▼                                        │ │
│  │                   ┌─────────────┐                                 │ │
│  │                   │ pdfium.wasm │                                 │ │
│  │                   └─────────────┘                                 │ │
│  └──────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Directory Structure

```
src/
├── core/
│   ├── result.ts              # Result<T, E> implementation
│   ├── errors.ts              # Error hierarchy and codes
│   ├── disposable.ts          # Disposable base class, FinalizationRegistry
│   └── types.ts               # Shared type definitions
├── wasm/
│   ├── bindings.ts            # Type-safe PDFium WASM bindings
│   ├── memory.ts              # Memory allocation/deallocation utilities
│   ├── loader.ts              # Universal WASM loader (Browser/Node)
│   └── vendor/
│       ├── pdfium.wasm        # PDFium WASM binary
│       └── pdfium.d.ts        # WASM type definitions
├── context/
│   ├── interface.ts           # IPDFiumContext interface
│   ├── main-thread.ts         # Direct WASM execution context
│   ├── worker-proxy.ts        # Worker communication proxy
│   └── worker-script.ts       # Worker entry point
├── document/
│   ├── document.ts            # PDFiumDocument class
│   ├── page.ts                # PDFiumPage class
│   ├── form.ts                # Form field handling
│   └── objects/
│       ├── base.ts            # PDFiumObject base class
│       ├── text.ts            # PDFiumTextObject
│       ├── image.ts           # PDFiumImageObject
│       ├── path.ts            # PDFiumPathObject
│       ├── shading.ts         # PDFiumShadingObject
│       └── form.ts            # PDFiumFormObject
├── render/
│   ├── renderer.ts            # Render orchestration
│   ├── bitmap.ts              # Bitmap utilities (RGBA conversion)
│   └── options.ts             # Render options types
├── pdfium.ts                  # Main PDFium class
├── index.ts                   # Universal entry (auto-detect platform)
├── browser.ts                 # Browser-specific entry
├── node.ts                    # Node.js-specific entry
└── worker.ts                  # Worker script entry
```

### 2.3 Core Type Definitions

#### Result<T, E> Type

```typescript
// src/core/result.ts

/**
 * Represents either a successful value (Ok) or an error (Err).
 * Provides a type-safe alternative to throwing exceptions.
 */
export type Result<T, E> = Ok<T, E> | Err<T, E>;

export interface Ok<T, E> {
  readonly _tag: 'Ok';
  readonly value: T;
  isOk(): this is Ok<T, E>;
  isErr(): this is Err<T, E>;
  unwrap(): T;
  unwrapOr(defaultValue: T): T;
  map<U>(fn: (value: T) => U): Result<U, E>;
  mapErr<F>(fn: (error: E) => F): Result<T, F>;
  andThen<U>(fn: (value: T) => Result<U, E>): Result<U, E>;
  match<U>(handlers: { ok: (value: T) => U; err: (error: E) => U }): U;
}

export interface Err<T, E> {
  readonly _tag: 'Err';
  readonly error: E;
  isOk(): this is Ok<T, E>;
  isErr(): this is Err<T, E>;
  unwrap(): never;
  unwrapOr(defaultValue: T): T;
  map<U>(fn: (value: T) => U): Result<U, E>;
  mapErr<F>(fn: (error: E) => F): Result<T, F>;
  andThen<U>(fn: (value: T) => Result<U, E>): Result<U, E>;
  match<U>(handlers: { ok: (value: T) => U; err: (error: E) => U }): U;
}

/** Creates a successful Result containing the given value */
export function ok<T, E = never>(value: T): Ok<T, E>;

/** Creates an error Result containing the given error */
export function err<T = never, E = unknown>(error: E): Err<T, E>;

/** Type guard for Ok results */
export function isOk<T, E>(result: Result<T, E>): result is Ok<T, E>;

/** Type guard for Err results */
export function isErr<T, E>(result: Result<T, E>): result is Err<T, E>;
```

#### Error Hierarchy

```typescript
// src/core/errors.ts

/** Error codes for PDFium operations */
export enum PDFiumErrorCode {
  // Initialisation errors (1xx)
  INIT_WASM_LOAD_FAILED = 100,
  INIT_LIBRARY_FAILED = 101,
  INIT_INVALID_OPTIONS = 102,

  // Document errors (2xx)
  DOC_FILE_NOT_FOUND = 200,
  DOC_FORMAT_INVALID = 201,
  DOC_PASSWORD_REQUIRED = 202,
  DOC_PASSWORD_INCORRECT = 203,
  DOC_SECURITY_UNSUPPORTED = 204,
  DOC_ALREADY_CLOSED = 205,

  // Page errors (3xx)
  PAGE_NOT_FOUND = 300,
  PAGE_LOAD_FAILED = 301,
  PAGE_ALREADY_CLOSED = 302,

  // Render errors (4xx)
  RENDER_BITMAP_FAILED = 400,
  RENDER_INVALID_DIMENSIONS = 401,

  // Memory errors (5xx)
  MEMORY_ALLOCATION_FAILED = 500,
  MEMORY_BUFFER_OVERFLOW = 501,

  // Text errors (6xx)
  TEXT_EXTRACTION_FAILED = 600,

  // Object errors (7xx)
  OBJECT_TYPE_UNKNOWN = 700,
  OBJECT_ACCESS_FAILED = 701,
}

/** Base error class for all PDFium errors */
export class PDFiumError extends Error {
  readonly code: PDFiumErrorCode;
  readonly context?: Record<string, unknown>;

  constructor(code: PDFiumErrorCode, message: string, context?: Record<string, unknown>) {
    super(message);
    this.name = 'PDFiumError';
    this.code = code;
    this.context = context;
  }
}

/** Error during library initialisation */
export class InitialisationError extends PDFiumError {
  constructor(code: PDFiumErrorCode, message: string, context?: Record<string, unknown>) {
    super(code, message, context);
    this.name = 'InitialisationError';
  }
}

/** Error loading or accessing a document */
export class DocumentError extends PDFiumError {
  constructor(code: PDFiumErrorCode, message: string, context?: Record<string, unknown>) {
    super(code, message, context);
    this.name = 'DocumentError';
  }
}

/** Error accessing or rendering a page */
export class PageError extends PDFiumError {
  constructor(code: PDFiumErrorCode, message: string, context?: Record<string, unknown>) {
    super(code, message, context);
    this.name = 'PageError';
  }
}

/** Error during rendering operations */
export class RenderError extends PDFiumError {
  constructor(code: PDFiumErrorCode, message: string, context?: Record<string, unknown>) {
    super(code, message, context);
    this.name = 'RenderError';
  }
}

/** Error during memory operations */
export class MemoryError extends PDFiumError {
  constructor(code: PDFiumErrorCode, message: string, context?: Record<string, unknown>) {
    super(code, message, context);
    this.name = 'MemoryError';
  }
}
```

#### Disposable Pattern

```typescript
// src/core/disposable.ts

/** Registry to track non-disposed resources and warn developers */
const disposalRegistry = new FinalizationRegistry<string>((resourceName) => {
  console.warn(
    `[PDFium] Resource "${resourceName}" was garbage collected without being disposed. ` +
    `This may cause memory leaks. Use 'using' keyword or call dispose() explicitly.`
  );
});

/** Base class for disposable PDFium resources */
export abstract class Disposable {
  #disposed = false;
  readonly #resourceName: string;
  readonly #registrationToken: object;

  constructor(resourceName: string) {
    this.#resourceName = resourceName;
    this.#registrationToken = {};
    disposalRegistry.register(this, resourceName, this.#registrationToken);
  }

  /** Whether this resource has been disposed */
  get disposed(): boolean {
    return this.#disposed;
  }

  /** Dispose of this resource, freeing WASM memory */
  [Symbol.dispose](): void {
    if (this.#disposed) {
      return;
    }
    this.#disposed = true;
    disposalRegistry.unregister(this.#registrationToken);
    this.disposeInternal();
  }

  /** Alias for Symbol.dispose for explicit calls */
  dispose(): void {
    this[Symbol.dispose]();
  }

  /** Override in subclasses to perform actual cleanup */
  protected abstract disposeInternal(): void;

  /** Throw if this resource has been disposed */
  protected ensureNotDisposed(): void {
    if (this.#disposed) {
      throw new PDFiumError(
        PDFiumErrorCode.DOC_ALREADY_CLOSED,
        `Cannot use ${this.#resourceName} after it has been disposed`
      );
    }
  }
}
```

### 2.4 Public API Surface

```typescript
// src/pdfium.ts

export interface PDFiumInitOptions {
  /** Path or URL to the WASM binary */
  wasmUrl?: string;
  /** Pre-loaded WASM binary */
  wasmBinary?: ArrayBuffer;
  /** Enable worker mode for off-main-thread processing */
  useWorker?: boolean;
  /** Custom worker script URL (only if useWorker is true) */
  workerUrl?: string;
}

export class PDFium extends Disposable {
  /**
   * Initialise the PDFium library.
   *
   * @example
   * ```typescript
   * const result = await PDFium.init();
   * if (result.isErr()) {
   *   console.error('Failed to init:', result.error);
   *   return;
   * }
   * using pdfium = result.value;
   * ```
   */
  static init(options?: PDFiumInitOptions): Promise<Result<PDFium, InitialisationError>>;

  /**
   * Open a PDF document from binary data.
   *
   * @example
   * ```typescript
   * const docResult = await pdfium.openDocument(pdfBytes, { password: 'secret' });
   * const document = docResult.unwrap();
   * using doc = document; // Auto-cleanup when scope exits
   * ```
   */
  openDocument(
    data: Uint8Array | ArrayBuffer,
    options?: { password?: string }
  ): Promise<Result<PDFiumDocument, DocumentError>>;
}

export class PDFiumDocument extends Disposable {
  /** Number of pages in this document */
  readonly pageCount: number;

  /**
   * Get a page by zero-based index.
   */
  getPage(index: number): Result<PDFiumPage, PageError>;

  /**
   * Iterate over all pages in the document.
   *
   * @example
   * ```typescript
   * for (const pageResult of document.pages()) {
   *   using page = pageResult.unwrap();
   *   const rendered = await page.render({ scale: 2 });
   * }
   * ```
   */
  pages(): Generator<Result<PDFiumPage, PageError>>;
}

export interface PageSize {
  /** Width in points (1/72 inch) */
  width: number;
  /** Height in points (1/72 inch) */
  height: number;
}

export interface RenderOptions {
  /** Scale factor (default: 1) */
  scale?: number;
  /** Target width in pixels (overrides scale) */
  width?: number;
  /** Target height in pixels (overrides scale) */
  height?: number;
  /** Include form fields in render */
  renderFormFields?: boolean;
  /** Background colour (default: white) */
  backgroundColour?: number;
}

export interface RenderResult {
  /** Rendered width in pixels */
  width: number;
  /** Rendered height in pixels */
  height: number;
  /** Original page width in points */
  originalWidth: number;
  /** Original page height in points */
  originalHeight: number;
  /** RGBA pixel data */
  data: Uint8Array;
}

export class PDFiumPage extends Disposable {
  /** Zero-based page index */
  readonly index: number;

  /** Page dimensions in points */
  readonly size: PageSize;

  /**
   * Render the page to RGBA bitmap.
   */
  render(options?: RenderOptions): Promise<Result<RenderResult, RenderError>>;

  /**
   * Extract text content from the page.
   */
  getText(): Result<string, PDFiumError>;

  /**
   * Get the number of objects on this page.
   */
  readonly objectCount: number;

  /**
   * Iterate over page objects (text, images, paths, etc.).
   */
  objects(): Generator<PDFiumObject>;
}
```

### 2.5 WASM Memory Management Strategy

```typescript
// src/wasm/memory.ts

/**
 * WASM memory allocation wrapper with automatic cleanup tracking.
 *
 * All WASM memory allocations go through this class to ensure:
 * 1. Type-safe pointer handling (branded number type)
 * 2. Automatic deallocation on dispose
 * 3. Leak detection in development mode
 */
export class WASMMemoryManager {
  readonly #module: PDFiumWASM;
  readonly #allocations = new Set<WASMPointer>();

  constructor(module: PDFiumWASM) {
    this.#module = module;
  }

  /**
   * Allocate a block of memory in the WASM heap.
   * Returns a Result to handle allocation failure gracefully.
   */
  malloc(size: number): Result<WASMPointer, MemoryError> {
    const ptr = this.#module.wasmExports.malloc(size) as WASMPointer;
    if (ptr === 0) {
      return err(new MemoryError(
        PDFiumErrorCode.MEMORY_ALLOCATION_FAILED,
        `Failed to allocate ${size} bytes in WASM heap`
      ));
    }
    this.#allocations.add(ptr);
    return ok(ptr);
  }

  /**
   * Free a previously allocated block.
   */
  free(ptr: WASMPointer): void {
    if (!this.#allocations.has(ptr)) {
      console.warn('[PDFium] Attempted to free untracked pointer:', ptr);
      return;
    }
    this.#module.wasmExports.free(ptr);
    this.#allocations.delete(ptr);
  }

  /**
   * Copy JavaScript Uint8Array to WASM memory.
   */
  copyToWASM(data: Uint8Array): Result<WASMPointer, MemoryError> {
    const result = this.malloc(data.length);
    if (result.isErr()) {
      return result;
    }
    const ptr = result.value;
    this.#module.HEAPU8.set(data, ptr);
    return ok(ptr);
  }

  /**
   * Read bytes from WASM memory to JavaScript.
   */
  copyFromWASM(ptr: WASMPointer, length: number): Uint8Array {
    return this.#module.HEAPU8.slice(ptr, ptr + length);
  }

  /**
   * Free all tracked allocations. Called during disposal.
   */
  freeAll(): void {
    for (const ptr of this.#allocations) {
      this.#module.wasmExports.free(ptr);
    }
    this.#allocations.clear();
  }

  /**
   * Check for memory leaks (development mode).
   */
  get activeAllocations(): number {
    return this.#allocations.size;
  }
}

/** Branded type for WASM pointers to prevent mixing with regular numbers */
export type WASMPointer = number & { readonly __brand: 'WASMPointer' };
```

---

## 3. Detailed Phase Breakdown

### Phase 0: Project Bootstrap

**Duration**: 1 day

**Objectives**:
- Rename package from `@hyzyla/pdfium` to `@jacquesg/pdfium`
- Update all configuration files for the new package
- Set up pnpm and remove npm/yarn artefacts
- Configure TypeScript for ES2024 target
- Install and configure tsup
- Set up Biome for linting and formatting

**Files to Create/Modify**:

| File | Action | Purpose |
|------|--------|---------|
| `package.json` | Modify | Update name, scripts, dependencies, exports |
| `tsconfig.json` | Modify | Set target ES2024, lib ES2024, Node22 |
| `tsup.config.ts` | Create | tsup build configuration |
| `biome.json` | Modify | Linting/formatting rules |
| `.nvmrc` | Create | Pin Node.js 22 LTS |
| `pnpm-lock.yaml` | Create | Lock file (delete package-lock.json) |

**package.json changes**:
```json
{
  "name": "@jacquesg/pdfium",
  "version": "3.0.0-alpha.1",
  "type": "module",
  "engines": {
    "node": ">=22"
  },
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    },
    "./browser": {
      "types": "./dist/browser.d.ts",
      "import": "./dist/browser.js"
    },
    "./node": {
      "types": "./dist/node.d.ts",
      "import": "./dist/node.js"
    },
    "./worker": {
      "types": "./dist/worker.d.ts",
      "import": "./dist/worker.js"
    }
  },
  "scripts": {
    "build": "tsup",
    "dev": "tsup --watch",
    "test": "vitest",
    "test:coverage": "vitest --coverage",
    "test:mutation": "stryker run",
    "lint": "biome check .",
    "lint:fix": "biome check --write .",
    "typecheck": "tsc --noEmit"
  }
}
```

**tsconfig.json changes**:
```json
{
  "compilerOptions": {
    "target": "ES2024",
    "lib": ["ES2024"],
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitOverride": true,
    "skipLibCheck": true,
    "outDir": "./dist"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

**tsup.config.ts**:
```typescript
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    browser: 'src/browser.ts',
    node: 'src/node.ts',
    worker: 'src/worker.ts',
  },
  format: ['esm'],
  target: 'es2024',
  dts: true,
  sourcemap: true,
  clean: true,
  splitting: true,
  treeshake: true,
  external: ['fs', 'path', 'crypto', 'url'],
});
```

**Acceptance Criteria**:
- [ ] `pnpm install` succeeds
- [ ] `pnpm run build` produces output in `dist/`
- [ ] `pnpm run typecheck` passes
- [ ] `pnpm run lint` passes
- [ ] Package can be imported as `@jacquesg/pdfium`

**Dependencies**: None (starting point)

---

### Phase 1: Core Foundation

**Duration**: 2-3 days

**Objectives**:
- Implement the Result<T, E> type
- Create the error hierarchy
- Implement the Disposable base class with FinalizationRegistry
- Define shared types

**Files to Create**:

| File | Purpose |
|------|---------|
| `src/core/result.ts` | Result<T, E> implementation |
| `src/core/errors.ts` | Error classes and codes |
| `src/core/disposable.ts` | Disposable base class |
| `src/core/types.ts` | Shared type definitions |
| `src/core/index.ts` | Core module exports |

**Result Implementation Details**:

```typescript
// src/core/result.ts

class OkImpl<T, E> implements Ok<T, E> {
  readonly _tag = 'Ok' as const;
  constructor(readonly value: T) {}

  isOk(): this is Ok<T, E> { return true; }
  isErr(): this is Err<T, E> { return false; }

  unwrap(): T { return this.value; }
  unwrapOr(_defaultValue: T): T { return this.value; }

  map<U>(fn: (value: T) => U): Result<U, E> {
    return ok(fn(this.value));
  }

  mapErr<F>(_fn: (error: E) => F): Result<T, F> {
    return ok(this.value);
  }

  andThen<U>(fn: (value: T) => Result<U, E>): Result<U, E> {
    return fn(this.value);
  }

  match<U>(handlers: { ok: (value: T) => U; err: (error: E) => U }): U {
    return handlers.ok(this.value);
  }
}

class ErrImpl<T, E> implements Err<T, E> {
  readonly _tag = 'Err' as const;
  constructor(readonly error: E) {}

  isOk(): this is Ok<T, E> { return false; }
  isErr(): this is Err<T, E> { return true; }

  unwrap(): never {
    throw this.error instanceof Error
      ? this.error
      : new Error(String(this.error));
  }

  unwrapOr(defaultValue: T): T { return defaultValue; }

  map<U>(_fn: (value: T) => U): Result<U, E> {
    return err(this.error);
  }

  mapErr<F>(fn: (error: E) => F): Result<T, F> {
    return err(fn(this.error));
  }

  andThen<U>(_fn: (value: T) => Result<U, E>): Result<U, E> {
    return err(this.error);
  }

  match<U>(handlers: { ok: (value: T) => U; err: (error: E) => U }): U {
    return handlers.err(this.error);
  }
}

export function ok<T, E = never>(value: T): Ok<T, E> {
  return new OkImpl(value);
}

export function err<T = never, E = unknown>(error: E): Err<T, E> {
  return new ErrImpl(error);
}
```

**Acceptance Criteria**:
- [ ] Result type has 100% test coverage
- [ ] All error classes extend PDFiumError
- [ ] Error codes are unique and documented
- [ ] Disposable base class logs warnings for undisposed resources
- [ ] FinalizationRegistry is only active in development
- [ ] `using` keyword works with all disposable resources
- [ ] TypeScript correctly narrows Result types after `isOk()`/`isErr()` checks

**Dependencies**: Phase 0

---

### Phase 2: Document & Page APIs

**Duration**: 4-5 days

**Objectives**:
- Implement WASM loader for Browser and Node.js
- Create type-safe WASM bindings
- Implement PDFium main class
- Implement PDFiumDocument class
- Implement PDFiumPage class
- Implement page objects (text, image, path, etc.)
- Implement rendering with bitmap conversion

**Files to Create**:

| File | Purpose |
|------|---------|
| `src/wasm/bindings.ts` | Type-safe WASM function bindings |
| `src/wasm/memory.ts` | Memory management utilities |
| `src/wasm/loader.ts` | Universal WASM loader |
| `src/wasm/vendor/pdfium.wasm` | WASM binary (copied) |
| `src/wasm/vendor/pdfium.d.ts` | WASM type definitions |
| `src/pdfium.ts` | Main PDFium class |
| `src/document/document.ts` | PDFiumDocument class |
| `src/document/page.ts` | PDFiumPage class |
| `src/document/form.ts` | Form field handling |
| `src/document/objects/base.ts` | PDFiumObject base |
| `src/document/objects/text.ts` | Text object |
| `src/document/objects/image.ts` | Image object |
| `src/document/objects/path.ts` | Path object |
| `src/document/objects/shading.ts` | Shading object |
| `src/document/objects/form.ts` | Form object |
| `src/render/renderer.ts` | Render orchestration |
| `src/render/bitmap.ts` | BGRA to RGBA conversion |
| `src/render/options.ts` | Render options types |

**Key Implementation: Universal WASM Loader**:

```typescript
// src/wasm/loader.ts

import { ok, err, type Result } from '../core/result.js';
import { InitialisationError, PDFiumErrorCode } from '../core/errors.js';

export interface WASMLoadOptions {
  wasmUrl?: string;
  wasmBinary?: ArrayBuffer;
}

export async function loadWASM(
  options: WASMLoadOptions
): Promise<Result<PDFiumWASM, InitialisationError>> {
  try {
    const binary = await resolveWASMBinary(options);
    if (binary.isErr()) {
      return binary;
    }

    const module = await instantiateWASM(binary.value);
    return ok(module);
  } catch (error) {
    return err(new InitialisationError(
      PDFiumErrorCode.INIT_WASM_LOAD_FAILED,
      `Failed to load WASM module: ${error instanceof Error ? error.message : String(error)}`
    ));
  }
}

async function resolveWASMBinary(
  options: WASMLoadOptions
): Promise<Result<ArrayBuffer, InitialisationError>> {
  // Option 1: Binary provided directly
  if (options.wasmBinary) {
    return ok(options.wasmBinary);
  }

  // Option 2: URL provided
  if (options.wasmUrl) {
    const response = await fetch(options.wasmUrl);
    if (!response.ok) {
      return err(new InitialisationError(
        PDFiumErrorCode.INIT_WASM_LOAD_FAILED,
        `Failed to fetch WASM from ${options.wasmUrl}: ${response.status}`
      ));
    }
    return ok(await response.arrayBuffer());
  }

  // Option 3: Auto-detect environment
  if (isNodeEnvironment()) {
    return loadWASMFromNodeModules();
  }

  return err(new InitialisationError(
    PDFiumErrorCode.INIT_INVALID_OPTIONS,
    'No WASM source provided. Provide wasmUrl or wasmBinary in browser environments.'
  ));
}

function isNodeEnvironment(): boolean {
  return typeof process !== 'undefined'
    && process.versions
    && process.versions.node !== undefined;
}

async function loadWASMFromNodeModules(): Promise<Result<ArrayBuffer, InitialisationError>> {
  try {
    const { readFile } = await import('node:fs/promises');
    const { fileURLToPath } = await import('node:url');
    const { dirname, join } = await import('node:path');

    const __dirname = dirname(fileURLToPath(import.meta.url));
    const wasmPath = join(__dirname, 'vendor', 'pdfium.wasm');
    const buffer = await readFile(wasmPath);

    return ok(buffer.buffer);
  } catch (error) {
    return err(new InitialisationError(
      PDFiumErrorCode.INIT_WASM_LOAD_FAILED,
      `Failed to load WASM from node_modules: ${error instanceof Error ? error.message : String(error)}`
    ));
  }
}
```

**Key Implementation: PDFiumDocument**:

```typescript
// src/document/document.ts

import { Disposable } from '../core/disposable.js';
import { ok, err, type Result } from '../core/result.js';
import { PageError, PDFiumErrorCode } from '../core/errors.js';
import { PDFiumPage } from './page.js';
import type { WASMMemoryManager, WASMPointer } from '../wasm/memory.js';
import type { PDFiumWASM } from '../wasm/bindings.js';

export class PDFiumDocument extends Disposable {
  readonly #module: PDFiumWASM;
  readonly #memory: WASMMemoryManager;
  readonly #documentHandle: number;
  readonly #documentPtr: WASMPointer;
  #formHandle: number | null = null;
  #formPtr: WASMPointer | null = null;

  constructor(
    module: PDFiumWASM,
    memory: WASMMemoryManager,
    documentHandle: number,
    documentPtr: WASMPointer
  ) {
    super('PDFiumDocument');
    this.#module = module;
    this.#memory = memory;
    this.#documentHandle = documentHandle;
    this.#documentPtr = documentPtr;
  }

  get pageCount(): number {
    this.ensureNotDisposed();
    return this.#module._FPDF_GetPageCount(this.#documentHandle);
  }

  getPage(index: number): Result<PDFiumPage, PageError> {
    this.ensureNotDisposed();

    if (index < 0 || index >= this.pageCount) {
      return err(new PageError(
        PDFiumErrorCode.PAGE_NOT_FOUND,
        `Page index ${index} out of bounds (0-${this.pageCount - 1})`,
        { index, pageCount: this.pageCount }
      ));
    }

    const pageHandle = this.#module._FPDF_LoadPage(this.#documentHandle, index);
    if (!pageHandle) {
      return err(new PageError(
        PDFiumErrorCode.PAGE_LOAD_FAILED,
        `Failed to load page at index ${index}`
      ));
    }

    return ok(new PDFiumPage(
      this.#module,
      this.#memory,
      pageHandle,
      this.#documentHandle,
      index,
      this
    ));
  }

  *pages(): Generator<Result<PDFiumPage, PageError>> {
    const count = this.pageCount;
    for (let i = 0; i < count; i++) {
      yield this.getPage(i);
    }
  }

  initFormFields(): number {
    if (this.#formHandle !== null) {
      return this.#formHandle;
    }

    const formSize = 256;
    const ptrResult = this.#memory.malloc(formSize);
    if (ptrResult.isErr()) {
      throw ptrResult.error;
    }

    this.#formPtr = ptrResult.value;
    this.#module.HEAPU8.fill(0, this.#formPtr, this.#formPtr + formSize);

    // Set version to 2 for XFA support
    const view = new DataView(this.#module.HEAPU8.buffer);
    view.setUint32(this.#formPtr, 2, true);

    this.#formHandle = this.#module._FPDFDOC_InitFormFillEnvironment(
      this.#documentHandle,
      this.#formPtr
    );

    return this.#formHandle;
  }

  protected disposeInternal(): void {
    if (this.#formHandle !== null) {
      this.#module._FPDFDOC_ExitFormFillEnvironment(this.#formHandle);
    }
    if (this.#formPtr !== null) {
      this.#memory.free(this.#formPtr);
    }
    this.#module._FPDF_CloseDocument(this.#documentHandle);
    this.#memory.free(this.#documentPtr);
  }
}
```

**Acceptance Criteria**:
- [ ] WASM loads correctly in Node.js 22+
- [ ] WASM loads correctly in modern browsers (Chrome, Firefox, Safari)
- [ ] Document loading handles all error cases (format, password, security)
- [ ] Page iteration works with generator pattern
- [ ] Rendering produces correct RGBA output at various scales
- [ ] Form field rendering works
- [ ] Text extraction returns correct content
- [ ] Object iteration returns correctly typed objects
- [ ] All resources are properly disposed

**Dependencies**: Phase 1

---

### Phase 3: Testing Infrastructure

**Duration**: 3-4 days

**Objectives**:
- Set up Vitest with coverage
- Create test utilities and fixtures
- Write unit tests for core module
- Write integration tests for document operations
- Set up visual regression testing
- Configure Stryker for mutation testing

**Files to Create**:

| File | Purpose |
|------|---------|
| `vitest.config.ts` | Vitest configuration |
| `stryker.config.json` | Stryker mutation testing config |
| `test/setup.ts` | Test setup and global fixtures |
| `test/fixtures/` | Test PDF files |
| `test/utils/` | Test utilities |
| `test/core/result.test.ts` | Result type tests |
| `test/core/errors.test.ts` | Error hierarchy tests |
| `test/core/disposable.test.ts` | Disposable pattern tests |
| `test/document/document.test.ts` | Document tests |
| `test/document/page.test.ts` | Page tests |
| `test/render/renderer.test.ts` | Render tests |
| `test/integration/workflow.test.ts` | End-to-end workflow tests |
| `test/visual/` | Visual regression snapshots |

**Vitest Configuration**:

```typescript
// vitest.config.ts

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['test/**/*.test.ts'],
    exclude: ['test/browser/**'],
    setupFiles: ['test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.d.ts',
        'src/**/index.ts',
        'src/wasm/vendor/**',
      ],
      thresholds: {
        lines: 95,
        branches: 90,
        functions: 95,
        statements: 95,
      },
    },
    testTimeout: 15000,
  },
});
```

**Stryker Configuration**:

```json
{
  "$schema": "./node_modules/@stryker-mutator/core/schema/stryker-schema.json",
  "packageManager": "pnpm",
  "reporters": ["html", "clear-text", "progress"],
  "testRunner": "vitest",
  "coverageAnalysis": "perTest",
  "mutate": [
    "src/**/*.ts",
    "!src/**/*.d.ts",
    "!src/**/index.ts",
    "!src/wasm/vendor/**"
  ],
  "thresholds": {
    "high": 80,
    "low": 70,
    "break": 60
  }
}
```

**Test Example - Result Type**:

```typescript
// test/core/result.test.ts

import { describe, it, expect } from 'vitest';
import { ok, err, isOk, isErr, type Result } from '../../src/core/result.js';

describe('Result', () => {
  describe('ok()', () => {
    it('creates a successful result', () => {
      const result = ok(42);
      expect(result._tag).toBe('Ok');
      expect(result.value).toBe(42);
    });

    it('isOk() returns true', () => {
      const result = ok('hello');
      expect(result.isOk()).toBe(true);
      expect(result.isErr()).toBe(false);
    });

    it('unwrap() returns the value', () => {
      const result = ok({ data: 'test' });
      expect(result.unwrap()).toEqual({ data: 'test' });
    });

    it('map() transforms the value', () => {
      const result = ok(5).map(x => x * 2);
      expect(result.unwrap()).toBe(10);
    });

    it('andThen() chains operations', () => {
      const divide = (a: number, b: number): Result<number, string> =>
        b === 0 ? err('division by zero') : ok(a / b);

      const result = ok(10).andThen(x => divide(x, 2));
      expect(result.unwrap()).toBe(5);
    });

    it('match() calls ok handler', () => {
      const result = ok(42).match({
        ok: v => `value: ${v}`,
        err: e => `error: ${e}`,
      });
      expect(result).toBe('value: 42');
    });
  });

  describe('err()', () => {
    it('creates an error result', () => {
      const error = new Error('test');
      const result = err(error);
      expect(result._tag).toBe('Err');
      expect(result.error).toBe(error);
    });

    it('isErr() returns true', () => {
      const result = err('failed');
      expect(result.isErr()).toBe(true);
      expect(result.isOk()).toBe(false);
    });

    it('unwrap() throws the error', () => {
      const result = err(new Error('test'));
      expect(() => result.unwrap()).toThrow('test');
    });

    it('unwrapOr() returns the default', () => {
      const result: Result<number, string> = err('failed');
      expect(result.unwrapOr(42)).toBe(42);
    });

    it('map() propagates the error', () => {
      const result: Result<number, string> = err('failed');
      const mapped = result.map(x => x * 2);
      expect(mapped.isErr()).toBe(true);
      expect(mapped.error).toBe('failed');
    });

    it('mapErr() transforms the error', () => {
      const result = err('error').mapErr(e => new Error(e));
      expect(result.error).toBeInstanceOf(Error);
    });

    it('andThen() short-circuits', () => {
      let called = false;
      const result: Result<number, string> = err('failed');
      result.andThen(x => {
        called = true;
        return ok(x);
      });
      expect(called).toBe(false);
    });
  });

  describe('type guards', () => {
    it('isOk() narrows type correctly', () => {
      const result: Result<number, Error> = ok(42);
      if (isOk(result)) {
        // TypeScript should know result.value is number
        const value: number = result.value;
        expect(value).toBe(42);
      }
    });

    it('isErr() narrows type correctly', () => {
      const result: Result<number, Error> = err(new Error('test'));
      if (isErr(result)) {
        // TypeScript should know result.error is Error
        const error: Error = result.error;
        expect(error.message).toBe('test');
      }
    });
  });
});
```

**Acceptance Criteria**:
- [ ] All tests pass with `pnpm test`
- [ ] Coverage meets thresholds (95% lines, 90% branches)
- [ ] Mutation score >= 80%
- [ ] Visual regression tests pass
- [ ] Tests run in < 30 seconds

**Dependencies**: Phase 2

---

### Phase 4: Build & Distribution

**Duration**: 2 days

**Objectives**:
- Configure tsup for production builds
- Set up package exports
- Configure TypeScript declarations
- Set up npm publishing workflow
- Create GitHub Actions for CI/CD

**Files to Create/Modify**:

| File | Purpose |
|------|---------|
| `tsup.config.ts` | Production build config |
| `package.json` | Exports, files, publishConfig |
| `.github/workflows/ci.yml` | CI pipeline |
| `.github/workflows/release.yml` | Release pipeline |
| `.npmrc` | npm configuration |
| `CHANGELOG.md` | Version history |

**Production tsup Configuration**:

```typescript
// tsup.config.ts

import { defineConfig } from 'tsup';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const wasmBuffer = readFileSync('src/wasm/vendor/pdfium.wasm');
const wasmHash = createHash('sha256').update(wasmBuffer).digest('hex').slice(0, 8);

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    browser: 'src/browser.ts',
    node: 'src/node.ts',
    worker: 'src/worker.ts',
  },
  format: ['esm'],
  target: 'es2024',
  dts: true,
  sourcemap: true,
  clean: true,
  splitting: true,
  treeshake: true,
  minify: process.env.NODE_ENV === 'production',
  external: ['node:fs', 'node:fs/promises', 'node:path', 'node:url', 'node:crypto'],
  define: {
    __PACKAGE_VERSION__: JSON.stringify(process.env.npm_package_version ?? '0.0.0'),
    __WASM_HASH__: JSON.stringify(wasmHash),
    __DEV__: JSON.stringify(process.env.NODE_ENV !== 'production'),
  },
  esbuildOptions(options) {
    options.legalComments = 'none';
  },
  async onSuccess() {
    // Copy WASM file to dist
    const { copyFileSync, mkdirSync } = await import('node:fs');
    mkdirSync('dist/wasm/vendor', { recursive: true });
    copyFileSync('src/wasm/vendor/pdfium.wasm', 'dist/wasm/vendor/pdfium.wasm');
    console.log('Copied WASM binary to dist/');
  },
});
```

**Package.json Exports**:

```json
{
  "name": "@jacquesg/pdfium",
  "version": "3.0.0",
  "type": "module",
  "sideEffects": false,
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    },
    "./browser": {
      "types": "./dist/browser.d.ts",
      "import": "./dist/browser.js"
    },
    "./node": {
      "types": "./dist/node.d.ts",
      "import": "./dist/node.js"
    },
    "./worker": {
      "types": "./dist/worker.d.ts",
      "import": "./dist/worker.js"
    },
    "./pdfium.wasm": {
      "default": "./dist/wasm/vendor/pdfium.wasm"
    }
  },
  "files": [
    "dist/**/*",
    "!dist/**/*.map"
  ],
  "publishConfig": {
    "access": "public",
    "registry": "https://registry.npmjs.org/"
  }
}
```

**CI Workflow**:

```yaml
# .github/workflows/ci.yml

name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [22]
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
      - run: pnpm run lint
      - run: pnpm run typecheck
      - run: pnpm run test:coverage
      - uses: codecov/codecov-action@v4
        with:
          files: coverage/lcov.info

  build:
    runs-on: ubuntu-latest
    needs: test
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
      - run: pnpm run build
      - uses: actions/upload-artifact@v4
        with:
          name: dist
          path: dist/
```

**Acceptance Criteria**:
- [ ] `pnpm run build` produces minified ESM bundles
- [ ] TypeScript declarations are correct and complete
- [ ] Package exports resolve correctly
- [ ] CI pipeline passes on all commits
- [ ] Bundle size < 20KB gzipped (excluding WASM)

**Dependencies**: Phase 3

---

### Phase 5: Advanced Features

**Duration**: 4-5 days

**Objectives**:
- Implement worker abstraction (transparent main thread / worker execution)
- Implement streaming document loading
- Add progress callbacks for long operations
- Implement cancellation support

**Files to Create**:

| File | Purpose |
|------|---------|
| `src/context/interface.ts` | IPDFiumContext interface |
| `src/context/main-thread.ts` | Direct WASM context |
| `src/context/worker-proxy.ts` | Worker proxy context |
| `src/context/worker-script.ts` | Worker entry script |
| `src/context/protocol.ts` | Worker message protocol |
| `src/stream/reader.ts` | Streaming document reader |
| `src/cancellation.ts` | AbortController integration |

**Worker Abstraction Protocol**:

```typescript
// src/context/protocol.ts

export type WorkerRequest =
  | { type: 'INIT'; id: string; payload: { wasmBinary: ArrayBuffer } }
  | { type: 'OPEN_DOCUMENT'; id: string; payload: { data: ArrayBuffer; password?: string } }
  | { type: 'GET_PAGE_COUNT'; id: string; payload: { documentId: number } }
  | { type: 'LOAD_PAGE'; id: string; payload: { documentId: number; pageIndex: number } }
  | { type: 'RENDER_PAGE'; id: string; payload: RenderPagePayload }
  | { type: 'GET_TEXT'; id: string; payload: { documentId: number; pageIndex: number } }
  | { type: 'CLOSE_DOCUMENT'; id: string; payload: { documentId: number } }
  | { type: 'CLOSE_PAGE'; id: string; payload: { documentId: number; pageHandle: number } }
  | { type: 'DESTROY'; id: string };

export type WorkerResponse =
  | { type: 'SUCCESS'; id: string; payload: unknown }
  | { type: 'ERROR'; id: string; error: SerializedError }
  | { type: 'PROGRESS'; id: string; progress: number };

export interface SerializedError {
  name: string;
  message: string;
  code: number;
  context?: Record<string, unknown>;
}

export interface RenderPagePayload {
  documentId: number;
  pageHandle: number;
  width: number;
  height: number;
  renderFormFields: boolean;
}
```

**Worker Proxy Implementation**:

```typescript
// src/context/worker-proxy.ts

import { ok, err, type Result } from '../core/result.js';
import { PDFiumError, InitialisationError, PDFiumErrorCode } from '../core/errors.js';
import type { WorkerRequest, WorkerResponse, SerializedError } from './protocol.js';
import type { IPDFiumContext } from './interface.js';

export class WorkerProxy implements IPDFiumContext {
  readonly #worker: Worker;
  readonly #pending = new Map<string, {
    resolve: (value: unknown) => void;
    reject: (error: Error) => void;
  }>();
  #requestId = 0;

  private constructor(worker: Worker) {
    this.#worker = worker;
    this.#worker.onmessage = this.#handleMessage.bind(this);
    this.#worker.onerror = this.#handleError.bind(this);
  }

  static async create(
    workerUrl: string,
    wasmBinary: ArrayBuffer
  ): Promise<Result<WorkerProxy, InitialisationError>> {
    try {
      const worker = new Worker(workerUrl, { type: 'module' });
      const proxy = new WorkerProxy(worker);

      const result = await proxy.#sendRequest<void>({
        type: 'INIT',
        payload: { wasmBinary },
      });

      if (result.isErr()) {
        worker.terminate();
        return err(new InitialisationError(
          PDFiumErrorCode.INIT_LIBRARY_FAILED,
          'Failed to initialise worker'
        ));
      }

      return ok(proxy);
    } catch (error) {
      return err(new InitialisationError(
        PDFiumErrorCode.INIT_WASM_LOAD_FAILED,
        `Failed to create worker: ${error instanceof Error ? error.message : String(error)}`
      ));
    }
  }

  async #sendRequest<T>(request: Omit<WorkerRequest, 'id'>): Promise<Result<T, PDFiumError>> {
    const id = String(++this.#requestId);
    const fullRequest = { ...request, id } as WorkerRequest;

    return new Promise((resolve) => {
      this.#pending.set(id, {
        resolve: (value) => resolve(ok(value as T)),
        reject: (error) => resolve(err(this.#deserializeError(error))),
      });

      const transfer: Transferable[] = [];
      if ('payload' in fullRequest && fullRequest.payload) {
        if ('data' in fullRequest.payload && fullRequest.payload.data instanceof ArrayBuffer) {
          transfer.push(fullRequest.payload.data);
        }
        if ('wasmBinary' in fullRequest.payload) {
          transfer.push(fullRequest.payload.wasmBinary);
        }
      }

      this.#worker.postMessage(fullRequest, transfer);
    });
  }

  #handleMessage(event: MessageEvent<WorkerResponse>): void {
    const { type, id } = event.data;
    const pending = this.#pending.get(id);

    if (!pending) {
      console.warn('[PDFium] Received response for unknown request:', id);
      return;
    }

    if (type === 'SUCCESS') {
      this.#pending.delete(id);
      pending.resolve(event.data.payload);
    } else if (type === 'ERROR') {
      this.#pending.delete(id);
      pending.reject(this.#deserializeError(event.data.error));
    }
    // PROGRESS events don't resolve the promise
  }

  #handleError(error: ErrorEvent): void {
    console.error('[PDFium] Worker error:', error);
    // Reject all pending requests
    for (const [id, pending] of this.#pending) {
      pending.reject(new Error(`Worker error: ${error.message}`));
      this.#pending.delete(id);
    }
  }

  #deserializeError(serialized: SerializedError | Error): PDFiumError {
    if (serialized instanceof Error) {
      return new PDFiumError(
        PDFiumErrorCode.INIT_LIBRARY_FAILED,
        serialized.message
      );
    }
    return new PDFiumError(
      serialized.code as PDFiumErrorCode,
      serialized.message,
      serialized.context
    );
  }

  // IPDFiumContext implementation...
  async openDocument(data: ArrayBuffer, password?: string): Promise<Result<number, PDFiumError>> {
    return this.#sendRequest({
      type: 'OPEN_DOCUMENT',
      payload: { data, password },
    });
  }

  dispose(): void {
    this.#worker.postMessage({ type: 'DESTROY', id: '0' });
    this.#worker.terminate();
  }
}
```

**Acceptance Criteria**:
- [ ] Worker mode produces identical output to main-thread mode
- [ ] Worker communication uses transferable objects for large data
- [ ] Streaming can load large PDFs incrementally
- [ ] Cancellation stops long-running operations
- [ ] Memory is properly freed in both contexts

**Dependencies**: Phase 4

---

### Phase 6: Documentation & Launch

**Duration**: 3-4 days

**Objectives**:
- Set up Starlight documentation site
- Write API reference documentation
- Create getting started guide
- Write migration guide from @hyzyla/pdfium
- Create examples for common use cases
- Prepare release notes

**Files to Create**:

| File | Purpose |
|------|---------|
| `docs/` | Starlight documentation site |
| `docs/astro.config.mjs` | Astro configuration |
| `docs/src/content/docs/getting-started.mdx` | Quick start guide |
| `docs/src/content/docs/api/` | API reference |
| `docs/src/content/docs/guides/` | Usage guides |
| `docs/src/content/docs/migration.mdx` | Migration from v2 |
| `examples/` | Example projects |
| `examples/node-basic/` | Basic Node.js usage |
| `examples/browser-vite/` | Vite + Browser |
| `examples/worker-mode/` | Worker example |
| `MIGRATION.md` | Migration guide (repo root) |
| `README.md` | Updated readme |

**Starlight Configuration**:

```javascript
// docs/astro.config.mjs

import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

export default defineConfig({
  integrations: [
    starlight({
      title: '@jacquesg/pdfium',
      description: 'Universal PDFium WASM wrapper for Browser and Node.js',
      social: {
        github: 'https://github.com/jacquesg/pdfium',
      },
      sidebar: [
        {
          label: 'Getting Started',
          items: [
            { label: 'Introduction', link: '/getting-started/' },
            { label: 'Installation', link: '/getting-started/installation/' },
            { label: 'Quick Start', link: '/getting-started/quick-start/' },
          ],
        },
        {
          label: 'Guides',
          items: [
            { label: 'Loading Documents', link: '/guides/loading/' },
            { label: 'Rendering Pages', link: '/guides/rendering/' },
            { label: 'Text Extraction', link: '/guides/text/' },
            { label: 'Form Fields', link: '/guides/forms/' },
            { label: 'Worker Mode', link: '/guides/workers/' },
            { label: 'Error Handling', link: '/guides/errors/' },
            { label: 'Memory Management', link: '/guides/memory/' },
          ],
        },
        {
          label: 'API Reference',
          autogenerate: { directory: 'api' },
        },
        {
          label: 'Migration',
          link: '/migration/',
        },
      ],
    }),
  ],
});
```

**Acceptance Criteria**:
- [ ] Documentation site builds without errors
- [ ] All public APIs are documented
- [ ] Getting started guide works for new users
- [ ] Migration guide covers all breaking changes
- [ ] Examples compile and run

**Dependencies**: Phase 5

---

## 4. Technical Specifications

### 4.1 Result Type Implementation

The Result type provides explicit error handling without exceptions. Here is the complete implementation with examples:

```typescript
// Usage examples

// Example 1: Basic usage
const result = await pdfium.openDocument(bytes);
if (result.isErr()) {
  console.error('Failed:', result.error.message);
  return;
}
const document = result.value;

// Example 2: Using match for exhaustive handling
const pageCount = result.match({
  ok: (doc) => doc.pageCount,
  err: (error) => {
    logError(error);
    return 0;
  },
});

// Example 3: Chaining with andThen
const textResult = await pdfium
  .openDocument(bytes)
  .andThen((doc) => doc.getPage(0))
  .andThen((page) => page.getText());

// Example 4: Using unwrapOr for defaults
const text = textResult.unwrapOr('');

// Example 5: Mapping errors
const userFriendlyResult = result.mapErr((error) => ({
  title: 'Could not open document',
  detail: error.message,
  code: error.code,
}));
```

### 4.2 Error Hierarchy and Codes

| Error Class | Code Range | Scenarios |
|-------------|------------|-----------|
| `InitialisationError` | 100-199 | WASM load failure, library init failure |
| `DocumentError` | 200-299 | File not found, invalid format, password issues |
| `PageError` | 300-399 | Page not found, load failure |
| `RenderError` | 400-499 | Bitmap creation failure, invalid dimensions |
| `MemoryError` | 500-599 | Allocation failure, buffer overflow |
| `TextError` | 600-699 | Text extraction failure |
| `ObjectError` | 700-799 | Unknown object type, access failure |

### 4.3 Symbol.dispose Implementation Pattern

```typescript
// The Disposable base class enables automatic cleanup:

// With explicit using keyword (recommended)
{
  using doc = (await pdfium.openDocument(bytes)).unwrap();
  using page = doc.getPage(0).unwrap();
  const rendered = await page.render({ scale: 2 });
  // page and doc are automatically disposed here
}

// With explicit dispose call
const doc = (await pdfium.openDocument(bytes)).unwrap();
try {
  // use doc
} finally {
  doc.dispose();
}

// FinalizationRegistry provides safety net
// If dispose is forgotten, a warning is logged when GC runs:
// "[PDFium] Resource 'PDFiumDocument' was garbage collected without being disposed..."
```

### 4.4 Worker Abstraction Protocol

The worker uses a request-response pattern with TypeScript discriminated unions:

```typescript
// Message flow:
// 1. Main thread sends WorkerRequest
// 2. Worker processes and sends WorkerResponse
// 3. Large data (ArrayBuffer, Uint8Array) uses Transferable

// Protocol guarantees:
// - Every request gets exactly one SUCCESS or ERROR response
// - PROGRESS events may be sent during long operations
// - Request IDs are unique per message

// Example flow for rendering:
// Main -> Worker: { type: 'RENDER_PAGE', id: '42', payload: {...} }
// Worker -> Main: { type: 'PROGRESS', id: '42', progress: 0.5 }
// Worker -> Main: { type: 'SUCCESS', id: '42', payload: Uint8Array (transferred) }
```

### 4.5 tsup Configuration

```typescript
// Full production configuration:

import { defineConfig } from 'tsup';

export default defineConfig((options) => ({
  entry: {
    index: 'src/index.ts',
    browser: 'src/browser.ts',
    node: 'src/node.ts',
    worker: 'src/worker.ts',
  },
  format: ['esm'],
  target: 'es2024',
  platform: 'neutral',
  dts: {
    resolve: true,
    compilerOptions: {
      moduleResolution: 'bundler',
    },
  },
  sourcemap: !options.watch,
  clean: true,
  splitting: true,
  treeshake: {
    preset: 'recommended',
  },
  minify: !options.watch,
  external: [
    'node:fs',
    'node:fs/promises',
    'node:path',
    'node:url',
    'node:crypto',
  ],
  noExternal: [
    // Bundle all non-Node dependencies
  ],
  esbuildOptions(opts) {
    opts.legalComments = 'none';
    opts.charset = 'utf8';
  },
}));
```

### 4.6 Package Exports Mapping

```json
{
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    },
    "./browser": {
      "types": "./dist/browser.d.ts",
      "import": "./dist/browser.js"
    },
    "./node": {
      "types": "./dist/node.d.ts",
      "import": "./dist/node.js"
    },
    "./worker": {
      "types": "./dist/worker.d.ts",
      "import": "./dist/worker.js"
    },
    "./pdfium.wasm": {
      "default": "./dist/wasm/vendor/pdfium.wasm"
    },
    "./package.json": "./package.json"
  },
  "typesVersions": {
    "*": {
      "browser": ["./dist/browser.d.ts"],
      "node": ["./dist/node.d.ts"],
      "worker": ["./dist/worker.d.ts"]
    }
  }
}
```

---

## 5. Testing Strategy

### 5.1 Test Pyramid

| Level | Coverage | Focus | Tools |
|-------|----------|-------|-------|
| Unit | 70% | Core logic, Result, Errors, Disposable | Vitest |
| Integration | 25% | Document operations, WASM interaction | Vitest |
| E2E | 5% | Full workflows, browser testing | Playwright |

### 5.2 Coverage Targets

| Metric | Target | Hard Minimum |
|--------|--------|--------------|
| Line Coverage | 95%+ | 90% |
| Branch Coverage | 90%+ | 85% |
| Function Coverage | 95%+ | 90% |
| Statement Coverage | 95%+ | 90% |

### 5.3 Mutation Testing

Configuration for Stryker:

```json
{
  "mutator": "typescript",
  "testRunner": "vitest",
  "thresholds": {
    "high": 80,
    "low": 70,
    "break": 60
  },
  "mutate": [
    "src/core/**/*.ts",
    "src/document/**/*.ts",
    "src/render/**/*.ts"
  ],
  "ignorePatterns": [
    "src/wasm/vendor/**"
  ]
}
```

Target mutation score: **80%+**

### 5.4 Visual Regression Approach

```typescript
// test/visual/render.test.ts

import { toMatchImageSnapshot } from 'jest-image-snapshot';
import { describe, it, expect } from 'vitest';

expect.extend({ toMatchImageSnapshot });

describe('Visual Regression', () => {
  it('renders A4 page at 1x scale correctly', async () => {
    const result = await page.render({ scale: 1 });
    const png = await toPNG(result.unwrap().data, result.unwrap().width, result.unwrap().height);

    expect(png).toMatchImageSnapshot({
      customSnapshotIdentifier: 'a4-1x',
      failureThreshold: 0.01,
      failureThresholdType: 'percent',
    });
  });

  it('renders form fields correctly', async () => {
    const result = await page.render({ scale: 2, renderFormFields: true });
    const png = await toPNG(result.unwrap().data, result.unwrap().width, result.unwrap().height);

    expect(png).toMatchImageSnapshot({
      customSnapshotIdentifier: 'form-fields-2x',
    });
  });
});
```

---

## 6. Migration Guide

### 6.1 API Mapping Table

| @hyzyla/pdfium v2 | @jacquesg/pdfium v3 | Notes |
|-------------------|---------------------|-------|
| `PDFiumLibrary.init()` | `PDFium.init()` | Returns `Result<PDFium, InitError>` |
| `library.loadDocument(buff)` | `pdfium.openDocument(data)` | Returns `Result<PDFiumDocument, DocError>` |
| `document.destroy()` | `document.dispose()` or `using` | Automatic with `using` keyword |
| `document.getPage(i)` | `document.getPage(i)` | Returns `Result<PDFiumPage, PageError>` |
| `document.getPageCount()` | `document.pageCount` | Property instead of method |
| `page.render({ scale })` | `page.render({ scale })` | Returns `Result<RenderResult, RenderError>` |
| `page.getText()` | `page.getText()` | Returns `Result<string, TextError>` |
| `page.getSize()` | `page.size` | Property instead of method |
| `throw new Error()` | `return err(new PDFiumError(...))` | Explicit error handling |

### 6.2 Breaking Changes

1. **Package Name**: `@hyzyla/pdfium` -> `@jacquesg/pdfium`
2. **Node.js Version**: Requires Node.js 22+
3. **Module Format**: ESM only (no CommonJS)
4. **Error Handling**: All operations return `Result<T, E>` instead of throwing
5. **Resource Cleanup**: `destroy()` renamed to `dispose()`, supports `using` keyword
6. **Properties vs Methods**: `getPageCount()` -> `pageCount`, `getSize()` -> `size`
7. **Render Function**: Custom render callback signature changed

### 6.3 Migration Code Example

**Before (v2)**:
```typescript
import { PDFiumLibrary } from '@hyzyla/pdfium';

const library = await PDFiumLibrary.init();
try {
  const document = await library.loadDocument(buffer);
  try {
    const page = document.getPage(0);
    const { data } = await page.render({ scale: 2 });
    // use data
  } finally {
    document.destroy();
  }
} finally {
  library.destroy();
}
```

**After (v3)**:
```typescript
import { PDFium } from '@jacquesg/pdfium';

const pdfiumResult = await PDFium.init();
if (pdfiumResult.isErr()) {
  console.error('Init failed:', pdfiumResult.error);
  process.exit(1);
}

using pdfium = pdfiumResult.value;

const docResult = await pdfium.openDocument(buffer);
if (docResult.isErr()) {
  console.error('Open failed:', docResult.error);
  process.exit(1);
}

using document = docResult.value;

const pageResult = document.getPage(0);
if (pageResult.isErr()) {
  console.error('Page failed:', pageResult.error);
  process.exit(1);
}

using page = pageResult.value;

const renderResult = await page.render({ scale: 2 });
const { data } = renderResult.unwrap();
// use data
// All resources automatically disposed when scope exits
```

**Concise pattern with unwrap (when errors are truly exceptional)**:
```typescript
import { PDFium } from '@jacquesg/pdfium';

using pdfium = (await PDFium.init()).unwrap();
using document = (await pdfium.openDocument(buffer)).unwrap();
using page = document.getPage(0).unwrap();
const { data } = (await page.render({ scale: 2 })).unwrap();
```

---

## 7. Success Metrics

### 7.1 Code Quality

| Metric | Target | Measurement |
|--------|--------|-------------|
| Line Coverage | 95%+ | `vitest --coverage` |
| Branch Coverage | 90%+ | `vitest --coverage` |
| Mutation Score | 80%+ | `stryker run` |
| Type Coverage | 100% | No `any` or `unknown` in public API |
| Lint Errors | 0 | `biome check` |

### 7.2 Bundle Size

| Component | Target | Measurement |
|-----------|--------|-------------|
| Core library | < 15KB gzip | `bundlephobia` |
| Worker script | < 5KB gzip | `bundlephobia` |
| WASM binary | ~2.5MB | Cannot reduce without recompiling PDFium |
| Total package | < 3MB | npm package size |

### 7.3 Performance Benchmarks

| Operation | Target | Baseline (v2) |
|-----------|--------|---------------|
| Init (Node.js) | < 100ms | ~80ms |
| Init (Browser, cached WASM) | < 200ms | ~150ms |
| Open document (1MB PDF) | < 50ms | ~40ms |
| Render A4 @ 1x | < 30ms | ~25ms |
| Render A4 @ 3x | < 100ms | ~90ms |
| Text extraction (100 pages) | < 2s | ~1.5s |
| Memory overhead per document | < 5MB | ~4MB |

### 7.4 Developer Experience

| Metric | Target |
|--------|--------|
| TypeScript IntelliSense | 100% public APIs documented |
| Error messages | Include actionable guidance |
| Documentation | All features documented with examples |
| Time to first render | < 5 minutes from npm install |

---

## 8. Risk Assessment

### 8.1 Technical Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| WASM compatibility issues across platforms | Medium | High | Comprehensive E2E tests on Node.js, Chrome, Firefox, Safari |
| FinalizationRegistry timing issues | Low | Medium | Use as safety net only; document that explicit disposal is required |
| Worker message passing overhead | Medium | Medium | Benchmark; use Transferable objects; make workers opt-in |
| ES2024 bundler compatibility | Low | Medium | Document supported bundlers; test with Vite, esbuild, Webpack |
| Bundle size regression | Low | Low | Track size in CI; alert on increase > 10% |

### 8.2 Compatibility Concerns

| Environment | Concern | Mitigation |
|-------------|---------|------------|
| Node.js < 22 | Not supported | Clear engine requirement in package.json |
| CommonJS projects | Not supported | ESM only; document migration path |
| Safari < 16.4 | Symbol.dispose support | Feature detection; fallback to explicit dispose |
| Older bundlers | ES2024 syntax | Document minimum versions; provide transpilation guidance |

### 8.3 Timeline Risks

| Phase | Estimated Duration | Risk Factors |
|-------|-------------------|--------------|
| Phase 0: Bootstrap | 1 day | Low risk |
| Phase 1: Core | 2-3 days | Low risk |
| Phase 2: Document/Page | 4-5 days | Medium risk (WASM complexity) |
| Phase 3: Testing | 3-4 days | Low risk |
| Phase 4: Build | 2 days | Low risk |
| Phase 5: Advanced | 4-5 days | High risk (worker complexity) |
| Phase 6: Docs | 3-4 days | Low risk |

**Total Estimated Duration**: 19-24 days

**Buffer Recommendation**: Add 25% buffer for Phase 5 (workers)

---

## Appendix A: Glossary

| Term | Definition |
|------|------------|
| WASM | WebAssembly binary compiled from PDFium C++ |
| Handle | Integer reference to a resource in WASM memory |
| Pointer | Memory address in WASM linear memory |
| Disposable | Resource that requires explicit cleanup |
| Result | Type representing success or failure |
| Context | Abstraction over WASM execution environment |
| Transfer | Zero-copy ArrayBuffer passing between threads |

---

## Appendix B: References

- [PDFium Documentation](https://pdfium.googlesource.com/pdfium/)
- [TypeScript ES2024 Features](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-2.html)
- [Symbol.dispose Proposal](https://github.com/tc39/proposal-explicit-resource-management)
- [Vitest Documentation](https://vitest.dev/)
- [tsup Documentation](https://tsup.egoist.dev/)
- [Starlight Documentation](https://starlight.astro.build/)

---

## Appendix C: Critical Implementation Files

The following files from the current codebase will require significant modification or replacement:

1. **`src/library.ts`** - Core PDFiumLibrary class requiring complete redesign for Result return types and Symbol.dispose support
2. **`src/document.ts`** - PDFiumDocument class requiring memory management refactor and disposable pattern
3. **`src/page.ts`** - PDFiumPage class with rendering logic that needs Result wrapping and proper disposal
4. **`src/vendor/pdfium.d.ts`** - WASM type definitions that form the foundation for type-safe bindings
5. **`package.json`** - Package configuration requiring complete overhaul for new name, exports, and dependencies
