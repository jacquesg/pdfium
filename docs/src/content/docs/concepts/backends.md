---
title: Native vs WASM Backends
description: Understanding the two PDF processing backends and when to use each
---

This library offers two backends for PDF processing: **WASM** (WebAssembly) and **Native** (Node.js addon). Both provide the same high-level API but differ in setup, performance, and feature coverage.

## Overview

| Aspect | WASM Backend | Native Backend |
|--------|--------------|----------------|
| **Environments** | Browser + Node.js | Node.js only |
| **Setup** | Zero config | Platform packages required |
| **Performance** | Excellent | Faster (no marshalling) |
| **Security** | Sandboxed | Native process |
| **Dependencies** | None | Platform-specific binary |
| **Feature coverage** | Complete | Core features |

## WASM Backend (Default)

The WASM backend runs PDFium compiled to WebAssembly. It works everywhere and requires no additional setup in Node.js.

### Advantages

- **Universal**: Works in browsers and Node.js
- **Zero dependencies**: No native compilation required
- **Sandboxed**: Memory isolation for security
- **Full features**: Complete API including forms, progressive loading, document creation

### Usage

```typescript
import { PDFium } from '@scaryterry/pdfium';

// Default initialisation uses WASM
using pdfium = await PDFium.init();
```

In browsers, provide the WASM binary:

```typescript
const wasmResponse = await fetch('/pdfium.wasm');
const wasmBinary = await wasmResponse.arrayBuffer();

using pdfium = await PDFium.init({ wasmBinary });
```

### When to Use

- Browser applications
- Cross-platform Node.js scripts
- When you need full feature coverage (forms, document creation)
- When sandboxing is important

## Native Backend (Node.js)

The native backend uses platform-specific compiled binaries via Node.js native addons. It provides faster performance by eliminating WASM marshalling overhead.

### Advantages

- **Faster**: Direct C++ calls without WASM marshalling
- **Lower latency**: Reduced per-operation overhead
- **Better memory**: Native memory management

### Platform Packages

Install the package for your platform:

| Platform | Package |
|----------|---------|
| macOS Apple Silicon | `@scaryterry/pdfium-darwin-arm64` |
| macOS Intel | `@scaryterry/pdfium-darwin-x64` |
| Linux x64 (glibc) | `@scaryterry/pdfium-linux-x64-gnu` |
| Linux ARM64 (glibc) | `@scaryterry/pdfium-linux-arm64-gnu` |
| Windows x64 | `@scaryterry/pdfium-win32-x64-msvc` |

```sh
# macOS Apple Silicon
pnpm add @scaryterry/pdfium-darwin-arm64

# Linux x64
pnpm add @scaryterry/pdfium-linux-x64-gnu
```

### Usage

```typescript
import { PDFium } from '@scaryterry/pdfium';

// Request native backend (falls back to WASM if unavailable)
const pdfium = await PDFium.init({ useNative: true });

// Check which backend was loaded
if (pdfium instanceof NativePDFiumInstance) {
  console.log('Using native backend');
}
```

### Force WASM Mode

To explicitly use WASM even when native is available:

```typescript
// Always use WASM backend
using pdfium = await PDFium.init({ forceWasm: true });
```

This is useful for:
- Benchmarking WASM performance
- Testing WASM code paths
- Ensuring consistent behaviour across environments

### When to Use

- High-throughput Node.js servers
- Batch processing large numbers of PDFs
- When performance is critical
- When you only need core features (rendering, text extraction)

## Backend Selection

```typescript
import { PDFium, NativePDFiumInstance } from '@scaryterry/pdfium';

// Automatic selection (WASM by default)
const pdfium = await PDFium.init();

// Prefer native, fallback to WASM
const pdfiumNative = await PDFium.init({ useNative: true });

// Force WASM (skip native detection)
const pdfiumWasm = await PDFium.init({ forceWasm: true });

// Native only (null if unavailable)
const nativeOnly = await PDFium.initNative();
if (nativeOnly) {
  // Use native backend
  nativeOnly.dispose();
}
```

## API Compatibility

Both backends share a similar API for common operations:

| Operation | WASM | Native |
|-----------|------|--------|
| Open document | `pdfium.openDocument(data)` | `pdfium.openDocument(data)` |
| Get page count | `doc.pageCount` | `doc.pageCount` |
| Get page | `doc.getPage(index)` | `doc.getPage(index)` |
| Iterate pages | `doc.pages()` | `doc.pages()` |
| Render page | `page.render(options)` | `page.render(options)` |
| Extract text | `page.getText()` | `page.getText()` |
| Find text | `page.findText(query)` | `page.findText(query)` |
| Get bookmarks | `doc.getBookmarks()` | `doc.getBookmarks()` |
| Get annotations | `page.getAnnotations()` | `page.getAnnotations()` |
| Save document | `doc.save()` | `doc.save()` |

## Feature Coverage

The native backend supports core PDF operations but does not implement all WASM features:

| Feature | WASM | Native | Notes |
|---------|------|--------|-------|
| Document load/save | ✓ | ✓ | Full support |
| Text extraction | ✓ | ✓ | Full character API |
| Page rendering | ✓ | ✓ | RGBA output |
| Annotations | ✓ | ✓ | Read/write |
| Bookmarks/links | ✓ | ✓ | Full support |
| Metadata | ✓ | ✓ | All fields |
| Attachments | ✓ | ✓ | Full support |
| Signatures | ✓ | ✓ | Read-only |
| **Interactive forms** | ✓ | ✗ | WASM only |
| **PDF creation** | ✓ | ✗ | DocumentBuilder |
| **Progressive loading** | ✓ | ✗ | ProgressivePDFLoader |
| **Page object editing** | ✓ | ✗ | Create/modify objects |

### WASM-Only Features

The following features require the WASM backend:

**Interactive Forms**
- Form fill environment with event callbacks
- Interactive field manipulation
- Use case: Browser-based form filling

**PDF Creation**
- `PDFiumDocumentBuilder` for creating PDFs from scratch
- Adding pages, text, shapes
- Use case: Server-side PDF generation

**Progressive Loading**
- `ProgressivePDFLoader` for streaming large PDFs
- Linearisation detection and incremental loading
- Use case: Loading large PDFs over slow connections

**Page Object Editing**
- Creating and modifying page objects
- Adding text, images, paths to existing pages
- Use case: PDF manipulation and enhancement

These features remain WASM-only because:
1. They require callback functions and function pointers
2. Memory ownership is complex across FFI boundaries
3. Use cases are primarily browser-centric
4. Native backend targets batch processing workflows

## Performance Comparison

In benchmarks on typical hardware:

| Operation | WASM | Native | Improvement |
|-----------|------|--------|-------------|
| Document load | 2.5ms | 1.8ms | ~1.4x |
| Page render (1x) | 15ms | 12ms | ~1.25x |
| Text extraction | 0.8ms | 0.5ms | ~1.6x |
| Character operations | 0.3ms | 0.15ms | ~2x |

Performance gains are most noticeable in:
- High-frequency operations (character-level access)
- Batch processing (many documents)
- Large documents with many pages

## Choosing a Backend

### Use WASM when:

- Building browser applications
- Creating PDFs from scratch (`PDFiumDocumentBuilder`)
- Using interactive forms
- Using progressive loading
- Cross-platform compatibility is important

### Use Native when:

- Building Node.js servers with high PDF throughput
- Batch processing large numbers of PDFs
- Performance is critical
- You only need core features

### Hybrid Approach

For maximum flexibility, check native availability at runtime:

```typescript
import { PDFium, NativePDFiumInstance } from '@scaryterry/pdfium';

async function createPDFProcessor() {
  const pdfium = await PDFium.init({ useNative: true });

  const isNative = pdfium instanceof NativePDFiumInstance;
  console.log(`Using ${isNative ? 'native' : 'WASM'} backend`);

  return pdfium;
}
```

## See Also

- [Installation Guide](/pdfium/installation/) — Platform setup
- [Troubleshooting Native Backend](/pdfium/guides/native-troubleshooting/) — Common issues
- [Performance Guide](/pdfium/concepts/performance/) — Optimisation tips
- [Browser vs Node.js](/pdfium/concepts/environments/) — Platform differences
