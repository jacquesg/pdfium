---
title: Quick Start
description: Get started with @scaryterry/pdfium in 5 minutes
---

This guide walks you through rendering a PDF to an image in just a few steps.

## Prerequisites

- Node.js 22+ or modern browser
- TypeScript (recommended) or JavaScript

## 1. Install the Package

```sh
pnpm add @scaryterry/pdfium
```

## 2. Create a Script

```typescript
// render-pdf.ts
import { PDFium } from '@scaryterry/pdfium';
import { promises as fs } from 'fs';
import sharp from 'sharp';

async function main() {
  // Read PDF file
  const pdfData = await fs.readFile('document.pdf');

  // Initialise the library
  using pdfium = await PDFium.init();

  // Open the document
  using document = await pdfium.openDocument(pdfData);

  console.log(`Document has ${document.pageCount} pages`);

  // Render the first page
  using page = document.getPage(0);

  const { data, width, height } = page.render({ scale: 2 });

  // Convert to PNG using sharp
  const png = await sharp(data, {
    raw: { width, height, channels: 4 },
  }).png().toBuffer();

  // Save the image
  await fs.writeFile('page-1.png', png);

  console.log(`Rendered page 1 as ${width}x${height} PNG`);
}

main();
```

## 3. Run It

```sh
npx tsx render-pdf.ts
```

## What's Happening?

1. **`PDFium.init()`** — Loads the WASM binary and initialises the library
2. **`openDocument()`** — Parses the PDF and returns a document object
3. **`getPage(0)`** — Loads the first page (zero-indexed)
4. **`render({ scale: 2 })`** — Renders at 2x scale (144 DPI) to RGBA pixels
5. **`sharp`** — Converts raw pixels to PNG format

## The `using` Keyword

The `using` keyword ensures resources are automatically cleaned up:

```typescript
using pdfium = await PDFium.init();
// pdfium.dispose() is called automatically when the scope ends
```

This is ES2024 explicit resource management. Without it:

```typescript
const pdfium = await PDFium.init();
try {
  // Use pdfium...
} finally {
  pdfium.dispose(); // Must manually dispose
}
```

## Render All Pages

```typescript
for (const page of document.pages()) {
  using p = page;

  const { data, width, height } = p.render({ scale: 2 });

  const png = await sharp(data, {
    raw: { width, height, channels: 4 },
  }).png().toBuffer();

  await fs.writeFile(`page-${p.index + 1}.png`, png);
}
```

## Extract Text

```typescript
using page = document.getPage(0);
const text = page.getText();
console.log(text);
```

## Handle Password-Protected PDFs

```typescript
using document = await pdfium.openDocument(pdfData, {
  password: 'secret123',
});
```

## Browser Usage

```typescript
// Load WASM first
const wasmResponse = await fetch('/pdfium.wasm');
const wasmBinary = await wasmResponse.arrayBuffer();

using pdfium = await PDFium.init({ wasmBinary });

// Load PDF from file input or fetch
const pdfData = await file.arrayBuffer();
using document = await pdfium.openDocument(pdfData);
```

## Next Steps

- [Render PDF Guide](/pdfium/guides/render-pdf/) — Detailed rendering options
- [Extract Text Guide](/pdfium/guides/extract-text/) — Text extraction patterns
- [API Reference](/pdfium/api/classes/pdfium/) — Complete API documentation
- [Resource Management](/pdfium/concepts/resource-management/) — Understanding disposal

## Common Issues

### "Cannot find module" Error

Ensure the package is installed:

```sh
pnpm add @scaryterry/pdfium
```

### WASM Loading Fails (Browser)

Make sure the WASM file is served with correct MIME type:

```
Content-Type: application/wasm
```

### Out of Memory

Reduce scale or process pages sequentially:

```typescript
// Lower scale uses less memory
const result = page.render({ scale: 1 });

// Process pages one at a time
for (const page of document.pages()) {
  using p = page;
  // Process and save immediately
}
```
