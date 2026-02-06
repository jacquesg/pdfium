---
title: Browser vs Node.js
description: Platform-specific considerations for @scaryterry/pdfium
---

The library works in both Node.js and browser environments, but there are important differences in setup and capabilities.

## Node.js

Node.js supports two backends: **WASM** (default) and **Native** (optional, faster).

### Setup

WASM loads automatically from `node_modules`:

```typescript
import { PDFium } from '@scaryterry/pdfium';

// No configuration needed
using pdfium = await PDFium.init();
```

### Advantages

- **Automatic WASM loading**: No URL configuration
- **File system access**: Read/write PDFs directly
- **More memory**: System memory limits
- **No CORS**: Local file access without restrictions

### Example

```typescript
import { PDFium } from '@scaryterry/pdfium';
import { promises as fs } from 'fs';

async function processPDF(inputPath: string, outputPath: string) {
  const data = await fs.readFile(inputPath);

  using pdfium = await PDFium.init();
  using document = await pdfium.openDocument(data);

  for (const page of document.pages()) {
    using p = page;
    const text = p.getText();
    console.log(`Page ${p.index + 1}: ${text.slice(0, 100)}...`);
  }

  const output = document.save();
  await fs.writeFile(outputPath, output);
}
```

## Browser

### Setup

You must provide the WASM binary:

```typescript
import { PDFium } from '@scaryterry/pdfium';

// Option 1: Fetch from URL
const wasmResponse = await fetch('/pdfium.wasm');
const wasmBinary = await wasmResponse.arrayBuffer();
using pdfium = await PDFium.init({ wasmBinary });

// Option 2: Import as asset (bundler-dependent)
import wasmUrl from '@scaryterry/pdfium/pdfium.wasm?url';
const response = await fetch(wasmUrl);
const binary = await response.arrayBuffer();
using pdfium = await PDFium.init({ wasmBinary: binary });
```

### WASM Configuration

#### Vite

```typescript
// vite.config.ts
export default {
  optimizeDeps: {
    exclude: ['@scaryterry/pdfium'],
  },
  assetsInclude: ['**/*.wasm'],
};
```

```typescript
// Usage
import wasmUrl from '@scaryterry/pdfium/pdfium.wasm?url';

const response = await fetch(wasmUrl);
const wasmBinary = await response.arrayBuffer();
using pdfium = await PDFium.init({ wasmBinary });
```

#### Webpack

```javascript
// webpack.config.js
module.exports = {
  experiments: {
    asyncWebAssembly: true,
  },
  module: {
    rules: [
      {
        test: /\.wasm$/,
        type: 'asset/resource',
      },
    ],
  },
};
```

### Considerations

- **CORS**: WASM must be served from same origin or with proper headers
- **MIME type**: Server must send `application/wasm`
- **Memory**: Browser memory limits apply
- **Workers**: Consider off-main-thread processing

### Example

```typescript
import { PDFium } from '@scaryterry/pdfium';

async function renderPDF(pdfUrl: string, wasmUrl: string) {
  // Load WASM
  const wasmResponse = await fetch(wasmUrl);
  const wasmBinary = await wasmResponse.arrayBuffer();

  using pdfium = await PDFium.init({ wasmBinary });

  // Load PDF
  const pdfResponse = await fetch(pdfUrl);
  const pdfData = await pdfResponse.arrayBuffer();

  using document = await pdfium.openDocument(pdfData);
  using page = document.getPage(0);

  // Render to canvas
  const { data, width, height } = page.render({ scale: 2 });

  const canvas = document.getElementById('pdf-canvas') as HTMLCanvasElement;
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d')!;
  const imageData = new ImageData(
    new Uint8ClampedArray(data),
    width,
    height
  );
  ctx.putImageData(imageData, 0, 0);
}
```

### Native Backend (Optional)

For higher performance, Node.js can use a native backend:

```typescript
import { PDFium } from '@scaryterry/pdfium';

// Prefer native, fall back to WASM
const pdfium = await PDFium.init({ useNative: true });
```

Install the platform package first:

```bash
pnpm add @scaryterry/pdfium-darwin-arm64  # macOS Apple Silicon
pnpm add @scaryterry/pdfium-linux-x64-gnu # Linux x64
```

See [Native vs WASM Backends](/pdfium/concepts/backends/) for details.

## Entry Points

The package provides several sub-path exports for different environments and use cases:

| Sub-path | Description |
|----------|-------------|
| `@scaryterry/pdfium` | Main auto-detecting entry — re-exports everything |
| `@scaryterry/pdfium/browser` | Browser-specific — excludes native backend classes |
| `@scaryterry/pdfium/node` | Node.js-specific — auto-loads WASM from `node_modules` |
| `@scaryterry/pdfium/worker` | Self-executing Web Worker script for off-main-thread processing |
| `@scaryterry/pdfium/internal` | Low-level handles, constants, and WASM helpers (advanced usage) |
| `@scaryterry/pdfium/types` | Type-only export — interfaces, enums, and type definitions |
| `@scaryterry/pdfium/pdfium.wasm` | Raw WASM binary for manual loading |

### When to Use Each Entry Point

**Main entry** — use for most applications. It detects the environment and selects the appropriate backend:

```typescript
import { PDFium } from '@scaryterry/pdfium';
```

**Browser entry** — use when bundling for the browser to avoid importing Node.js-specific code:

```typescript
import { PDFium } from '@scaryterry/pdfium/browser';
```

**Node entry** — use in Node.js when you want automatic WASM loading from the filesystem:

```typescript
import { PDFium } from '@scaryterry/pdfium/node';
```

**Worker entry** — pass the URL of this entry point when creating a `WorkerProxy`. It is self-executing and should not be imported directly:

```typescript
const workerUrl = new URL('@scaryterry/pdfium/worker', import.meta.url);
```

**Types entry** — use for type-only imports in libraries that depend on PDFium types without importing runtime code:

```typescript
import type { RenderResult, PageObjectType } from '@scaryterry/pdfium/types';
```

**Internal entry** — for advanced use cases that need direct access to WASM handles or memory utilities. This API is not covered by semver guarantees.

## Feature Comparison

| Feature | Node.js (WASM) | Node.js (Native) | Browser |
|---------|---------------|------------------|---------|
| WASM loading | Automatic | N/A | Manual (fetch) |
| File system | Native `fs` | Native `fs` | File API / fetch |
| Memory limit | System RAM | System RAM | Browser limit (~2-4GB) |
| Web Workers | N/A | N/A | Recommended for large PDFs |
| CORS | N/A | N/A | Required for cross-origin |
| Performance | Very good | Faster | Depends on device |
| Feature coverage | Complete | Core features | Complete |

## File Handling

### Node.js

```typescript
import { promises as fs } from 'fs';

// Read file
const data = await fs.readFile('input.pdf');

// Write file
await fs.writeFile('output.pdf', bytes);
```

### Browser

```typescript
// From file input
async function handleFileInput(file: File) {
  const data = await file.arrayBuffer();
  using document = await pdfium.openDocument(data);
  // ...
}

// From URL
async function loadFromURL(url: string) {
  const response = await fetch(url);
  const data = await response.arrayBuffer();
  using document = await pdfium.openDocument(data);
  // ...
}

// Download result
function downloadPDF(bytes: Uint8Array, filename: string) {
  const blob = new Blob([bytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();

  URL.revokeObjectURL(url);
}
```

## Image Output

### Node.js (sharp)

```typescript
import sharp from 'sharp';

const { data, width, height } = page.render({ scale: 2 });

// Save as PNG
await sharp(data, { raw: { width, height, channels: 4 } })
  .png()
  .toFile('output.png');

// Save as JPEG
await sharp(data, { raw: { width, height, channels: 4 } })
  .jpeg({ quality: 90 })
  .toFile('output.jpg');
```

### Browser (Canvas)

```typescript
const { data, width, height } = page.render({ scale: 2 });

const canvas = document.createElement('canvas');
canvas.width = width;
canvas.height = height;

const ctx = canvas.getContext('2d')!;
const imageData = new ImageData(
  new Uint8ClampedArray(data),
  width,
  height
);
ctx.putImageData(imageData, 0, 0);

// Convert to blob
canvas.toBlob((blob) => {
  // Use blob...
}, 'image/png');

// Or data URL
const dataUrl = canvas.toDataURL('image/png');
```

## Workers

### Browser Workers

For large PDFs, use Web Workers:

```typescript
// See Worker Mode guide for details
import { PDFium } from '@scaryterry/pdfium';

await using pdfium = await PDFium.init({
  useWorker: true,
  workerUrl,
  wasmBinary,
});
await using document = await pdfium.openDocument(pdfData);
```

### Node.js Workers

Node.js worker threads are supported automatically in high-level worker mode:

```typescript
import { PDFium } from '@scaryterry/pdfium/node';

await using pdfium = await PDFium.init({
  useWorker: true,
  workerUrl: new URL('./pdf-worker.js', import.meta.url),
  wasmBinary,
});
await using document = await pdfium.openDocument(pdfData);
const page = await document.renderPage(0, { scale: 2 });
```

## Testing

### Jest (Node.js)

```javascript
// jest.config.js
module.exports = {
  testEnvironment: 'node',
  transformIgnorePatterns: [
    '/node_modules/(?!@scaryterry/pdfium)',
  ],
};
```

### Vitest (Browser)

```typescript
// vitest.config.ts
export default {
  test: {
    environment: 'jsdom',
    setupFiles: ['./test/setup.ts'],
  },
};
```

## See Also

- [Installation Guide](/pdfium/installation/) — Platform setup
- [Native vs WASM Backends](/pdfium/concepts/backends/) — Backend comparison
- [Worker Mode](/pdfium/guides/worker-mode/) — Browser workers
- [Node.js Examples](/pdfium/examples/nodejs/) — Server-side examples
- [Browser Examples](/pdfium/examples/browser/) — Client-side examples
