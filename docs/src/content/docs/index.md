---
title: Introduction
description: A modern TypeScript wrapper for PDFium WebAssembly
---

`@scaryterry/pdfium` is a TypeScript/JavaScript wrapper for the [PDFium](https://pdfium.googlesource.com/pdfium/) library, compiled to WebAssembly for use in Node.js and modern browsers.

- **[PDFium](https://pdfium.googlesource.com/pdfium/)** — An open-source library for PDF manipulation and rendering, developed by Google and used in Google Chrome.
- **[@scaryterry/pdfium](https://github.com/jacquesg/pdfium)** — A modern TypeScript wrapper with type safety, automatic resource management, and structured error handling.

## Features

- **Zero dependencies** — PDFium is compiled to WebAssembly and bundled with the package.
- **Type-safe** — Full TypeScript support with branded types and strict mode.
- **Automatic resource cleanup** — `Symbol.dispose` support (`using` keyword).
- **Typed exceptions** — Error subclasses with error codes for precise handling.
- **Universal** — Works in Node.js 22+ and modern browsers.

## Capabilities

| Feature | Description |
|---------|-------------|
| **Render pages** | Convert PDF pages to RGBA pixel data |
| **Extract text** | Get text content with position information |
| **Search text** | Find text with bounding rectangles |
| **Read annotations** | Access all 28 annotation types |
| **Read bookmarks** | Navigate document outlines |
| **Extract attachments** | Get embedded files |
| **Read structure** | Access tagged PDF structure trees |
| **Create documents** | Build PDFs from scratch |
| **Save documents** | Save with various options |

## Quick Example

```typescript
import { PDFium } from '@scaryterry/pdfium';
import { promises as fs } from 'fs';
import sharp from 'sharp';

async function renderFirstPage() {
  const pdfData = await fs.readFile('document.pdf');

  using pdfium = await PDFium.init();
  using document = await pdfium.openDocument(pdfData);
  using page = document.getPage(0);

  const { data, width, height } = page.render({ scale: 2 });

  const png = await sharp(data, {
    raw: { width, height, channels: 4 },
  }).png().toBuffer();

  await fs.writeFile('page-1.png', png);
}
```

## Installation

```sh
pnpm add @scaryterry/pdfium
```

See [Installation](/pdfium/installation/) for bundler configuration.

## Platform Support

| Platform | Status | Notes |
|----------|--------|-------|
| Node.js 22+ | ✅ Full support | WASM loads automatically |
| Modern browsers | ✅ Full support | Requires WASM URL/binary |
| React/Vite/Next.js | ✅ Full support | See bundler config |
| Web Workers | ✅ Full support | For off-main-thread processing |

## TypeScript Support

The library is written in TypeScript with strict mode:

- Branded handle types prevent mixing document/page handles
- Typed error classes with specific error codes
- Full interface definitions for all options and results
- Support for ES2024 `using` keyword

## Use Cases

### PDF Rendering

Convert PDF pages to images for:
- Thumbnail generation
- Document preview
- Print preparation
- Image extraction

### Text Processing

Extract and search text for:
- Full-text indexing
- Content analysis
- Data extraction
- Accessibility

### Document Analysis

Inspect PDF structure for:
- Bookmark extraction
- Attachment handling
- Annotation processing
- Structure tree navigation

### PDF Generation

Create documents for:
- Report generation
- Invoice creation
- Certificate production
- Form generation

## Next Steps

- [Quick Start](/pdfium/quick-start/) — 5-minute tutorial
- [Installation](/pdfium/installation/) — Setup and configuration
- [Render PDF](/pdfium/guides/render-pdf/) — Rendering guide
- [API Reference](/pdfium/api/classes/pdfium/) — Complete API docs


