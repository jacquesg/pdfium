# @scaryterry/pdfium

`@scaryterry/pdfium` is a TypeScript PDF platform built on Google PDFium.

It has two public surfaces:

1. **Core API** (`@scaryterry/pdfium`) for PDF read/write/render workflows in Node.js and browsers.
2. **React viewer toolkit** (`@scaryterry/pdfium/react`) for production viewer UIs (provider, viewer, toolbar, hooks, panels).

## Who This Is For

- Teams building backend or frontend PDF workflows with one API.
- Teams that need a ready viewer, but still want low-level control when needed.
- Teams that want Node.js and browser support without switching libraries.

This project is not only a raw WASM wrapper and not only a viewer. It is both.

## Install

```sh
pnpm add @scaryterry/pdfium
```

If you use React components, also install peer dependencies:

```sh
pnpm add react react-dom lucide-react
```

## Choose Your Entry Point

- `import { PDFium } from '@scaryterry/pdfium'` for core document/page APIs.
- `import { PDFiumProvider, PDFViewer } from '@scaryterry/pdfium/react'` for React UI.
- `import '@scaryterry/pdfium/worker'` for worker entry modules.
- `import wasmUrl from '@scaryterry/pdfium/pdfium.wasm?url'` (bundlers that support asset URLs).

If you only need programmatic PDF processing, start with the core API.
If you need a viewer UI quickly, start with the React toolkit.

## Quick Start (Core API)

```ts
import { PDFium } from '@scaryterry/pdfium';
import { readFile } from 'node:fs/promises';

const pdfBytes = await readFile('document.pdf');

using pdfium = await PDFium.init();
using doc = await pdfium.openDocument(pdfBytes);
using page = doc.getPage(0);

console.log('pages:', doc.pageCount);
console.log('first page text length:', page.getText().length);

const rendered = page.render({ scale: 2 });
console.log('rgba bytes:', rendered.data.length, 'size:', rendered.width, 'x', rendered.height);
```

## Quick Start (React Viewer)

Create an app worker entry:

```ts
// src/pdfium.worker.ts
import '@scaryterry/pdfium/worker';
```

Then wire provider + viewer:

```tsx
import wasmUrl from '@scaryterry/pdfium/pdfium.wasm?url';
import { PDFiumProvider, PDFViewer } from '@scaryterry/pdfium/react';

const workerUrl = new URL('./pdfium.worker.ts', import.meta.url).toString();

export function App({ pdfBytes }: { pdfBytes: ArrayBuffer }) {
  return (
    <PDFiumProvider
      wasmUrl={wasmUrl}
      workerUrl={workerUrl}
      initialDocument={{ data: pdfBytes, name: 'document.pdf' }}
    >
      <div style={{ height: '100vh' }}>
        <PDFViewer />
      </div>
    </PDFiumProvider>
  );
}
```

## Verify in 60 Seconds

- Core path: `PDFium.init()` succeeds and you can open a document.
- React path: `PDFiumProvider` mounts with valid `workerUrl` and `wasmUrl`/`wasmBinary`.
- Rendering path: first page renders to RGBA or the viewer shows page 1.

## Runtime Requirements

- Node.js: `>=22`
- Browsers: modern browsers with `WebAssembly`, `Worker`, and `ArrayBuffer`
- Module format: ESM

### WASM/Worker Rules

- **Node core API**: `PDFium.init()` works directly (WASM auto-load).
- **Browser core API**: provide `wasmUrl` or `wasmBinary`.
- **React provider**: provide `workerUrl` and (`wasmUrl` or `wasmBinary`).

## Optional Native Backend (Node.js)

For faster Node workloads, install a platform package and request native mode:

```ts
import { PDFium } from '@scaryterry/pdfium';

const pdfium = await PDFium.init({ useNative: true });
```

Platform packages:

```sh
pnpm add @scaryterry/pdfium-darwin-arm64
pnpm add @scaryterry/pdfium-darwin-x64
pnpm add @scaryterry/pdfium-linux-x64-gnu
pnpm add @scaryterry/pdfium-linux-arm64-gnu
pnpm add @scaryterry/pdfium-win32-x64-msvc
```

## Documentation

- Docs site: <https://jacquesg.github.io/pdfium/>
- Introduction: <https://jacquesg.github.io/pdfium/>
- Installation: <https://jacquesg.github.io/pdfium/installation/>
- React docs: <https://jacquesg.github.io/pdfium/react/>
- API reference: <https://jacquesg.github.io/pdfium/api/>
- Docs voice guide: `docs/DOCS_VOICE_GUIDE.md`

## License

MIT
