---
title: Architecture
description: How @scaryterry/pdfium works under the hood
---

Understanding the library architecture helps you use it effectively and debug issues. This guide explains how PDFium is wrapped for JavaScript/TypeScript.

## High-Level Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Your Application                          │
├─────────────────────────────────────────────────────────────┤
│                 @scaryterry/pdfium (TypeScript)               │
│  ┌─────────┐  ┌──────────────┐  ┌─────────────────────┐    │
│  │ PDFium  │  │ PDFiumDoc... │  │ Error Classes       │    │
│  │ Class   │  │ PDFiumPage   │  │ Type Definitions    │    │
│  └────┬────┘  └──────┬───────┘  └─────────────────────┘    │
│       │              │                                       │
│       └──────────────┴──────────────────────────────────────┤
│                    WASM Bindings Layer                       │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ PDFiumWASM interface + Memory Manager                 │   │
│  └───────────────────────────┬──────────────────────────┘   │
├──────────────────────────────┼──────────────────────────────┤
│                              │                               │
│  ┌───────────────────────────┴──────────────────────────┐   │
│  │              PDFium WASM Binary (Emscripten)          │   │
│  │                                                       │   │
│  │  • Compiled from PDFium C++ source                    │   │
│  │  • ~4MB compressed                                    │   │
│  │  • Runs in WASM sandbox                               │   │
│  └───────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## Component Layers

### 1. PDFium C++ Library

The original PDFium is a C++ library developed by Google:

- Powers Chrome's built-in PDF viewer
- Renders PDF content to bitmaps
- Extracts text, annotations, bookmarks
- Handles PDF security and encryption

### 2. WASM Binary

The C++ code is compiled to WebAssembly using Emscripten:

- **Size**: ~4MB compressed (~12MB uncompressed)
- **Memory**: Grows dynamically (default max ~2GB)
- **Threading**: Single-threaded (no SharedArrayBuffer required)

The WASM binary exposes ~80 functions:

```typescript
// Examples of exposed WASM functions
_FPDF_InitLibraryWithConfig
_FPDF_LoadMemDocument
_FPDF_GetPageCount
_FPDFPage_GetWidth
_FPDFBitmap_Create
_FPDFText_LoadPage
// ... and more
```

### 3. TypeScript Wrapper

The wrapper provides:

- **Type safety**: Branded handles, strict interfaces
- **Resource management**: Disposable pattern
- **Error handling**: Typed errors with codes
- **Memory management**: Allocation/deallocation helpers

## Module Structure

```
@scaryterry/pdfium
├── index.ts           # Public exports
├── pdfium.ts          # Main PDFium class
├── document.ts        # PDFiumDocument class
├── page.ts            # PDFiumPage class
├── builder/
│   ├── document.ts    # PDFiumDocumentBuilder
│   └── page.ts        # PDFiumPageBuilder
├── progressive.ts     # ProgressivePDFLoader
├── worker/
│   └── proxy.ts       # WorkerProxy
├── errors/
│   ├── base.ts        # PDFiumError base class
│   ├── codes.ts       # Error code definitions
│   └── classes.ts     # Specific error classes
├── types/
│   ├── handles.ts     # Branded handle types
│   ├── interfaces.ts  # Public interfaces
│   └── enums.ts       # Enum definitions
└── wasm/
    ├── module.ts      # WASM module loader
    └── memory.ts      # Memory manager
```

## Initialisation Flow

```typescript
const pdfium = await PDFium.init();
```

This triggers:

```
1. Load WASM binary
   ├── Node.js: Read from node_modules
   └── Browser: Fetch from provided URL/ArrayBuffer

2. Instantiate WASM module
   ├── Compile WASM bytecode
   ├── Allocate initial memory (16MB default)
   └── Initialize Emscripten runtime

3. Initialise PDFium library
   ├── Call _FPDF_InitLibraryWithConfig()
   └── Configure internal settings

4. Create memory manager
   └── Setup allocation tracking

5. Return PDFium instance
```

## Document Loading Flow

```typescript
const document = await pdfium.openDocument(data);
```

```
1. Validate input
   └── Check size against limits

2. Allocate WASM memory for PDF data
   ├── Call _malloc(size)
   └── Copy bytes to WASM heap

3. Load document
   ├── Call _FPDF_LoadMemDocument()
   ├── PDFium parses PDF structure
   └── Returns document handle (pointer)

4. Check for errors
   ├── _FPDF_GetLastError()
   └── Map to appropriate error class

5. Initialise form fill environment
   └── Call _FPDFDOC_InitFormFillEnvironment()

6. Create PDFiumDocument wrapper
   └── Wrap handle with TypeScript class
```

## Rendering Flow

```typescript
const result = page.render({ scale: 2 });
```

```
1. Calculate dimensions
   ├── Get page size: _FPDF_GetPageWidth/Height()
   └── Apply scale factor

2. Validate dimensions
   └── Check against maxRenderDimension

3. Create bitmap
   ├── Calculate buffer size (width × height × 4)
   ├── Allocate WASM memory
   └── Call _FPDFBitmap_CreateEx()

4. Fill background
   └── Call _FPDFBitmap_FillRect()

5. Render page to bitmap
   └── Call _FPDF_RenderPageBitmap()

6. Copy pixels to JavaScript
   ├── Create Uint8Array view
   └── Copy from WASM heap

7. Free bitmap
   └── Call _FPDFBitmap_Destroy()

8. Return result
   └── { data, width, height, ... }
```

## Memory Architecture

### WASM Linear Memory

WASM uses a single contiguous memory buffer:

```
┌────────────────────────────────────────────────────────────┐
│                    WASM Linear Memory                       │
├───────────┬───────────┬───────────┬───────────────────────┤
│  Static   │   Stack   │   Heap    │   Growth Space         │
│   Data    │           │           │                        │
├───────────┼───────────┼───────────┼───────────────────────┤
│   ~1MB    │   ~1MB    │  Dynamic  │   Up to ~2GB           │
└───────────┴───────────┴───────────┴───────────────────────┘
```

### Memory Manager

The `WASMMemoryManager` tracks allocations:

```typescript
interface WASMMemoryManager {
  malloc(size: number): WASMPointer;
  free(pointer: WASMPointer): void;
  copyToWASM(data: Uint8Array): WASMAllocation;
  copyFromWASM(pointer: WASMPointer, size: number): Uint8Array;
}
```

### Memory Lifecycle

```
Allocate → Use → Free

// PDF data allocation
const allocation = memory.copyToWASM(pdfData);
// Use allocation.pointer for WASM calls
// ...
memory.free(allocation.pointer);
```

## Handle System

### Branded Types

Handles are branded for type safety:

```typescript
// Prevents mixing handle types
declare const documentBrand: unique symbol;
type DocumentHandle = number & { readonly [documentBrand]: never };

declare const pageBrand: unique symbol;
type PageHandle = number & { readonly [pageBrand]: never };
```

This prevents:

```typescript
// TypeScript error: Can't use PageHandle where DocumentHandle expected
function closeDocument(handle: DocumentHandle) { ... }
closeDocument(pageHandle); // ✗ Type error
```

### Handle Types

| Handle Type | WASM Pointer To | Used By |
|-------------|-----------------|---------|
| `DocumentHandle` | `FPDF_DOCUMENT` | `PDFiumDocument` |
| `PageHandle` | `FPDF_PAGE` | `PDFiumPage` |
| `FormHandle` | `FPDF_FORMHANDLE` | Form rendering |
| `TextPageHandle` | `FPDF_TEXTPAGE` | Text extraction |
| `BitmapHandle` | `FPDF_BITMAP` | Rendering |
| `SearchHandle` | `FPDF_SCHHANDLE` | Text search |

## Error Translation

WASM errors are translated to TypeScript errors:

```
WASM Error Code → Native Error Code → PDFiumErrorCode → Error Class

FPDF_GetLastError()
     ↓
  FPDF_ERR_PASSWORD (4)
     ↓
  PDFiumErrorCode.DOC_PASSWORD_REQUIRED (202)
     ↓
  DocumentError
```

## Platform Differences

### Node.js

```typescript
// WASM loaded from node_modules
const wasmPath = require.resolve('@scaryterry/pdfium/pdfium.wasm');
const wasmBinary = fs.readFileSync(wasmPath);
```

- File system access available
- Larger memory limits
- No worker URL restrictions

### Browser

```typescript
// WASM fetched from URL
const response = await fetch('/pdfium.wasm');
const wasmBinary = await response.arrayBuffer();
```

- WASM must be served with correct MIME type
- CORS restrictions apply
- Web Workers require same-origin policy
- Memory limited by browser

## Performance Characteristics

### Time Complexity

| Operation | Complexity | Notes |
|-----------|------------|-------|
| Open document | O(n) | n = file size |
| Get page count | O(1) | Cached |
| Load page | O(n) | n = page complexity |
| Render page | O(w×h) | w×h = dimensions |
| Extract text | O(n) | n = character count |
| Search text | O(n×m) | n = text, m = query |

### Memory Usage

| Resource | Typical Size |
|----------|--------------|
| WASM binary | ~12MB |
| Per document | 1-10MB (varies) |
| Per page | 10KB-1MB |
| Render bitmap | width×height×4 bytes |

## Threading Model

The library is single-threaded by design:

- All WASM calls run on the calling thread
- No SharedArrayBuffer required
- Use `WorkerProxy` for off-main-thread processing

```typescript
// Main thread (blocks during operations)
const result = page.render({ scale: 3 }); // Synchronous

// Worker (doesn't block main thread)
await using proxy = await WorkerProxy.create(url, binary);
const result = await proxy.renderPage(docId, 0, { scale: 3 });
```

## See Also

- [Resource Management](/pdfium/concepts/resource-management/) — Disposal patterns
- [Memory Management](/pdfium/concepts/memory/) — WASM memory details
- [Performance](/pdfium/concepts/performance/) — Optimisation tips
- [Browser vs Node.js](/pdfium/concepts/environments/) — Platform differences
