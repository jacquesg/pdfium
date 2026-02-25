---
title: Quick Start
description: First working setup for the core API, plus a direct hand-off to the React viewer path.
---

Use this page when you want a first successful run before diving into the full guides.

## What You Will Build

- A Node.js script that opens a PDF and renders page 1.
- A clear understanding of what changes in browser and React environments.

## 1. Install

```sh
pnpm add @scaryterry/pdfium
```

If you are building a React viewer, also install React peers:

```sh
pnpm add react react-dom lucide-react
```

## 2. Run a Core API Script (Node.js)

Create `quick-start.ts`:

```ts
import { readFile } from 'node:fs/promises';
import { PDFium } from '@scaryterry/pdfium';

async function main() {
  const pdfBytes = await readFile('document.pdf');

  using pdfium = await PDFium.init();
  using document = await pdfium.openDocument(pdfBytes);
  using page = document.getPage(0);

  console.log('Page count:', document.pageCount);
  console.log('First page text length:', page.getText().length);

  const { width, height, data } = page.render({ scale: 2 });
  console.log('Rendered image:', width, 'x', height, 'RGBA bytes:', data.length);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
```

Run it:

```sh
npx tsx quick-start.ts
```

## 3. Understand the Runtime Differences

- **Node core API**: no extra WASM path setup needed.
- **Browser core API**: pass `wasmUrl` or `wasmBinary` into `PDFium.init(...)`.
- **React viewer**: pass `workerUrl` and (`wasmUrl` or `wasmBinary`) into `PDFiumProvider`.

## 4. Browser Core API Example

```ts
import { PDFium } from '@scaryterry/pdfium';

const wasmBinary = await fetch('/pdfium.wasm').then((r) => r.arrayBuffer());
using pdfium = await PDFium.init({ wasmBinary });
using doc = await pdfium.openDocument(pdfArrayBuffer);
console.log(doc.pageCount);
```

## 5. React Viewer Next

React setup always requires worker + WASM wiring. Start with:

- [React overview](/pdfium/react/)
- [Installation](/pdfium/installation/) for exact worker/asset wiring

## Verify

Your quick start is healthy if:

- `Page count:` prints a number.
- `Rendered image:` prints width/height and RGBA byte length.
- No `INIT_WASM_*` or worker timeout errors appear.

## Resource Management Reminder

Most objects implement `Symbol.dispose`. Prefer `using`:

```ts
using page = document.getPage(0);
```

If you do not use `using`, call `dispose()` manually.

## Next Steps

- [Installation](/pdfium/installation/)
- [Open Document Guide](/pdfium/guides/open-document/)
- [Render PDF Guide](/pdfium/guides/render-pdf/)
- [React Overview](/pdfium/react/)
