---
title: Introduction
description: What @scaryterry/pdfium is, who it is for, and how to choose between the core API and React viewer toolkit.
---

`@scaryterry/pdfium` is a TypeScript PDF platform built on Google PDFium.

It serves two primary use cases:

1. **Core document API** (`@scaryterry/pdfium`) for read/write/render/search workflows.
2. **React viewer toolkit** (`@scaryterry/pdfium/react`) for shipping a full viewer UI quickly.

## What You Get

- Typed PDF primitives and high-level document/page APIs.
- Cross-runtime support for Node.js and browsers.
- Worker-capable runtime model for off-main-thread processing.
- Optional native Node backend for higher throughput.
- React components/hooks for viewer composition (`PDFiumProvider`, `PDFViewer`, panels, toolbar).

## Who Should Start Here

- You want to pick the correct API surface before writing code.
- You need to understand WASM and worker setup rules up front.
- You are deciding between direct core API usage and viewer composition.

## Runtime Model (Important)

- **Node.js core API**: `PDFium.init()` works directly.
- **Browser core API**: pass `wasmUrl` or `wasmBinary`.
- **React viewer**: pass `workerUrl` and (`wasmUrl` or `wasmBinary`) to `PDFiumProvider`.

If you skip those browser/React inputs, initialization cannot complete.

## Choose Your Path

### Path A: Core API

Use this path when you want programmatic PDF workflows:

- render pages to RGBA
- extract/search text
- inspect annotations/bookmarks/attachments
- create and modify PDFs

Start here:

- [Quick Start](/pdfium/quick-start/)
- [Installation](/pdfium/installation/)
- [Guides](/pdfium/guides/open-document/)

### Path B: React Viewer Toolkit

Use this path when you want a production viewer UI:

- plug-and-play `PDFViewer`
- customizable toolbar and side panels
- headless hooks for custom layouts

Start here:

- [React Overview](/pdfium/react/)
- [PDFViewer](/pdfium/react/pdf-viewer/)
- [React Examples](/pdfium/react/examples/)

## Minimal Examples

### Core API

```ts
import { PDFium } from '@scaryterry/pdfium';

using pdfium = await PDFium.init();
using document = await pdfium.openDocument(pdfBytes);
using page = document.getPage(0);

const text = page.getText();
const image = page.render({ scale: 2 });
console.log(text.length, image.width, image.height);
```

### React Viewer

```tsx
import wasmUrl from '@scaryterry/pdfium/pdfium.wasm?url';
import { PDFiumProvider, PDFViewer } from '@scaryterry/pdfium/react';

const workerUrl = new URL('./pdfium.worker.ts', import.meta.url).toString();

function App() {
  return (
    <PDFiumProvider wasmUrl={wasmUrl} workerUrl={workerUrl} initialDocument={{ data: pdfBytes, name: 'sample.pdf' }}>
      <PDFViewer />
    </PDFiumProvider>
  );
}
```

## Next Steps

- [Installation](/pdfium/installation/) for bundler/asset setup.
- [Quick Start](/pdfium/quick-start/) for end-to-end core API setup.
- [React](/pdfium/react/) for worker + WASM setup and viewer architecture.
- [API Reference](/pdfium/api/) for full type and method reference.
