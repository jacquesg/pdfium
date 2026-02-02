---
title: Installation
description: Installing and configuring @scaryterry/pdfium
---

This guide covers installation and bundler configuration for the library.

## Package Installation

Install using pnpm:

```sh
pnpm add @scaryterry/pdfium
```

Or npm/yarn:

```sh
npm install @scaryterry/pdfium
# or
yarn add @scaryterry/pdfium
```

## Node.js Setup

Node.js 22+ is supported with no additional configuration:

```typescript
import { PDFium } from '@scaryterry/pdfium';

// WASM loads automatically from node_modules
using pdfium = await PDFium.init();
```

## Browser Setup

In the browser, you must provide the WASM binary:

```typescript
import { PDFium } from '@scaryterry/pdfium';

// Fetch WASM binary
const wasmResponse = await fetch('/pdfium.wasm');
const wasmBinary = await wasmResponse.arrayBuffer();

// Initialise with WASM
using pdfium = await PDFium.init({ wasmBinary });
```

## Bundler Configuration

### Vite

```typescript
// vite.config.ts
import { defineConfig } from 'vite';

export default defineConfig({
  optimizeDeps: {
    exclude: ['@scaryterry/pdfium'],
  },
  assetsInclude: ['**/*.wasm'],
});
```

Import and serve the WASM file:

```typescript
import wasmUrl from '@scaryterry/pdfium/pdfium.wasm?url';

const response = await fetch(wasmUrl);
const wasmBinary = await response.arrayBuffer();
using pdfium = await PDFium.init({ wasmBinary });
```

### Webpack

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

### Next.js

```javascript
// next.config.js
module.exports = {
  webpack: (config) => {
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
    };
    return config;
  },
};
```

Copy WASM to public folder:

```bash
cp node_modules/@scaryterry/pdfium/pdfium.wasm public/
```

## WASM Loading Options

### From URL

```typescript
using pdfium = await PDFium.init({
  wasmUrl: '/assets/pdfium.wasm',
});
```

### From ArrayBuffer

```typescript
const wasmBinary = await fetch('/pdfium.wasm').then(r => r.arrayBuffer());
using pdfium = await PDFium.init({ wasmBinary });
```

### From CDN (Not Recommended for Production)

```typescript
const wasmBinary = await fetch(
  'https://unpkg.com/@scaryterry/pdfium/pdfium.wasm'
).then(r => r.arrayBuffer());

using pdfium = await PDFium.init({ wasmBinary });
```

## Resource Limits

Configure limits at initialisation:

```typescript
using pdfium = await PDFium.init({
  limits: {
    maxDocumentSize: 50 * 1024 * 1024,  // 50 MB
    maxRenderDimension: 8192,            // 8192 × 8192 max
    maxTextCharCount: 1_000_000,         // 1 million chars
  },
});
```

## TypeScript Configuration

For ES2024 `using` keyword support:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true
  }
}
```

For older TypeScript (without `using`):

```typescript
const pdfium = await PDFium.init();
try {
  // Use pdfium...
} finally {
  pdfium.dispose();
}
```

## Verifying Installation

```typescript
import { PDFium, VERSION } from '@scaryterry/pdfium';

console.log('Version:', VERSION);

using pdfium = await PDFium.init();
console.log('PDFium initialised successfully');
```

## Native Backend (Optional)

For optimal performance in Node.js, install the native backend for your platform:

```sh
# macOS Apple Silicon
pnpm add @scaryterry/pdfium-darwin-arm64

# macOS Intel
pnpm add @scaryterry/pdfium-darwin-x64

# Linux x64 (glibc)
pnpm add @scaryterry/pdfium-linux-x64-gnu

# Linux ARM64 (glibc)
pnpm add @scaryterry/pdfium-linux-arm64-gnu

# Windows x64
pnpm add @scaryterry/pdfium-win32-x64-msvc
```

Then request the native backend:

```typescript
import { PDFium } from '@scaryterry/pdfium';

// Prefer native, fall back to WASM if unavailable
const pdfium = await PDFium.init({ useNative: true });
```

The native backend is optional. Without it, the library uses the WASM backend which works everywhere.

See [Native vs WASM Backends](/pdfium/concepts/backends/) for details.

## See Also

- [Quick Start](/pdfium/quick-start/) — 5-minute tutorial
- [TypeScript Setup](/pdfium/typescript-setup/) — Detailed TS configuration
- [Browser vs Node.js](/pdfium/concepts/environments/) — Platform differences
- [Native vs WASM Backends](/pdfium/concepts/backends/) — Backend comparison
