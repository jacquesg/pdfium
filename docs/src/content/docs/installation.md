---
title: Installation
description: Install @scaryterry/pdfium and configure WASM and worker assets correctly for Node.js, browser, and React.
---

This guide is intentionally explicit about what must be configured in each runtime.

## 1. Install the Package

```sh
pnpm add @scaryterry/pdfium
```

React users also need peers:

```sh
pnpm add react react-dom lucide-react
```

## 2. Environment Setup Matrix

| Environment | Required setup |
|---|---|
| Node.js core API | No extra asset wiring needed for basic `PDFium.init()` |
| Browser core API | Provide `wasmUrl` or `wasmBinary` to `PDFium.init(...)` |
| React viewer (`PDFiumProvider`) | Provide `workerUrl` and (`wasmUrl` or `wasmBinary`) |
| Worker mode with core API | Create worker entry module and pass `workerUrl` |

## 3. Node.js Setup

```ts
import { PDFium } from '@scaryterry/pdfium';

using pdfium = await PDFium.init();
```

## 4. Browser Setup (Core API)

```ts
import { PDFium } from '@scaryterry/pdfium';

const wasmBinary = await fetch('/pdfium.wasm').then((r) => r.arrayBuffer());
using pdfium = await PDFium.init({ wasmBinary });
```

You can also pass `wasmUrl` directly:

```ts
using pdfium = await PDFium.init({ wasmUrl: '/pdfium.wasm' });
```

## 5. Canonical Worker Module (React + Worker Mode)

Create a worker entry in your app:

```ts
// src/pdfium.worker.ts
import '@scaryterry/pdfium/worker';
```

Resolve its URL:

```ts
const workerUrl = new URL('./pdfium.worker.ts', import.meta.url).toString();
```

## 6. React Provider Bootstrap

```tsx
import wasmUrl from '@scaryterry/pdfium/pdfium.wasm?url';
import { PDFiumProvider, PDFViewer } from '@scaryterry/pdfium/react';

const workerUrl = new URL('./pdfium.worker.ts', import.meta.url).toString();

function App() {
  return (
    <PDFiumProvider wasmUrl={wasmUrl} workerUrl={workerUrl}>
      <PDFViewer />
    </PDFiumProvider>
  );
}
```

## 7. Asset Wiring Strategies

### Strategy A: Bundler-managed asset URLs (recommended)

Use your bundler to emit both worker and WASM URLs.

Vite example:

```ts
// vite.config.ts
import { defineConfig } from 'vite';

export default defineConfig({
  optimizeDeps: { exclude: ['@scaryterry/pdfium'] },
  assetsInclude: ['**/*.wasm'],
});
```

```ts
import wasmUrl from '@scaryterry/pdfium/pdfium.wasm?url';
const workerUrl = new URL('./pdfium.worker.ts', import.meta.url).toString();
```

### Strategy B: Serve WASM from `public/`

Copy the WASM file into your public assets:

```sh
cp node_modules/@scaryterry/pdfium/dist/vendor/pdfium.wasm public/pdfium.wasm
```

Then use:

```ts
const wasmUrl = '/pdfium.wasm';
```

Keep the worker as a bundled module (`src/pdfium.worker.ts`) and pass the emitted `workerUrl`.
Do not copy only `dist/worker.js`; it imports sibling modules.

## 8. Next.js Notes

Enable async WASM in webpack:

```js
// next.config.js
module.exports = {
  webpack: (config) => {
    config.experiments = { ...config.experiments, asyncWebAssembly: true };
    return config;
  },
};
```

If you serve from `public`, copy:

```sh
cp node_modules/@scaryterry/pdfium/dist/vendor/pdfium.wasm public/pdfium.wasm
```

## 9. Optional Native Backend (Node.js)

Install platform package(s):

```sh
pnpm add @scaryterry/pdfium-darwin-arm64
pnpm add @scaryterry/pdfium-darwin-x64
pnpm add @scaryterry/pdfium-linux-x64-gnu
pnpm add @scaryterry/pdfium-linux-arm64-gnu
pnpm add @scaryterry/pdfium-win32-x64-msvc
```

Then request native:

```ts
import { PDFium } from '@scaryterry/pdfium';
const pdfium = await PDFium.init({ useNative: true });
```

## 10. Verify Installation

```ts
import { PDFium, VERSION } from '@scaryterry/pdfium';

console.log('version', VERSION);
using pdfium = await PDFium.init();
console.log('ok');
```

## See Also

- [Quick Start](/pdfium/quick-start/)
- [React Overview](/pdfium/react/)
- [Worker Mode Guide](/pdfium/guides/worker-mode/)
- [Backends](/pdfium/concepts/backends/)
